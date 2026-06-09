"use strict";
/* ---------------------------------------------- 
     Scene Tug Of War Made by: David Santana 
----------------------------------------------  */

window.WhiteboardGameScenes = window.WhiteboardGameScenes || {};

/* ---------------------------------------------- 
     Tug Constants 
----------------------------------------------  */
const tugQuestionIndexes = [0, 0];
var tugTimerId = null;
var tugActiveTeamId = null;
const TUG_POSE_MAP = {
     "left": {
          "regular": {
               "src": "assets/img/penguin-blue-regular.png",
               "x": 0.0,
               "y": 0,
               "scale": 1
          },
          "stressed": {
               "src": "assets/img/penguin-blue-stressed.png",
               "x": -55.7,
               "y": 0,
               "scale": 1.18
          },
          "win": {
               "src": "assets/img/penguin-blue-win.png",
               "x": -1.7,
               "y": 0,
               "scale": 1.0
          },
          "lose": {
               "src": "assets/img/penguin-blue-lose.png",
               "x": -136.4,
               "y": 0,
               "scale": 1.18
          }
     },
     "right": {
          "regular": {
               "src": "assets/img/penguin-pink-regular.png",
               "x": 0.0,
               "y": 0,
               "scale": 1
          },
          "stressed": {
               "src": "assets/img/penguin-pink-stressed.png",
               "x": 74.6,
               "y": 0,
               "scale": 1.18
          },
          "win": {
               "src": "assets/img/penguin-pink-win.png",
               "x": -6.6,
               "y": 0,
               "scale": 1.0
          },
          "lose": {
               "src": "assets/img/penguin-pink-lose.png",
               "x": 86.3,
               "y": 0,
               "scale": 1.18
          }
     }
};


/* ---------------------------------------------- 
     Bind Tug Of War Scene 
----------------------------------------------  */
function bindTugOfWarScene() {
     const backButton = document.getElementById("backToTeamsFromTugBtn");
     const resetButton = document.getElementById("resetTugBtn");

     if (backButton) {
          backButton.addEventListener("click", function() {
               playSound("back");
               stopBgm("round");
               clearInterval(tugTimerId);
               showScreen("teamSelect");
          });
     }

     if (resetButton) {
          resetButton.addEventListener("click", function() {
               playSound("reset");
               startTugOfWar();
          });
     }
}

/* ---------------------------------------------- 
     Start Tug Of War 
----------------------------------------------  */
function startTugOfWar() {
     state.selectedMode = "tugOfWar";
     state.teamCount = 2;
     state.teams = state.teams.slice(0, 2);

     state.teams.forEach(function(team, index) {
          team.id = index;
          team.name = (team.name || `Team ${index + 1}`).trim().slice(0, 18);
          team.score = 0;
          team.answer = null;
          team.answerText = "";
          team.answerTimeMs = 0;
          team.submitted = false;
          team.correct = false;
     });

     state.tug = {
          position: 0,
          startedAt: performance.now(),
          finished: false,
          winnerId: null,
          panels: [createTugPanelState(0), createTugPanelState(1)]
     };

     tugQuestionIndexes[0] = 0;
     tugQuestionIndexes[1] = 1 % Math.max(1, state.questions.length);
     tugActiveTeamId = null;

     stopBgm("title");
     stopBgm("podium");
     startBgm("round");
     showScreen("tugOfWar");
     renderTugOfWarScene();
     startTugClock();
}

/* ---------------------------------------------- 
     Create Tug Panel State 
----------------------------------------------  */
function createTugPanelState(teamId) {
     return {
          teamId: teamId,
          questionIndex: teamId % Math.max(1, state.questions.length),
          startedAt: performance.now(),
          submitted: false,
          revealed: false,
          answer: null,
          answerText: "",
          correct: false,
          skipped: false,
          cooldownUntil: 0,
          timeLimit: null
     };
}

/* ---------------------------------------------- 
     Render Tug Of War Scene 
----------------------------------------------  */
function renderTugOfWarScene() {
     updateTugArena();
     renderTugQuestionGrid();
}

/* ---------------------------------------------- 
     Render Tug Question Grid 
----------------------------------------------  */
function renderTugQuestionGrid() {
     const grid = document.getElementById("tugQuestionGrid");
     if (!grid) { return; }

     grid.innerHTML = "";
     state.tug.panels.forEach(function(panel) {
          grid.appendChild(createTugQuestionCard(panel));
     });
}

/* ---------------------------------------------- 
     Create Tug Question Card 
----------------------------------------------  */
function createTugQuestionCard(panel) {
     const team = getTeam(panel.teamId);
     const q = getTugQuestion(panel.teamId);
     const card = document.createElement("article");
     card.className = `tug-question-card team-${panel.teamId}`;
     card.dataset.tugTeamCard = panel.teamId;

     card.innerHTML = `
          <div class="tug-card-head">
               <div class="play-emoji">${team.emoji}</div>
               <div class="play-name">${esc(team.name)}</div>
               <div class="tug-card-timer infinity" data-tug-timer="${panel.teamId}">∞</div>
          </div>
          <div class="tug-card-question">
               <div class="type-badge">${q.type == "choice" ? "Multiple Choice" : "Type Answer"}</div>
               <h2>${esc(q.question)}</h2>
          </div>
          ${q.type == "choice" ? tugChoiceBody(q, panel.teamId) : tugTypeBody(panel.teamId)}
          <div class="tug-feedback" data-tug-feedback="${panel.teamId}"></div>
          <div class="tug-card-actions">
               <button class="arcade-btn secondary tug-skip-btn" data-tug-skip="${panel.teamId}">Skip ⏭</button>
               <button class="arcade-btn start tug-next-btn hidden" data-tug-next="${panel.teamId}">Next ▶</button>
          </div>
     `;

     bindTugCardButtons(card, panel.teamId, q);
     return card;
}

/* ---------------------------------------------- 
     Tug Choice Body 
----------------------------------------------  */
function tugChoiceBody(q, teamId) {
     return `<div class="choices tug-choices">${q.answers.map(function(answer, index) {
          return `<button class="choice-btn tug-choice-btn" data-tug-team-id="${teamId}" data-choice-index="${index}">${esc(answer)}</button>`;
     }).join("")}</div>`;
}

/* ---------------------------------------------- 
     Tug Type Body 
----------------------------------------------  */
function tugTypeBody(teamId) {
     return `<div class="type-wrap tug-type-wrap">
          <input class="type-input tug-type-input" readonly maxlength="40" data-tug-input="${teamId}" />
          <div class="mini-keyboard tug-mini-keyboard">${keyboardHtml(teamId, "game")}</div>
     </div>`;
}

/* ---------------------------------------------- 
     Bind Tug Card Buttons 
----------------------------------------------  */
function bindTugCardButtons(card, teamId, q) {
     if (q.type == "choice") {
          card.querySelectorAll(".tug-choice-btn").forEach(function(button) {
               button.addEventListener("click", function() {
                    submitTugChoice(teamId, Number(button.dataset.choiceIndex));
               });
          });
     }
     else {
          const input = card.querySelector(".tug-type-input");
          if (input) {
               input.addEventListener("click", function() { activateTugTeam(teamId); });
          }
          card.querySelectorAll(".tug-mini-keyboard .key-btn").forEach(function(button) {
               button.addEventListener("click", function() {
                    handleTugKey(teamId, button.dataset.key);
               });
          });
     }

     const skipButton = card.querySelector(".tug-skip-btn");
     if (skipButton) {
          skipButton.addEventListener("click", function() {
               playSound("back");
               skipTugQuestion(teamId);
          });
     }

     const nextButton = card.querySelector(".tug-next-btn");
     if (nextButton) {
          nextButton.addEventListener("click", function() {
               playSound("enter");
               nextTugQuestion(teamId);
          });
     }
}

/* ---------------------------------------------- 
     Activate Tug Team 
----------------------------------------------  */
function activateTugTeam(teamId) {
     tugActiveTeamId = teamId;
     document.querySelectorAll(".tug-type-input").forEach(function(input) {
          input.classList.toggle("active", Number(input.dataset.tugInput) == teamId);
     });
}

/* ---------------------------------------------- 
     Handle Tug Keyboard Key 
----------------------------------------------  */
function handleTugKeyboardKey(event) {
     if (tugActiveTeamId === null || tugActiveTeamId === undefined) { return; }
     const panel = getTugPanel(tugActiveTeamId);
     const q = getTugQuestion(tugActiveTeamId);
     if (!panel || !q || q.type != "type" || panel.submitted || panel.revealed) { return; }

     const key = event.key;
     if (key === "Backspace") { event.preventDefault(); handleTugKey(tugActiveTeamId, "BACK"); }
     else if (key === "Enter") { event.preventDefault(); handleTugKey(tugActiveTeamId, "ENTER"); }
     else if (key === " ") { event.preventDefault(); handleTugKey(tugActiveTeamId, "SPACE"); }
     else if (TYPABLE.test(key)) { event.preventDefault(); handleTugKey(tugActiveTeamId, key.toUpperCase()); }
}

/* ---------------------------------------------- 
     Handle Tug Key 
----------------------------------------------  */
function handleTugKey(teamId, key) {
     const panel = getTugPanel(teamId);
     if (!panel || panel.submitted || panel.revealed || state.tug.finished) { return; }

     activateTugTeam(teamId);
     if (key == "BACK") { panel.answerText = panel.answerText.slice(0, -1); playSound("back"); }
     else if (key == "SPACE") { panel.answerText = (panel.answerText + " ").slice(0, 40); playSound("click"); }
     else if (key == "ENTER") { playSound("enter"); submitTugTyped(teamId); return; }
     else if (panel.answerText.length < 40) { panel.answerText += key.toLowerCase(); playSound("click"); }

     const input = document.querySelector(`.tug-type-input[data-tug-input="${teamId}"]`);
     if (input) { input.value = panel.answerText; }
}

/* ---------------------------------------------- 
     Submit Tug Choice 
----------------------------------------------  */
function submitTugChoice(teamId, index) {
     const panel = getTugPanel(teamId);
     if (!panel || panel.submitted || panel.revealed || state.tug.finished) { return; }

     panel.answer = index;
     panel.answerText = String(index + 1);
     panel.answerTimeMs = performance.now() - panel.startedAt;
     panel.submitted = true;

     const card = document.querySelector(`[data-tug-team-card="${teamId}"]`);
     if (card) {
          card.querySelectorAll(".choice-btn").forEach(function(button) {
               button.classList.add("locked");
               button.classList.toggle("selected", Number(button.dataset.choiceIndex) == index);
          });
          showTugLockedScreen(card, teamId);
     }

     playSound("lock");
     setTimeout(function() { revealTugAnswer(teamId); }, 650);
}

/* ---------------------------------------------- 
     Submit Tug Typed 
----------------------------------------------  */
function submitTugTyped(teamId) {
     const panel = getTugPanel(teamId);
     if (!panel || panel.submitted || panel.revealed || state.tug.finished) { return; }

     panel.answerText = panel.answerText.trim();
     panel.answer = panel.answerText;
     panel.answerTimeMs = performance.now() - panel.startedAt;
     panel.submitted = true;

     const card = document.querySelector(`[data-tug-team-card="${teamId}"]`);
     if (card) { showTugLockedScreen(card, teamId); }

     playSound("lock");
     setTimeout(function() { revealTugAnswer(teamId); }, 650);
}

/* ---------------------------------------------- 
     Show Tug Locked Screen 
----------------------------------------------  */
function showTugLockedScreen(card, teamId) {
     const oldScreen = card.querySelector(".locked-praise-screen");
     if (oldScreen) { oldScreen.remove(); }

     const screen = document.createElement("div");
     screen.className = "locked-praise-screen tug-locked-screen";
     screen.innerHTML = `
          <div class="locked-praise-icon">⚡</div>
          <div class="locked-praise-text">${esc(getLockedAnswerPhrase(teamId))}</div>
     `;
     card.appendChild(screen);
}


/* ---------------------------------------------- 
     Skip Tug Question 
----------------------------------------------  */
function skipTugQuestion(teamId) {
     const panel = getTugPanel(teamId);
     const q = getTugQuestion(teamId);
     const card = document.querySelector(`[data-tug-team-card="${teamId}"]`);
     if (!panel || !q || !card || panel.submitted || panel.revealed || state.tug.finished) { return; }

     panel.submitted = true;
     panel.revealed = true;
     panel.skipped = true;
     panel.correct = false;
     panel.answer = null;
     panel.answerText = "";
     panel.cooldownUntil = performance.now() + 3000;

     revealTugSkippedAnswer(card, q, panel, teamId);
     startTugNextCooldown(teamId, 3);
}

/* ---------------------------------------------- 
     Reveal Tug Skipped Answer 
----------------------------------------------  */
function revealTugSkippedAnswer(card, q, panel, teamId) {
     const lockScreen = card.querySelector(".locked-praise-screen");
     if (lockScreen) { lockScreen.remove(); }

     revealTugOptions(card, q, panel);
     card.classList.add("result-incorrect");

     const mark = document.createElement("div");
     mark.className = "result-mark tug-result-mark";
     mark.textContent = "✕";
     card.appendChild(mark);

     const feedback = card.querySelector(`[data-tug-feedback="${teamId}"]`);
     if (feedback) {
          feedback.textContent = `Answer: ${getCorrectLabel(q)}`;
     }

     const skipButton = card.querySelector(".tug-skip-btn");
     if (skipButton) {
          skipButton.disabled = true;
          skipButton.classList.add("hidden");
     }

     playSound("wrong");
}

/* ---------------------------------------------- 
     Start Tug Next Cooldown 
----------------------------------------------  */
function startTugNextCooldown(teamId, seconds) {
     const nextButton = document.querySelector(`[data-tug-next="${teamId}"]`);
     if (!nextButton || state.tug.finished) { return; }

     let remaining = seconds;
     nextButton.classList.remove("hidden");
     nextButton.disabled = true;
     nextButton.textContent = `Cooldown ${remaining}`;

     const interval = setInterval(function() {
          remaining -= 1;
          if (!nextButton.isConnected || state.tug.finished) {
               clearInterval(interval);
               return;
          }

          if (remaining <= 0) {
               clearInterval(interval);
               nextButton.disabled = false;
               nextButton.textContent = "Next ▶";
          }
          else {
               nextButton.textContent = `Cooldown ${remaining}`;
          }
     }, 1000);
}

/* ---------------------------------------------- 
     Reveal Tug Answer 
----------------------------------------------  */
function revealTugAnswer(teamId) {
     const panel = getTugPanel(teamId);
     const q = getTugQuestion(teamId);
     const team = getTeam(teamId);
     const card = document.querySelector(`[data-tug-team-card="${teamId}"]`);
     if (!panel || !q || !team || !card || panel.revealed || state.tug.finished) { return; }

     panel.revealed = true;
     panel.correct = isTugCorrect(q, panel);

     const lockScreen = card.querySelector(".locked-praise-screen");
     if (lockScreen) { lockScreen.remove(); }

     revealTugOptions(card, q, panel);
     card.classList.add(panel.correct ? "result-correct" : "result-incorrect");

     const mark = document.createElement("div");
     mark.className = "result-mark tug-result-mark";
     mark.textContent = panel.correct ? "✓" : "✕";
     card.appendChild(mark);

     const feedback = card.querySelector(`[data-tug-feedback="${teamId}"]`);
     if (feedback) {
          feedback.textContent = panel.correct ? "" : `Answer: ${getCorrectLabel(q)}`;
     }

     if (panel.correct) {
          team.score += 1;
          pullTug(teamId);
          playSound("correct");
     }
     else {
          playSound("wrong");
     }

     const skipButton = card.querySelector(".tug-skip-btn");
     if (skipButton) {
          skipButton.disabled = true;
          skipButton.classList.add("hidden");
     }

     const nextButton = card.querySelector(".tug-next-btn");
     if (nextButton && !state.tug.finished) { nextButton.classList.remove("hidden"); }
}

/* ---------------------------------------------- 
     Reveal Tug Options 
----------------------------------------------  */
function revealTugOptions(card, q, panel) {
     if (q.type == "choice") {
          const correctIndexes = getCorrectIndexes(q);
          card.querySelectorAll(".choice-btn").forEach(function(button) {
               const choiceIndex = Number(button.dataset.choiceIndex);
               const correctOption = correctIndexes.includes(choiceIndex);
               const selectedOption = panel.answer === choiceIndex;
               button.classList.remove("locked", "selected");
               button.classList.toggle("result-option-correct", correctOption);
               button.classList.toggle("result-option-wrong", !correctOption);
               button.classList.toggle("result-option-selected", selectedOption);
          });
     }
     else {
          const input = card.querySelector(".type-input");
          if (input) { input.classList.add(panel.correct ? "type-result-correct" : "type-result-wrong"); }
     }
}

/* ---------------------------------------------- 
     Pull Tug 
----------------------------------------------  */
function pullTug(teamId) {
     const amount = getTugPullAmount();
     if (teamId == 0) { state.tug.position -= amount; }
     else { state.tug.position += amount; }

     if (state.tug.position <= -100) { finishTugOfWar(0); return; }
     if (state.tug.position >= 100) { finishTugOfWar(1); return; }
     updateTugArena();
}

/* ---------------------------------------------- 
     Get Tug Pull Amount 
----------------------------------------------  */
function getTugPullAmount() {
     const elapsed = (performance.now() - state.tug.startedAt) / 1000;
     return Math.min(34, 12 + Math.floor(elapsed / 10) * 4);
}

/* ---------------------------------------------- 
     Update Tug Arena 
----------------------------------------------  */
function updateTugArena() {
     if (!state.tug) { return; }

     const leftTeam = getTeam(0);
     const rightTeam = getTeam(1);
     const position = Math.max(-100, Math.min(100, state.tug.position));
     const ropeLine = document.getElementById("tugRopeLine");
     const leftName = document.getElementById("tugLeftName");
     const rightName = document.getElementById("tugRightName");
     const leftPenguin = document.getElementById("tugPenguinLeft");
     const rightPenguin = document.getElementById("tugPenguinRight");
     const finished = !!state.tug.finished;
     const winnerId = state.tug.winnerId;

     if (ropeLine) { ropeLine.style.setProperty("--rope-x", `${position * 2.15}px`); }
     if (leftName && leftTeam) { leftName.textContent = leftTeam.name; }
     if (rightName && rightTeam) { rightName.textContent = rightTeam.name; }

     updateTugPenguinState(leftPenguin, "left", position, finished, winnerId);
     updateTugPenguinState(rightPenguin, "right", position, finished, winnerId);
}

/* ---------------------------------------------- 
     Update Tug Penguin State 
----------------------------------------------  */
function updateTugPenguinState(penguin, side, position, finished, winnerId) {
     if (!penguin) { return; }

     const isLeft = side == "left";
     const losingNow = isLeft ? position > 56 : position < -56;
     const shift = position * 2.15;
     const dragBias = isLeft ? Math.max(0, position) * 1.15 : Math.min(0, position) * 1.15;
     const finalShift = finished
          ? (winnerId == 0 ? (isLeft ? -90 : -240) : (isLeft ? 240 : 90))
          : (shift * 0.72) + dragBias;
     const tilt = finished
          ? (winnerId == 0 ? (isLeft ? -6 : 30) : (isLeft ? -30 : 6))
          : (isLeft ? position * 0.06 : position * 0.06);

     let pose = "regular";

     if (finished) {
          pose = winnerId == (isLeft ? 0 : 1) ? "win" : "lose";
          penguin.classList.remove("stressed", "won", "lost");
          penguin.classList.add(pose == "win" ? "won" : "lost");
     }
     else if (losingNow) {
          pose = "stressed";
          penguin.classList.remove("won", "lost");
          penguin.classList.add("stressed");
     }
     else {
          penguin.classList.remove("stressed", "won", "lost");
     }

     applyTugPenguinPose(penguin, side, pose, finalShift, tilt);
}

/* ---------------------------------------------- 
     Apply Tug Penguin Pose 
----------------------------------------------  */
function applyTugPenguinPose(penguin, side, pose, finalShift, tilt) {
     const sideMap = TUG_POSE_MAP[side];
     if (!sideMap) { return; }

     const poseData = sideMap[pose] || sideMap.regular;

     if (penguin.dataset.poseSrc != poseData.src) {
          penguin.src = poseData.src;
          penguin.dataset.poseSrc = poseData.src;
     }

     penguin.style.setProperty("--drag-x", `${finalShift}px`);
     penguin.style.setProperty("--drag-tilt", `${tilt}deg`);
     penguin.style.setProperty("--pose-x", `${poseData.x || 0}px`);
     penguin.style.setProperty("--pose-y", `${poseData.y || 0}px`);
     penguin.style.setProperty("--pose-scale", `${poseData.scale || 1}`);
}

/* ---------------------------------------------- 
     Start Tug Clock 
----------------------------------------------  */
function startTugClock() {
     clearInterval(tugTimerId);
     tugTimerId = setInterval(function() {
          if (!state.tug || state.tug.finished) { return; }
          updateTugArena();
     }, 120);
}

/* ---------------------------------------------- 
     Update Tug Timers 
----------------------------------------------  */
function updateTugTimers() {
     return;
}

/* ---------------------------------------------- 
     Submit Tug Timeout 
----------------------------------------------  */
function submitTugTimeout(teamId) {
     return teamId;
}

/* ---------------------------------------------- 
     Next Tug Question 
----------------------------------------------  */
function nextTugQuestion(teamId) {
     if (state.tug.finished) { return; }
     tugQuestionIndexes[teamId] += 2;
     if (tugQuestionIndexes[teamId] >= state.questions.length) {
          tugQuestionIndexes[teamId] = teamId % Math.max(1, state.questions.length);
     }

     state.tug.panels[teamId] = createTugPanelState(teamId);
     state.tug.panels[teamId].questionIndex = tugQuestionIndexes[teamId];
     replaceTugQuestionCard(teamId);
}

/* ---------------------------------------------- 
     Replace Tug Question Card 
----------------------------------------------  */
function replaceTugQuestionCard(teamId) {
     const grid = document.getElementById("tugQuestionGrid");
     const oldCard = document.querySelector(`[data-tug-team-card="${teamId}"]`);
     const panel = getTugPanel(teamId);
     if (!grid || !panel) { return; }

     const newCard = createTugQuestionCard(panel);
     if (oldCard) { oldCard.replaceWith(newCard); }
     else { grid.appendChild(newCard); }
}

/* ---------------------------------------------- 
     Finish Tug Of War 
----------------------------------------------  */
function finishTugOfWar(winnerId) {
     if (!state.tug || state.tug.finished) { return; }
     state.tug.finished = true;
     state.tug.winnerId = winnerId;
     clearInterval(tugTimerId);
     stopBgm("round");

     state.teams.forEach(function(team) {
          if (team.id == winnerId) { team.score += 100; }
     });

     updateTugArena();

     const grid = document.getElementById("tugQuestionGrid");
     if (grid) {
          grid.innerHTML = `<div class="tug-winner-card">
               <div class="tug-winner-icon">🏆</div>
               <h2>${esc(getTeam(winnerId).name)} wins!</h2>
               <button id="showTugPodiumBtn" class="arcade-btn start">Show Podium ▶</button>
          </div>`;
          document.getElementById("showTugPodiumBtn").addEventListener("click", function() {
               playSound("podium");
               showPodium();
          });
     }
}

/* ---------------------------------------------- 
     Get Tug Panel 
----------------------------------------------  */
function getTugPanel(teamId) {
     if (!state.tug || !state.tug.panels) { return null; }
     return state.tug.panels[teamId];
}

/* ---------------------------------------------- 
     Get Tug Question 
----------------------------------------------  */
function getTugQuestion(teamId) {
     if (!state.questions.length) { return SAMPLE_QUESTIONS[0]; }
     const index = tugQuestionIndexes[teamId] % state.questions.length;
     return state.questions[index];
}

/* ---------------------------------------------- 
     Is Tug Correct 
----------------------------------------------  */
function isTugCorrect(q, panel) {
     if (q.type == "choice") { return getCorrectIndexes(q).includes(panel.answer); }
     return isTypedAnswerCorrect(q, panel.answerText);
}

/* ---------------------------------------------- 
     Create Scene 
----------------------------------------------  */
/* ---------------------------------------------- 
     Tug Of War 
----------------------------------------------  */
window.WhiteboardGameScenes.tugOfWar = function(api) {
     return {
          id: "tugOfWar",
          screenId: "tugScreen",
          aliases: ["tug", "tugScreen", "tugOfWarScreen"],
          /* ---------------------------------------------- 
               Init 
          ----------------------------------------------  */
          init: function() {
               bindTugOfWarScene();
          },
          /* ---------------------------------------------- 
               On Enter 
          ----------------------------------------------  */
          onEnter: function() {
               api.audio.stopBgm("title");
               api.audio.stopBgm("podium");
          },
          /* ---------------------------------------------- 
               On Exit 
          ----------------------------------------------  */
          onExit: function() {
               clearInterval(tugTimerId);
          }
     };
};
