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
