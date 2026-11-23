"""Build the original two-play UEPLV recordings from the question data.

Requires Python packages edge-tts and imageio-ffmpeg. The optional audio audit
uses faster-whisper with an existing local base.en or compatible model.
"""

import argparse
import asyncio
import hashlib
import itertools
import json
from pathlib import Path
import re
import subprocess
import tempfile

import edge_tts
import imageio_ffmpeg


AUDIO_DIR = Path(__file__).resolve().parent
DATA_DIR = AUDIO_DIR.parent / "content" / "exams"
SAMPLE_RATE = 24000
SAMPLE_BYTES = 2
CAST = {"Narrator": "en-US-JennyNeural", "A": "en-US-AvaNeural", "B": "en-US-AndrewNeural"}
ROLE_ALIASES = {"Maya": "A", "Ben": "B"}
RATES = {"a1": "-15%", "a2": "-10%", "b1": "-5%"}
NARRATION_RATE = "-10%"
PREVIEW = "Take a moment to look at the questions."
REPEAT = "Now listen again."
ENDING = "That is the end of this part."
QUESTION_CUE = re.compile(r"^(?:question|number)\s+(?:\d+|[a-z]+)\.", re.IGNORECASE)
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def silence(seconds):
    return bytes(round(seconds * SAMPLE_RATE) * SAMPLE_BYTES)


def normalize_speech(text):
    text = re.sub(r"\b(a|p)\.\s*m\.?(?!\w)", r"\1 m", text, flags=re.IGNORECASE)
    return text.replace("’", "'").strip()


def groups_for(part):
    script = part.get("script")
    if not script:
        script = []
        for line in part["transcript"].splitlines():
            if not line.strip():
                continue
            role, separator, text = line.partition(":")
            if not separator:
                role, text = "Narrator", line
            script.append({"speaker": role.strip(), "text": text.strip()})

    groups = []
    cue, turns = None, []
    for row in script:
        role = ROLE_ALIASES.get(row["speaker"], row["speaker"])
        if role not in CAST:
            raise ValueError(f"Unknown voice role {role!r}")
        text = row["text"].strip()
        if not text:
            raise ValueError("Empty listening utterance")
        numbered_cue = QUESTION_CUE.match(text)
        part_cue = not groups and not turns and not cue and text.startswith(("Listen to ", "You will hear "))
        if role == "Narrator" and (numbered_cue or part_cue):
            if turns:
                groups.append((cue, turns))
            cue, turns = (role, text), []
        else:
            turns.append((role, text))
    if turns:
        groups.append((cue, turns))
    if not groups:
        raise ValueError("Listening part has no spoken content")
    return groups


def find_tracks(selected):
    tracks = []
    for source in sorted(DATA_DIR.glob("*.json")):
        if selected and source.stem not in selected:
            continue
        data = json.loads(source.read_text(encoding="utf-8-sig"))
        if data["id"] != source.stem:
            raise ValueError(f"Mismatched practice ID in {source.name}")
        rate = RATES[source.stem.split("-")[0]]
        for part in data["parts"]:
            if part["skill"] != "listening":
                continue
            name = f'{source.stem}-{part["id"]}.mp3'
            if part["audio"] != f"audio/{name}":
                raise ValueError(f"Unexpected audio path for {name}")
            groups = groups_for(part)
            count = len(part["questions"])
            if count < 1:
                raise ValueError(f"Empty question set for {name}")
            tracks.append((name, rate, groups, count))
    if not tracks:
        raise ValueError("No listening parts found")
    return tracks


def timings(groups, count, rate):
    def narration(text):
        return CAST["Narrator"], NARRATION_RATE, normalize_speech(text)

    def read(turns):
        for index, (role, text) in enumerate(turns):
            if index:
                yield 0.23
            yield CAST[role], NARRATION_RATE if role == "Narrator" else rate, normalize_speech(text)

    yield 0.3
    yield narration(PREVIEW)
    yield min(18, max(7, count * 2.5))
    for cue, turns in groups:
        if cue:
            yield from read([cue])
            yield 2.0
        yield from read(turns)
        yield 2.0
        yield narration(REPEAT)
        yield 0.75
        yield from read(turns)
        yield 4.0
    yield narration(ENDING)
    yield 0.5


async def synthesize(utterance, semaphore, cache):
    voice, rate, text = utterance
    digest = hashlib.sha256(json.dumps(utterance).encode()).hexdigest()
    path = cache / f"{digest}.mp3"
    if not path.is_file() or path.stat().st_size < 1000:
        async with semaphore:
            for attempt in range(3):
                try:
                    tmp = path.with_suffix(".mp3.temp")
                    await edge_tts.Communicate(text, voice, rate=rate).save(str(tmp))
                    if tmp.stat().st_size < 1000:
                        raise ValueError("Empty audio response")
                    tmp.replace(path)
                    break
                except Exception as exc:
                    if attempt == 2:
                        raise RuntimeError(f"Could not record {voice} at {rate}: {text!r}") from exc
                    await asyncio.sleep(2 ** attempt)
    return await asyncio.to_thread(decode, path)


def decode(path):
    args = [FFMPEG, "-v", "error", "-i", str(path), "-f", "s16le", "-ac", "1", "-ar", str(SAMPLE_RATE), "-"]
    result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    if not result.stdout:
        raise ValueError(f"No audio samples in {path.name}")
    return result.stdout


def assemble(name, timeline, clips, groups, count):
    pcm = bytearray()
    utterances = []
    for entry in timeline:
        if isinstance(entry, tuple):
            start = len(pcm) / (SAMPLE_RATE * SAMPLE_BYTES)
            pcm.extend(clips[entry])
            end = len(pcm) / (SAMPLE_RATE * SAMPLE_BYTES)
            utterances.append({
                "startSeconds": round(start, 3),
                "endSeconds": round(end, 3),
                "voice": entry[0],
                "text": entry[2],
            })
        else:
            pcm.extend(silence(entry))
    path = AUDIO_DIR / name
    temporary = path.with_name(path.stem + ".tmp.mp3")
    args = [
        FFMPEG, "-v", "error", "-y", "-f", "s16le", "-ar", str(SAMPLE_RATE), "-ac", "1", "-i", "-",
        "-af", "loudnorm=I=-19:TP=-2:LRA=7", "-ar", "24000", "-ac", "1", "-codec:a", "libmp3lame",
        "-b:a", "64k", str(temporary),
    ]
    subprocess.run(args, input=pcm, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    rendered = decode(temporary)
    duration = len(rendered) / (SAMPLE_RATE * SAMPLE_BYTES)
    if abs(duration - len(pcm) / (SAMPLE_RATE * SAMPLE_BYTES)) > 0.25:
        raise ValueError(f"Unexpected output duration for {name}")
    temporary.replace(path)
    return {
        "audio": f"audio/{name}",
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "durationSeconds": round(duration, 3),
        "recordingGroups": len(groups),
        "playbacksPerGroup": 2,
        "questionCount": count,
        "script": [{"cue": cue, "turns": turns} for cue, turns in groups],
        "spokenSequence": utterances,
    }


async def render(tracks, cache):
    sources = [
        (name, list(timings(groups, count, rate)), groups, count)
        for name, rate, groups, count in tracks
    ]
    unique = dict.fromkeys(
        entry for entry in itertools.chain.from_iterable(row[1] for row in sources) if isinstance(entry, tuple)
    )
    print(f"Preparing {len(unique)} spoken clips for {len(sources)} practice tracks.", flush=True)
    semaphore = asyncio.Semaphore(4)
    jobs = {entry: asyncio.create_task(synthesize(entry, semaphore, cache)) for entry in unique}
    manifest_path = AUDIO_DIR / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.is_file() else {}
    for name, timeline, groups, count in sources:
        needed = dict.fromkeys(entry for entry in timeline if isinstance(entry, tuple))
        clips = dict(zip(needed, await asyncio.gather(*(jobs[entry] for entry in needed)), strict=True))
        manifest[name] = await asyncio.to_thread(assemble, name, timeline, clips, groups, count)
        manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"{name}: {manifest[name]['durationSeconds']} seconds.", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("exam", nargs="*", help="Optional practice IDs to render.")
    parser.add_argument("--clip-cache", type=Path, help="Retain intermediate clips outside this repo.")
    options = parser.parse_args()
    tracks = find_tracks(options.exam)
    if options.clip_cache:
        options.clip_cache.mkdir(parents=True, exist_ok=True)
        asyncio.run(render(tracks, options.clip_cache))
    else:
        with tempfile.TemporaryDirectory(prefix="ueplv-listening-") as cache:
            asyncio.run(render(tracks, Path(cache)))


if __name__ == "__main__":
    main()
