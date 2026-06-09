Whiteboard Game Collection
==========================

Offline HTML5 classroom quiz game for an interactive board.

How to use:
1. Extract the ZIP file.
2. Open index.html in a modern Chromium-based browser such as Chrome or Edge.
3. Load an XLSX question pool, use the included sample, or create a new pool.
4. Edit the pool in the modal if needed.
5. Export the pool as a Kahoot-format XLSX if you want to reuse it later.
6. Continue to team setup and play.

Question pool editor:
- Exported pools can be loaded back into the app.
- Type-answer question: fill only Answer 1.
- Multiple-choice question: fill 2 to 4 answers.
- Correct answer(s): use 1, 2, 3, 4 for multiple-choice. For type-answer, Answer 1 is accepted.
- Time limit is in seconds.

Keyboard shortcuts during the game:
- R = reset to the question pool screen.
- F = finish early and show the podium.

Audio:
- assets/title.mp3 loops on the title/menu screens.
- assets/round.mp3 loops during active questions and stops when results appear.
- assets/podium.mp3 plays once on the podium screen.

Layout:
The app uses a fixed board view and does not responsively reflow. Small windows crop the board.

Code structure:
- index.html uses the same large comment sections used in the reference project.
- css/fonts.css keeps the font declarations separate.
- css/style.css contains the visual styles with section headers.
- js/scenes/scene-manager.js manages scene registration, screen switching, and scene lifecycle hooks.
- js/scenes/scene-title.js handles the title scene.
- js/scenes/scene-pool-select.js handles the question pool/setup scene.
- js/scenes/scene-team-select.js handles the team selection scene.
- js/scenes/scene-quiz.js handles the quiz/round scene.
- js/scenes/scene-results.js handles the final results/podium scene.
- js/app.js remains only for shared state, audio, scene setup, global keyboard shortcuts, and common helpers. XLSX loading/export and pool editor logic now live in js/scenes/scene-pool-select.js.

The code style now follows the David Santana scene-header pattern so it is easier to expand with new modes later.


Version v22 changes:
- Global click sparkles now work across title, pool, mode selection, team selection, quiz, and results screens.
- Locked answers now cover the full team panel with a blue moving-stripe screen and rotating fun phrases.

Version 25 notes:
- Added Tug-of-War mode as a Student-led mode.
- Tug-of-War is limited to two teams.
- Added embedded penguin sprites in assets/img.
- Correct answers pull the rope; pull strength increases over time.
