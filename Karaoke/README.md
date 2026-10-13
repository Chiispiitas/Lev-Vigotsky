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

## Contest song and AllKaraoke catalog

**It's Been So Long — The Living Tombstone** is the designated contest song. It remains selected by default, has a gold CONTEST badge and highlighted card, and appears in a dedicated home-page panel with a Prepare contest action. The badge also appears on the ready and performance screens, including the audience display. The original local instrumental, timed lyrics and reference are preserved.

The library contains 86 songs: the local contest song plus 85 online AllKaraoke songs (18 Spanish and 67 English). The latest expansion adds 50 English songs to the previous 35 online selections.

### Spanish (18)

| Song | Artist |
| --- | --- |
| La gota fría | Carlos Vives |
| La bicicleta | Carlos Vives y Shakira |
| Cuidarte el alma | Chayanne |
| Torero | Chayanne |
| Un siglo sin ti | Chayanne |
| Color esperanza | Diego Torres |
| No se habla de Bruno | Disney’s Encanto |
| A Dios le pido | Juanes |
| Me enamora | Juanes |
| 20 De Enero | La Oreja De Van Gogh |
| Cuéntame al oído | La Oreja de Van Gogh |
| Jueves | La Oreja de Van Gogh |
| Rosas | La Oreja de Van Gogh |
| Vivir mi vida | Marc Anthony |
| Gitana | Shakira |
| Suerte | Shakira |
| Tú | Shakira |
| Sofia | Álvaro Soler |

### English (67)

| Song | Artist |
| --- | --- |
| Take on me | a-ha |
| Dancing Queen | ABBA |
| Mamma Mia | ABBA |
| Easy On Me | Adele |
| Hello | Adele |
| Rolling In The Deep | Adele |
| Someone Like You | Adele |
| The Nights | Avicii |
| Wake Me Up | Avicii |
| Everybody (Backstreet's Back) | Backstreet Boys |
| I Want It That Way | Backstreet Boys |
| Halo | Beyoncé |
| It's my life | Bon Jovi |
| Livin' on a Prayer | Bon Jovi |
| You Give Love A Bad Name | Bon Jovi |
| Count On Me | Bruno Mars |
| Just The Way You Are | Bruno Mars |
| Viva la vida | Coldplay |
| Yellow | Coldplay |
| Girls Just Wanna Have Fun | Cyndi Lauper |
| Time After Time | Cyndi Lauper |
| Titanium | David Guetta & Sia |
| Dance The Night | Dua Lipa |
| Don't Start Now | Dua Lipa |
| Levitating | Dua Lipa |
| Perfect | Ed Sheeran |
| Photograph | Ed Sheeran |
| Shape of you | Ed Sheeran |
| Thinking out loud | Ed Sheeran |
| Rocket Man (I Think It’s Going To Be A Long Long Time) | Elton John |
| Your Song | Elton John |
| As It Was | Harry Styles |
| Watermelon sugar | Harry Styles |
| Believer | Imagine Dragons |
| Thunder | Imagine Dragons |
| Don't Stop Believing | Journey |
| Firework | Katy Perry |
| Bad Romance | Lady Gaga |
| Poker Face | Lady Gaga |
| Someone You Loved | Lewis Capaldi |
| Numb | Linkin Park |
| What I've done | Linkin Park |
| Sugar | Maroon 5 |
| Beat It | Michael Jackson |
| Billie Jean | Michael Jackson |
| Smooth Criminal (Single Version) | Michael Jackson |
| Thriller | Michael Jackson |
| Flowers | Miley Cyrus |
| Wonderwall | Oasis |
| Story Of My Life | One Direction |
| What Makes You Beautiful | One Direction |
| Counting Stars | OneRepublic |
| Happy | Pharrell Williams |
| Don't Stop Me Now | Queen |
| We Will Rock You | Queen |
| Never gonna give you up | Rick Astley |
| Cheap Thrills | Sia |
| Love Story | Taylor Swift |
| Shake It Off | Taylor Swift |
| You Belong With Me | Taylor Swift |
| Hey Jude | The Beatles |
| Let It Be | The Beatles |
| Yesterday | The Beatles |
| Blinding Lights | The Weeknd |
| Africa | Toto |
| I Wanna Dance With Somebody | Whitney Houston |
| I Will Always Love You | Whitney Houston |

Use **Canciones → Probar canción** to check playback without a microphone or saved result. Select a participant for a scored turn. The online videos contain the original vocals; they are not isolated instrumental tracks. Internet access and YouTube embedding are required. Use headphones or keep speaker output away from the microphone so the recording's voice is not scored as the participant.

`assets/catalog.json` lists the selections. The charts in `assets/allkaraoke/` were obtained from `https://allkaraoke.party/songs/<id>.txt` on 2026-10-13. Each retains its original attribution headers; catalog cards link to AllKaraoke and credit the chart creator where available. Recordings are played through the official YouTube iframe API and are not downloaded or hosted in this repository. No repository-wide chart license was found; public access should not be interpreted as a grant of redistribution or performance rights. Confirm chart permissions and relevant song/event rights before public release.

`song-catalog.js` converts chart beats and GAP into video seconds, assembles line lyrics, normalizes pitch display octaves, and samples pitched notes on a 20 ms grid. Freestyle/rap syllables appear in lyrics but are excluded from pitch scoring; golden notes currently use the same weight as normal notes. Chart quality and individual video synchronization are unreviewed; adjust per-song lyric/melody delays after rehearsal.

`youtube-transport.js` keeps one visible player outside the app's changing screen markup. Local songs retain their decoded audio transport; YouTube songs follow video time. Pausing/buffering stops scoring and audience interpolation. Unavailable videos display an error instead of starting a round. Embedded-video restrictions can vary by origin or region; a successful metadata lookup is not a playback test. Test on the deployed HTTPS origin before an event.

## Album artwork

All 86 bundled songs have album or single artwork in `assets/covers.json`. Artwork links to the matching Apple Music release, with an official store badge beside each image. The library uses lazy loading; the contest and selected-song panels load their covers eagerly. Unavailable images fall back to the existing music/trophy icon without blocking karaoke. Cover images require internet access.

Artwork metadata comes from the [Apple Search API](https://performance-partners.apple.com/search-api). Its API is only used during catalog preparation, never on each app visit. The official badge comes from Apple Music Marketing Tools. Artwork and branding remain the property of their respective owners.
