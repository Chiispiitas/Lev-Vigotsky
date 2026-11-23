"""Validate the audio files and their fit to the exam data.

Run with --asr-model PATH to check the rendered recordings with a local
faster-whisper model. Without that option only the structural checks run.
"""

import argparse
from concurrent.futures import ThreadPoolExecutor
from difflib import SequenceMatcher
import hashlib
import json
from pathlib import Path
import re
import runpy
import unicodedata


FOLDER = Path(__file__).resolve().parent
RENDER = runpy.run_path(str(FOLDER / "render-listening.py"))


def tokens(text):
    # Clock punctuation, straight/curly apostrophes and customary ASR numbers
    # are spelling variants. Word order and all other substitutions are kept.
    text = unicodedata.normalize("NFKD", text.lower().replace("’", "'"))
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = re.sub(r"\b([ap])\.\s*m\.?(?!\w)", r"\1m", text)
    text = re.sub(r"\balright\b", "all right", text)
    numbers = dict(zip(
        "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen twenty thirty forty fifty sixty".split(),
        [*range(1, 17), 20, 30, 40, 50, 60],
        strict=True,
    ))

    def time_words(match):
        hours, minutes = match.groups()
        hour = next((k for k, v in numbers.items() if v == int(hours)), hours)
        if minutes == "00":
            return hour + " o'clock"
        value = int(minutes)
        minute = next((k for k, v in numbers.items() if v == value), minutes)
        if value < 10:
            minute = "oh " + minute
        if value > 20 and value % 10:
            minute = next(k for k, v in numbers.items() if v == value // 10 * 10) + " " + next(
                k for k, v in numbers.items() if v == value % 10
            )
        return hour + " " + minute

    text = re.sub(r"\b(\d{1,2}):(\d{2})\b", time_words, text)
    text = re.sub(r"\b(\d{1,2})(15|30|45)\b", r"\1 \2", text)
    text = re.sub(r"\$(\d+)", r"\1 dollars", text)
    words = re.findall(r"[a-z0-9]+(?:'[a-z]+)?", text)
    return [str(numbers.get(word, word)) for word in words]


def audit_pass(model, name, row, *, use_vad):
    segments, _ = model.transcribe(
        str(FOLDER / name),
        beam_size=2 if use_vad else 3,
        language="en",
        condition_on_previous_text=not use_vad,
        vad_filter=use_vad,
    )
    heard = " ".join(segment.text.strip() for segment in segments)
    expected = " ".join(turn["text"] for turn in row["spokenSequence"])
    before, after = tokens(expected), tokens(heard)
    compare = SequenceMatcher(None, before, after, autojunk=False)
    changes = [
        {"script": " ".join(before[a:b]), "heard": " ".join(after[c:d])}
        for tag, a, b, c, d in compare.get_opcodes()
        if tag != "equal"
    ]
    return {
        "similarity": round(compare.ratio(), 4),
        "changes": changes,
        "heard": heard,
        "recognizerUsedVoiceActivityDetection": use_vad,
    }


def audit_speech(model, name, row):
    speech = audit_pass(model, name, row, use_vad=True)
    # The recognizer occasionally loops on or skips the second hearing if VAD
    # stitches the same recording twice. Compare an uninterrupted pass too.
    if speech["similarity"] < 0.94:
        alternate = audit_pass(model, name, row, use_vad=False)
        speech = max((speech, alternate), key=lambda result: result["similarity"])
    return name, speech


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--asr-model", type=Path)
    parser.add_argument("--report", type=Path, default=FOLDER / "qa.json")
    args = parser.parse_args()
    manifest = json.loads((FOLDER / "manifest.json").read_text(encoding="utf-8"))
    tracks = RENDER["find_tracks"](None)
    assert {row[0] for row in tracks} == set(manifest), "Rendered track list differs from exam data."
    for name, rate, groups, count in tracks:
        row = manifest[name]
        path = FOLDER / name
        assert hashlib.sha256(path.read_bytes()).hexdigest() == row["sha256"], name
        expected = [cue for cue in RENDER["timings"](groups, count, rate) if isinstance(cue, tuple)]
        actual = [(turn["voice"], turn["text"]) for turn in row["spokenSequence"]]
        assert [(voice, text) for voice, _, text in expected] == actual, name
        assert row["playbacksPerGroup"] == 2 and row["recordingGroups"] == len(groups), name
        assert row["questionCount"] == count, name
        assert row["durationSeconds"] >= row["spokenSequence"][-1]["endSeconds"], name
    print(f"Matched {len(tracks)} recordings to the exam data, including both hearings.", flush=True)
    if args.asr_model:
        from faster_whisper import WhisperModel

        model = WhisperModel(
            str(args.asr_model.resolve()),
            device="cpu",
            compute_type="int8",
            cpu_threads=3,
            num_workers=3,
            local_files_only=True,
        )
        report = {}
        with ThreadPoolExecutor(max_workers=3) as pool:
            for name, result in pool.map(lambda item: audit_speech(model, *item), manifest.items()):
                report[name] = result
                print(f"{name}: {result['similarity']:.1%} normalized agreement", flush=True)
        args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
