# UEPLV practice listening recordings

Each part has an original script in the corresponding file under `../content/exams/`. These are shortened classroom tasks based on Personal Best themes. Each recording in the part is heard twice, following the listening convention in A2 Key and B1 Preliminary. The learner can replay the whole track when practicing independently.

The tracks use three synthetic American English voices. Jenny reads the directions, Ava reads the first dialogue role, and Andrew reads the second. Recordings include question preview time, a replay cue, and time between items. No music plays underneath the speech.

## Rebuild and check

From the repository root, run these commands with the listed Python packages available.

```powershell
python -m pip install edge-tts imageio-ffmpeg
python English/audio/render-listening.py
python English/audio/check-listening.py
```

The first script records and assembles each track into a mono MP3. It accepts individual exam IDs for a targeted rebuild and `--clip-cache PATH` to keep reusable speech segments outside the repository. The manifest records the exact script and the timestamp of each spoken line in both hearings. The checker verifies the paths, hashes, question counts, timings, and their fit to the saved exam data.

An optional audit with `--asr-model PATH` checks the actual MP3s using a local faster-whisper model. The audit reports transcription differences for review. Names, connected speech, and formatted numbers can produce spelling differences in automatic transcripts.

[Cambridge A2 Key listening preparation](https://www.cambridgeenglish.org/exams-and-tests/key/preparation/index.aspx?level=basic&rows=24)

[Cambridge B1 Preliminary listening preparation](https://www.cambridgeenglish.org/exams-and-tests/preliminary/preparation/index.aspx?level=independent&rows=24)
