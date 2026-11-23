# English practice release checks

### Content and keys

- Six independently written Reading and Listening forms. Each A/B pair has the same mix of tasks and marks. The A1, A2 and B1 forms have 20, 26 and 34 questions respectively.
- All 160 question positions across the six forms matched the frozen keys. In the simulated browser runs, one test choice was intentionally wrong to exercise the review state. All other entered keys scored as expected.
- Each level has 12 self-marking practice exercises. All scored as expected in browser tests. Listening scripts, questions and keys were checked against the published 14 two-hearing audio tracks. See [audio QA](audio/qa.json).

### Exam player and results

- Chromium on desktop, tablet, narrow 320 px phone, 390 px phone and phone landscape. Playwright WebKit on desktop and with iPad and iPhone 13 device profiles. Physical iPhone testing was outside this release.
- Reviewed catalog, reading, listening and results screens. Fixed a grid-width issue found on narrow phones and verified that the timer and Next button are visible.
- Tested option taps, gap inputs, flags, notes, menu navigation, timer expiry, autosave/resume, audio start and pause, receipt review, clearing local data and PNG downloads.
- A forced service failure followed by a reload and retry sent the exact same attempt ID and answers. Checked a Wix-format CSV fixture in teacher review with exam, group and student filters and question-level PNG export.
- Browser submission requests were intercepted. Local backend tests used an in-memory record store. Production Wix health returned the six current keys and verified the private CMS. CORS and request validation probes did not write records. The collection was empty when read back after QA.

### Documents and images

- Rendered and visually reviewed all 12 A4 pages across the six downloadable PDFs. Checked legibility, page breaks, margins, photographs, captions and illustration placement.
- Both B1 speaking photos are licensed stock images. Study and exercise art follows the supplied Horizons illustration references. [Image sources and prompts](images/README.md)
