Offline Board Quiz Arcade v3
============================

How to use:
1. Extract the ZIP.
2. Open index.html in a recent Chrome, Edge, or Chromium-based interactive-board browser.
3. Load a Kahoot-format .xlsx file, or press "Use Included Sample."
4. Choose 2 or 4 teams.
5. Each team has its own emoji picker, name field, and onscreen keyboard.
6. Play the game.

Controls:
- Mouse / touch for normal classroom use.
- In the game screen, press R on the physical keyboard to reset to the question pool.
- In the game screen, press F on the physical keyboard to finish early and go straight to the podium.

Kahoot XLSX format expected:
- Header row with Question, Answer 1, Answer 2, Answer 3, Answer 4, Time limit, Correct answer(s).
- Multiple choice: 2 to 4 answer options.
- Type answer: only 1 answer option.

New behavior in v3:
- When all answers are locked, or when time runs out, a center countdown appears.
- After the countdown, each team panel is tinted green/red with a large checkmark or cross.
- The Reset button is no longer visible on screen; use physical keyboard R.
- Physical keyboard F ends the game early and opens the podium.

Layout:
- Fixed 1920x1080 board view, displayed with a constant scale.
- The layout is intentionally not responsive. Smaller windows crop the board instead of rearranging it.


Audio note:
This version includes generated arcade sounds using the browser Web Audio API. No audio files are required. Sound starts after the first click, tap, or key press due to browser autoplay rules.

Font note:
The game restores the rounded early-2000s style with Fredoka/Baloo web fonts when internet is available, plus cute system fallbacks when offline.
