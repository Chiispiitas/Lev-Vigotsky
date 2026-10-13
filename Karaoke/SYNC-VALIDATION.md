# Catalog and synchronization validation

Checked on 2026-10-13.

- 100 unique English songs added, resulting in 189 total songs: 188 online charts (19 Spanish, 169 English) and the local contest track.
- Source charts obtained from the public `Asvarox/allkaraoke` repository; original chart headers and creator attribution preserved.
- Every new video returned YouTube oEmbed metadata. This does not establish playback availability in every browser, region, or network.
- All 189 cover image URLs returned an image response. One transient connection reset was retried successfully.
- All 188 online charts parsed into ordered pitch frames and valid lyric intervals, including 78,381 timed syllables.
- 68 tests passed, covering syllable/rest timing, held syllables, early lyric preview, repeated choruses, local LRC fallback, video zero-time handling, playback rates, buffering, stale captured packets, calibration restrictions, and existing scoring/microphone behavior.

## Recording alignment

Chart beat timestamps plus GAP are kept on the absolute video timeline. VIDEOGAP is an upstream intro-skip hint, so it is not subtracted from lyric/note timestamps. Some linked music videos have long cinematic openings. These source charts enter late by design:

- `adele-easy-on-me` — first pitched note at 112.470 seconds.
- `backstreet-boys-everybody-backstreets-back` — first pitched note at 97.195 seconds.
- `taylor-swift-i-knew-you-were-trouble` — first pitched note at 126.540 seconds.
- `lady-gaga-born-this-way` — first pitched note at 180.793 seconds.
- `lady-gaga-paparazzi` — first pitched note at 159.780 seconds.

No full-audio comparison or event-room microphone rehearsal was performed. Timing corrections target verified application defects and preserve the published chart timing. The saved phrase-alignment tool supports recording-specific offsets; chart drift or a different recording version still requires chart review. The local contest LRC remains line-timed. Perfect sync across all recordings and devices is not established.

## Shared clock and single-stroke guide correction

- Main lyrics now activate at the timestamp, without the former two-second promotion of upcoming lyrics. The secondary line remains the upcoming phrase.
- YouTube now uses the same output-compensated AudioTimeline for display and microphone capture instead of bypassing output compensation. Browser output timestamps/latency provide an estimate, not an acoustic measurement of the embedded player or external speaker chain.
- A saved common delay shifts lyrics, melody, scoring and intro targets together. Per-song corrections remain separate; shared delay is never stored a second time in those corrections. In paused practice, a heard phrase can calibrate this song or the common delay for all songs.
- The melody guide is one opaque 16 px yellow stroke, with rounded joins, no translucent tolerance bands, and connections across pitch jumps and short articulation gaps. Longer rests break the stroke.
- New scoring profiles retain common and estimated output delay for review; previous scores are preserved.
- 76 automated tests passed, including no early lyric activation, one-stroke guide rendering, shared-delay calibration, offset persistence without double application, and a common audible clock for YouTube display and microphone capture. Live audio alignment on the event device and visual browser inspection remain unverified; no arbitrary universal delay was assigned to the catalog.
