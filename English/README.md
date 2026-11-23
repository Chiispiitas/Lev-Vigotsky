# UEPLV English exam practice

Students start at [ueplv.com/English](https://ueplv.com/English/). Each grade has a main mock, Variation B, 12 short exercises with feedback, a vocabulary and grammar guide, and two speaking practice sets. The content draws on the third-quarter Personal Best plans. Questions, texts, and listening scripts are original.

## Scope and timings

| Grade | Target and Personal Best Student’s Book scope | Reading | Listening | Online time | Speaking per pair |
| --- | --- | ---: | ---: | ---: | ---: |
| 10th Grade | A1 · A2 Units 5–6, pp. 40–57, with language adapted to A1 | 12 | 8 | 30 min | 5 min |
| First-Year High School · Science and Technical | A2 · A2 Units 11–12, pp. 94–111 | 16 | 10 | 40 min | 7 min |
| Second-Year High School · Science and Technical | B1 · B1 Units 5–6, pp. 40–57 | 21 | 13 | 50 min | 8 min |

The table applies to both forms. Variation B changes the texts, situations, and questions while keeping the same skills, task types, counts, and timings. Each online item is worth one point, for practice scores out of 20, 26, or 34. Speaking is a separate teacher-led practice with an interview, an individual turn, and a partner discussion. B1 includes a photo description and follow-up questions.

The general English A2 Key combines Reading and Writing in a seven-part, 60-minute paper with 32 numbered questions. Listening has 25 questions in five parts and takes about 30 minutes. Speaking has two parts and takes 8–10 minutes per pair. [Cambridge A2 Key exam format](https://www.cambridgeenglish.org/exams-and-tests/qualifications/key/format/)

The general English B1 Preliminary has a six-part Reading paper with 32 questions in 45 minutes, a separate 45-minute Writing paper, and a four-part Listening paper with 25 questions in about 30 minutes. Speaking has four parts and takes 10–12 minutes per pair. [Cambridge B1 Preliminary exam format](https://www.cambridgeenglish.org/exams-and-tests/qualifications/preliminary/format/)

UEPLV uses selected task types in shorter school practice forms without a writing paper. A1 uses an A2-inspired structure with A1 language. Each listening track includes two hearings. Students can replay the full track during practice. Scores are raw school practice scores.

## Maintaining the material

- GitHub Pages serves the UEPLV-branded catalog, study materials, and shared player. `config.js` holds the grade mapping, API base URL, and current release. `practice.js` coordinates the timer, local resume, navigation, audio, and submission retry. The separate Wix Headless service grades and stores the attempts. Follow the [backend deployment guide](../AssessmentBackend/DEPLOYMENT.md) for publishing and smoke checks.
- Edit original exam content in `content/exams/` and study topics, drills, and speaking cues in `content/study/`. Keep the stable exam, part, and question IDs for existing material. Give each new form its own exam ID and answer key. Review open-gap alternative answers and check each rendered option against the key. Rebuild the print downloads if the study or speaking material changes.
- Keep each listening item, its transcript, the accepted answers, and its MP3 in sync. Rebuild the affected recordings and check the manifest with the scripts in the [audio guide](audio/README.md). Listen to the affected tracks and compare them with their prompts and keys.
- Key release `2026-11-23.1` is recorded in `answer-keys/version.json`. Keep prior snapshots in `answer-keys/versions/` available for saved attempts. For marking changes, set a new version in `validate-answer-keys.mjs` and run it with `--prepare` to generate a new snapshot. Update the manifest and `config.js`, then verify both using the commands below. Publish Wix with the new keys and verify its health endpoint before publishing the frontend release.

From the repository root:

```powershell
node English/validate-answer-keys.mjs
node English/validate-answer-key-releases.mjs
python English/audio/check-listening.py
npm --prefix AssessmentBackend test
```

Run `node English/validate-exam-player.cjs` with Playwright installed. Set `EXAM_PLAYWRIGHT` to an absolute module path when using a separate QA installation. Install Playwright WebKit and use Edge for Chromium, or set `EXAM_CHROMIUM_PATH` to a Chromium executable. Add `--pdf` to rebuild the student downloads, or add `--pdf-only --pdf` to rebuild them with the materials and teacher checks. See the [release checks](QA.md) and [image sources](images/README.md).

## Teacher review

Sign in to the [Wix English Practice Attempts collection](https://manage.wix.com/dashboard/456fe85e-4d7c-4a83-a2e5-e4717f6615af/wix-cms/data/PracticeAttempts). Filter by practice exam, group, or submission date. For question-level review, export the collection as CSV with the `review` field and open it in [Practice Results](https://ueplv.com/English/results.html). The browser reads the file locally. Use the exam, group, and student filters to check scores, compare submitted and accepted answers, and download the summary or question detail as PNG.

## Runachay drafts

### 10.º EGB · Práctica de inglés A1

Para prepararte, repasa el vocabulario y la gramática de *Personal Best A2*, unidades 5 y 6, pp. 40–57. Haz los ejercicios y luego completa el simulacro de lectura y escucha en 30 minutos. Practica speaking en pareja. Responde con frases completas y da una razón cuando te pidan tu opinión.

[Palabras y temas](https://ueplv.com/English/materials.html?level=a1&view=study) · [Ejercicios](https://ueplv.com/English/materials.html?level=a1&view=drills) · [Speaking](https://ueplv.com/English/materials.html?level=a1&view=speaking) · [Simulacro](https://ueplv.com/English/practice.html?exam=a1-practice-a) · [Variation B](https://ueplv.com/English/practice.html?exam=a1-practice-b)

### 1.º Bachillerato · Práctica de inglés A2

Repasa *Personal Best A2*, unidades 11 y 12, pp. 94–111. Comienza con la lista de palabras y los ejercicios. Después, completa el simulacro de lectura y escucha en 40 minutos. Para speaking, ensaya con un compañero cómo explicar una preferencia y hacer una pregunta para continuar la conversación.

[Palabras y temas](https://ueplv.com/English/materials.html?level=a2&view=study) · [Ejercicios](https://ueplv.com/English/materials.html?level=a2&view=drills) · [Speaking](https://ueplv.com/English/materials.html?level=a2&view=speaking) · [Simulacro](https://ueplv.com/English/practice.html?exam=a2-practice-a) · [Variation B](https://ueplv.com/English/practice.html?exam=a2-practice-b)

### 2.º Bachillerato · Práctica de inglés B1

Repasa *Personal Best B1*, unidades 5 y 6, pp. 40–57. Haz los ejercicios antes de completar el simulacro de lectura y escucha en 50 minutos. Para speaking, practica describir una foto durante un minuto y conversar en pareja para comparar opciones y llegar a un acuerdo.

[Palabras y temas](https://ueplv.com/English/materials.html?level=b1&view=study) · [Ejercicios](https://ueplv.com/English/materials.html?level=b1&view=drills) · [Speaking](https://ueplv.com/English/materials.html?level=b1&view=speaking) · [Simulacro](https://ueplv.com/English/practice.html?exam=b1-practice-a) · [Variation B](https://ueplv.com/English/practice.html?exam=b1-practice-b)
