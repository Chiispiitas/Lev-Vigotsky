# Prototype validation

Validated on 11 October 2026.

- Ten automated tests passed: known microphone-processing tones at 110 / 440 / 880 Hz, silence rejection, octave equivalence, pitch tolerance, reference timing tolerance, duration-normalized score bounds, and LRC parsing.
- Browser flow passed: real instrumental preview, queue entry and selection, ready screen, projector state synchronization, stable paused clock, exclusion of an interrupted preview from rankings, empty leaderboard, search, saved settings, and mobile layout without horizontal overflow.
- Controlled browser audio input passed through getUserMedia and AudioWorklet and displayed 440 Hz. A live-mode round started, the natural audio-ended event generated a leaderboard result, and the result survived reload. That test used synthetic microphone input and advanced playback to the end; it did not represent a full student performance.
- Fonts and assets are local; the app has no required third-party network request after local startup.

Still requires physical equipment validation: USB microphone selection and disconnection, input/output delay, noisy-room performance, loudspeaker spill, student vocal ranges, and projection from the farthest seat.

The extracted reference is not manually reviewed. Within-line lyric highlighting is approximate because the supplied LRC provides line timing. Imported audio is session-only. An event backup export exists; a backup-restore interface is not yet implemented.

## Audio update 2 validation

- 24 automated tests pass, including 44.1/48 kHz input, capture timestamp spacing, quiet harmonic tones, silence, stable octave placement, smoothing release, delayed Worker delivery, audience interpolation, and sample-clock pause / restart / end behavior.
- Controlled browser capture measured 100 pitch reports per second with a 9.99 ms average sample interval and 10.67 ms maximum interval; all reports detected the continuous test tone. This is synthetic-input evidence, not a guarantee for a particular USB microphone.
- Browser checks passed for corrected lyric onset, playback, pause/resume, projector synchronization, per-song timing nudges, early-end exclusion, and microphone disconnect/reconnect.
- The reference has approximately 68 seconds of observed scorable pitch and 76 seconds in the visual contour. Short visual bridges are excluded from scoring.
- First vocal onset measured near 10.25 s, versus the supplied LRC cue at 9.59 s; default lyric correction is +0.65 s. Later lines remain line-timed estimates and can be adjusted per song.
