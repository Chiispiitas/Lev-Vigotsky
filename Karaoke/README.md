# LEV VOICE · U.E.P. Lev Vigotsky

A school karaoke competition app with blue/yellow/white branding, the supplied school logo, three owl poses, real instrumental playback, timed lyrics, live microphone pitch, a connected melody guide, results, a singer queue, and an audience window.

## Open locally

Double-click `Start-LEV-VOICE.cmd`, or run these commands from this folder:

```powershell
npm start
```

Open `http://localhost:4173`. Node.js is required for the local launcher; no npm dependencies or installation step are needed. Do not open index.html directly as a file: microphone access and song loading need localhost or HTTPS.

## GitHub and GitHub Pages

This folder is self-contained. `index.html` is at the Karaoke root, and all app assets use relative paths. Commit the files in this folder to the existing Lev-Vigotsky repository. The app does not require a build step, a Sites account, deployment credentials, or a backend.

If GitHub Pages publishes the repository root, open the `Karaoke/` path beneath that site's address. The repository's other school apps can remain alongside this folder. Microphone access requires HTTPS; GitHub Pages provides HTTPS. Browser permission is still needed when connecting the microphone.

To review and commit just this app from the repository root:

```powershell
git status --short
git add Karaoke
git commit -m "Add Lev Vigotsky karaoke competition app"
```

Push through your normal GitHub workflow when ready. The original instrumental, vocal stem, and LRC files are preserved in this folder. Runtime assets are in `assets/`. All included audio and images are below GitHub's individual file size limit.

## Run an event

1. In Audio settings, connect the USB microphone and check a steady sung vowel.
2. Use Voice sensitivity if notes disappear. Measure room noise while staying quiet.
3. Add singers and classes, choose the song, and select a singer.
4. Open Audience display, move it to an extended projector screen, and press F for fullscreen.
5. Start singing. Space pauses/resumes; Esc opens the operator controls.
6. Use Next singer after a round. Export CSV results and JSON backup before closing.

Only the operator window plays audio and captures the microphone. Audience windows synchronize in the same browser profile and origin on the same computer. Raw microphone audio is neither recorded nor uploaded by this app. Completed results, queue entries, and settings stay in local browser storage.

## Timing and audio

The instrumental is decoded before the round and scheduled on the same audio sample clock as capture. The microphone supplies approximately 100 timestamped updates per second; a background Worker detects pitch, while display smoothing handles brief gaps. The target melody uses a connected contour and stable octave placement.

The supplied first lyric cue precedes the measured vocal onset by about 660 ms; its default correction is +650 ms. Audio settings has separate Lyrics delay and Melody delay sliders. Positive values show content later. The pause overlay has Earlier/Later adjustments in 100 ms steps, saved per song. Extra microphone delay compensation is separate.

## Files

- `index.html`, `app.js`, `style.css`, `fonts.css`: interface and local fonts.
- `audio-transport.js`, `timeline.js`: playback and audible timing.
- `pitch-worklet.js`, `pitch-worker.js`, `pitch-detector.js`: capture, analysis, and smoothing.
- `scoring.js`: forgiving pitch scoring and LRC parsing.
- `assets/`: instrumental, prepared song JSON, lyrics, school branding, owl sprites, and font licenses.
- `tools/`: offline song preparation and automated tests.
- `server.mjs`, `Start-LEV-VOICE.cmd`: local launch support.

## Tests and song preparation

```powershell
npm test
```

40 automated tests cover pitch detection, timestamps, smoothing, scoring, lyric parsing, chart conversion, playback lifecycle, and video playback controls.

The preparation tool requires Python with librosa, numpy, scipy, and soundfile. It reads the original files in this folder:

```powershell
python tools/prepare_song.py --source . --output assets
```

Preparing another song should use a separate source/output folder to preserve the current package. Imports through the app support instrumental + LRC and an optional prepared reference JSON.

## Present limits

The extracted melody remains unreviewed. Lyric cues are line-timed; within-line highlighting is approximate. Imported songs last until the tab closes. A backup export exists, but an in-app restore interface is not implemented. Use one song/profile per scored final; formal event isolation and difficulty brackets remain future work. Test the actual USB mic, speakers, and projector before an event.

## Ten-song AllKaraoke catalog

The existing instrumental song remains available, with ten additional online songs:

| Spanish | English |
| --- | --- |
| Color esperanza — Diego Torres | Count On Me — Bruno Mars |
| Vivir mi vida — Marc Anthony | Firework — Katy Perry |
| Me enamora — Juanes | Shake It Off — Taylor Swift |
| No se habla de Bruno — Disney’s Encanto | Believer — Imagine Dragons |
| A Dios le pido — Juanes | Happy — Pharrell Williams |

Use **Canciones → Probar canción** to check playback without a microphone or saved result. Select a participant for a scored turn. These videos contain the original vocals; they are not isolated instrumental tracks. Internet access and YouTube embedding are required. Use headphones or keep speaker output away from the microphone so the recording's voice is not scored as the participant.

`assets/catalog.json` lists the selections. The charts in `assets/allkaraoke/` were obtained from `https://allkaraoke.party/songs/<id>.txt` on 2026-10-13. Each retains its original attribution headers; catalog cards link to AllKaraoke and credit the chart creator where available. Recordings are played through the official YouTube iframe API and are not downloaded or hosted in this repository. No repository-wide chart license was found; public access should not be interpreted as a grant of redistribution or performance rights. Confirm chart permissions and relevant song/event rights before public release.

`song-catalog.js` converts chart beats and GAP into video seconds, assembles line lyrics, normalizes pitch display octaves, and samples pitched notes on a 20 ms grid. Freestyle/rap syllables appear in lyrics but are excluded from pitch scoring; golden notes currently use the same weight as normal notes. Chart quality and individual video synchronization are unreviewed; adjust per-song lyric/melody delays after rehearsal.

`youtube-transport.js` keeps one visible player outside the app's changing screen markup. Local songs retain their decoded audio transport; YouTube songs follow video time. Pausing/buffering stops scoring and audience interpolation. Unavailable videos display an error instead of starting a round. Embedded-video restrictions can vary by origin or region; a successful metadata lookup is not a playback test. Test on the deployed HTTPS origin before an event.
