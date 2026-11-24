# UEPLV English Practice backend

The student site publishes from the UEPLV GitHub Pages repository. Wix hosts the Astro assessment API and a private CMS collection on the dedicated **UEPLV English Practice** site.

| Function | Location |
| --- | --- |
| Student site | https://ueplv.com/English/ |
| API | https://headless-pmarqltgvmv-chiispiitas-140b.wix-site-host.com/api/assessment |
| Private teacher dashboard | https://manage.wix.com/dashboard/456fe85e-4d7c-4a83-a2e5-e4717f6615af/wix-cms/data/PracticeAttempts |

## Submit an attempt

`POST /api/assessment/submit` accepts JSON from the school or repository origin. Send the same attempt ID and answers on any retry.

```json
{
  "attemptId": "33fd9c79-6256-4984-8ced-cb1bd99bc285",
  "examId": "a1-practice-a",
  "keyVersion": "2026-11-23.1",
  "studentName": "Sample Student",
  "group": "",
  "answers": {},
  "durationSeconds": 122
}
```

The only optional field is `group`. Supported values are empty, `science`, and `technical`. Answers use stable question IDs. Omitted answers are unanswered. The service grades against the pinned release and stores a single immutable record. It returns the attempt ID, exam ID, key version, score, maximum score, section scores, question review, and timestamp. Results display each submitted answer and its accepted answers. Speaking uses the separate teacher materials.

The CMS collection permits administrator reads and writes. The public route validates a practice submission before elevating only a fixed collection operation. A retry can recover a saved receipt only after its request fingerprint matches. The service exposes no public results listing or direct record lookup.

## Teacher review

Sign in to the Wix dashboard and open **English Practice Attempts**. Filter by **Practice exam**, **Group**, or **Submitted**. The `title` field contains the student name. Scores and maximum scores have their own columns. `Question review` (`review`) contains the submitted answers, accepted answers, section totals, and one-point question decisions as JSON. `Submission fingerprint` is used for retries.

## Build and release

```powershell
npm ci --ignore-scripts
Copy-Item env.example .env.local
npm test
npm run build
python scripts/package.py <output-folder>
```

The build loads versioned answer keys from `../English/answer-keys/versions/`. Source archives bundle these under `canonical/answer-keys/versions/` for reproducible builds. Keep existing key releases available so that an open attempt can still send its original version.

To provision a separate environment, install Wix CMS, create the private collection from `practice-attempts.collection.json`, and point `wix.config.json` and `env.example` at the new site and app. The schema file contains the body for the Wix Create Data Collection API.

Release the build ZIP on the site in `wix.config.json` with the Wix server upload tools. Use the current Code Store head revision for a source update. Use the source ZIP as the separate source artifact. Do not package local environment files. Wix provides its private SDK runtime credentials.

Verify `/api/assessment/health` before connecting the frontend. It must return HTTP 200 and list every intended exam under its release. Verify CORS preflight and invalid payload rejection. Run grading, retry and CMS failure checks with the injected in-memory store or intercepted browser requests.

## Homework names and results

The homework submission route validates the roster on the server and records the official name in PracticeAttempts. Supply src/homework-rosters.private.json from Runachay before building. It maps first-science, second-technical, and third-technical to arrays of records with givenNames and surnames arrays. Both Second Technical subjects currently share the same roster. Keep this file private and excluded from Git. The private Wix source archive retains the roster for subsequent builds. Homework results come from the persisted submission receipt.
