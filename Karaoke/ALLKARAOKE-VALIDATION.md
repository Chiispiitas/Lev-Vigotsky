# Contest and expanded catalog validation

2026-10-13

- All ten selected source charts returned HTTP 200. The initial ten candidates also passed YouTube oEmbed metadata lookups.
- The catalog loads ten added songs, exactly five Spanish and five English, alongside the existing local song.
- Automated checks validate chart timing, line lyrics, scoring references, unique sampling times, decimal BPM, GAP units, octave placement, rap exclusion, partial catalog failure, video pause/buffering clocks, blocked playback, completion events, volume, and seek detection. Existing microphone, pitch, timeline, scoring and local transport tests remain included.
- Manual browser test on `http://localhost:4173`: Color esperanza played with advancing line lyrics and simulated pitch scoring. Pause held at 1:24, then resume continued past 2:14. Practice results are not stored.
- On the numeric IP origin `http://127.0.0.1:4173`, Count On Me and Firework were unavailable (YouTube error 150). This confirms that oEmbed metadata alone does not prove playback on every origin. The app reports an error and does not start a scored round.

Still required before a school event: test all ten videos on the deployed HTTPS domain, rehearse chart alignment, test the actual microphone and projector, and confirm chart/music permissions. These are original-vocal YouTube tracks. No audio recordings are included in the new catalog.

- Manual English test on localhost: Count On Me played with advancing lyrics and simulated scoring (observed at 0:39). All 40 automated tests passed.

- A dedicated browser playback check succeeded for Color esperanza, Vivir mi vida, Me enamora, No se habla de Bruno, Count On Me, Firework, Shake It Off, Believer, and Happy on localhost.
- Qué hay más allá failed with YouTube error 150 and was replaced by A Dios le pido. The replacement chart passes validation; its browser playback check could not finish because YouTube temporarily blocked the test network for automated queries. Recheck this video on the deployed HTTPS origin.

## Expanded catalog and contest highlighting

- The catalog now contains 35 unique online songs, including 25 additions (13 Spanish and 12 English); combined totals are 18 Spanish and 17 English.
- All 25 new chart URLs returned HTTP 200. All 35 charts pass conversion/scoring validation in the existing 40-test suite.
- The original local contest song remains first/default; the library total is 36. Home, library, ready and performance views identify it with the CONTEST label.
- Browser playback evidence above applies to the original ten selections. The additional videos require final playback/alignment rehearsal on the deployed origin; metadata results alone do not establish playback availability.

- All 25 added video IDs passed YouTube oEmbed metadata lookups. This confirms metadata availability only.
- Browser UI inspection confirmed 36 library cards, one designated contest card, the gold home-page contest feature, and search results for the new entries.
- Dancing Queen played successfully in practice mode with advancing lyrics and simulated pitch scoring (observed at 0:33).

- Sofia also played successfully with advancing lyrics and simulated pitch scoring (observed at 0:45). Other new videos still need playback/alignment checks on the deployed HTTPS origin.

## Fifty popular English additions

- Added exactly 50 distinct English single-track charts to the previous 35 online songs; there are now 85 online entries (18 Spanish and 67 English) and 86 songs including the local contest song.
- The source catalog was refreshed from AllKaraoke on 2026-10-13. All 50 added chart URLs returned HTTP 200, and all 85 charts pass conversion/scoring validation in the 40-test suite.
- Selection spans recognizable classics and pop hits by Adele, Ed Sheeran, Michael Jackson, Whitney Houston, Journey, Bon Jovi, Oasis, The Beatles, Elton John, Backstreet Boys, Lady Gaga, Dua Lipa, Miley Cyrus, Maroon 5, Harry Styles, One Direction, Avicii, Sia, Beyoncé, a-ha, Toto, Cyndi Lauper, Linkin Park, The Weeknd, and Lewis Capaldi.
- Popularity context consulted: [Official Charts' biggest songs of the streaming era](https://www.officialcharts.com/chart-news/biggest-songs-streaming-era/) and [all-time best-selling UK singles](https://www.officialcharts.com/chart-news/the-best-selling-singles-of-all-time-on-the-official-uk-chart__21298/).
- Existing CONTEST highlighting and local audio remain unchanged. Metadata checks and browser samples do not establish full playback/alignment verification of every new video on the live HTTPS domain.

- All 50 newly selected video IDs returned valid YouTube oEmbed metadata. Browser inspection confirmed 86 song cards and the online breakdown of 18 Spanish / 67 English; search found Blinding Lights.

- Blinding Lights played successfully in browser practice mode with advancing lyrics and simulated scoring (observed at 0:34). Other newly added videos still require playback/alignment rehearsal on the deployed HTTPS origin.
