"use strict";
/* ---------------------------------------------- 
     Scene Quiz Made by: David Santana 
----------------------------------------------  */

window.WhiteboardGameScenes = window.WhiteboardGameScenes || {};

/* ---------------------------------------------- 
     Locked Answer Phrases 
----------------------------------------------  */
const lockedAnswerPhrases = [
     "Are you a wizard?",
     "Did you study secretly?",
     "Suspiciously smart…",
     "Brain too powerful!",
     "Calculator mode!",
     "Teacher is impressed!",
     "+100 Aura!",
     "Speed genius!?"
];

/* ---------------------------------------------- 
     Add Button Listeners 
----------------------------------------------  */
/* ---------------------------------------------- 
     Bind Quiz Scene 
----------------------------------------------  */
function bindQuizScene() {
     document.getElementById("nextQuestionBtn").addEventListener("click", function() {
          playSound("enter");
          nextQuestion();
     });
}

/* ---------------------------------------------- 
     Start Game 
----------------------------------------------  */
function startGame() {
  state.teams.forEach((team, i) => {
    team.name = (team.name || `Team ${i + 1}`).trim().slice(0, 18);
    team.score = 0;
  });
  state.current = 0;
  stopBgm("title");
  stopBgm("podium");
  showScreen("quiz");
  renderQuestion();
}
/* ---------------------------------------------- 
     Render Question 
----------------------------------------------  */
function renderQuestion() {
  clearInterval(state.timerId);
  state.resolving = false;
  state.resultsShown = false;
  state.activeGameTeamId = null;
  state.lastTimerSecond = null;
  $("#countdownOverlay").classList.add("hidden");
  $("#betweenQuestionPanel").classList.add("hidden");
  $("#correctAnswerReveal").textContent = "";

  const q = state.questions[state.current];
  state.timeLimit = Number(q.timeLimit) || 20;
  state.startedAt = performance.now();

  state.teams.forEach(t => {
    t.answer = null;
    t.answerText = "";
    t.answerTimeMs = 0;
    t.submitted = false;
    t.correct = false;
  });

  $("#roundChip").textContent = `Question ${state.current + 1} / ${state.questions.length}`;
  $("#questionText").textContent = q.question;
  $("#questionTypeBadge").textContent = q.type === "choice" ? "Multiple Choice" : "Type Answer";
  $("#nextQuestionBtn").textContent = state.current === state.questions.length - 1 ? "Show Podium ▶" : "Next ▶";
  renderGameTeams(q);
  updateTimer(state.timeLimit, 1);
  startBgm("round");

  state.timerId = setInterval(() => {
    const elapsed = (performance.now() - state.startedAt) / 1000;
    const remaining = Math.max(0, state.timeLimit - elapsed);
    const wholeSecond = Math.ceil(remaining);
    if (wholeSecond <= 5 && wholeSecond > 0 && state.lastTimerSecond !== wholeSecond) {
      state.lastTimerSecond = wholeSecond;
      playSound("timerLow");
    }
    updateTimer(remaining, remaining / state.timeLimit);
    if (remaining <= 0) startResolveSequence();
  }, 100);
}
/* ---------------------------------------------- 
     Render Game Teams 
----------------------------------------------  */
function renderGameTeams(q) {
  const grid = $("#gameTeamGrid");
  grid.className = `team-grid game-grid ${state.teamCount === 2 ? "two" : "four"}`;
  grid.innerHTML = "";

  state.teams.forEach(team => {
    const card = document.createElement("article");
    card.className = "team-play-card";
    card.dataset.teamCard = team.id;
    const body = q.type === "choice" ? choiceBody(q, team) : typeBody(team);
    card.innerHTML = `
      <div class="play-head">
        <div class="play-emoji">${team.emoji}</div>
        <div class="play-name">${esc(team.name)}</div>
        <div class="play-score" data-score="${team.id}">${team.score}</div>
      </div>
      ${body}
      <div class="answer-status" data-status="${team.id}"></div>
    `;
    grid.appendChild(card);
  });

  if (q.type === "choice") {
    $$(".choice-btn").forEach(btn => btn.addEventListener("click", () => submitChoice(Number(btn.dataset.teamId), Number(btn.dataset.choiceIndex))));
  } else {
    $$(".type-input").forEach(input => input.addEventListener("click", () => activateGameTeam(Number(input.dataset.teamId))));
    $$(".mini-keyboard .key-btn").forEach(btn => btn.addEventListener("click", () => handleGameKey(Number(btn.dataset.teamId), btn.dataset.key)));
  }
}
/* ---------------------------------------------- 
     Choice Body 
----------------------------------------------  */
function choiceBody(q, team) {
  return `<div class="choices">${q.answers.map((answer, i) => `<button class="choice-btn" data-team-id="${team.id}" data-choice-index="${i}">${esc(answer)}</button>`).join("")}</div>`;
}
/* ---------------------------------------------- 
     Type Body 
----------------------------------------------  */
function typeBody(team) {
  return `<div class="type-wrap">
    <input class="type-input" readonly maxlength="40" data-team-id="${team.id}" />
    <div class="mini-keyboard">${keyboardHtml(team.id, "game")}</div>
  </div>`;
}
/* ---------------------------------------------- 
     Submit Choice 
----------------------------------------------  */
function submitChoice(teamId, index) {
  if (state.resolving || state.resultsShown) return;
  const team = getTeam(teamId);
  if (!team || team.submitted) return;
  team.answer = index;
  team.answerText = String(index + 1);
  team.answerTimeMs = performance.now() - state.startedAt;
  team.submitted = true;

  const card = $(`[data-team-card="${teamId}"]`);
  card.querySelectorAll(".choice-btn").forEach(btn => {
    btn.classList.add("locked");
    btn.classList.toggle("selected", Number(btn.dataset.choiceIndex) === index);
  });
  showLockedScreenForTeam(teamId);
  playSound("lock");
  if (state.teams.every(t => t.submitted)) startResolveSequence();
}
/* ---------------------------------------------- 
     Activate Game Team 
----------------------------------------------  */
function activateGameTeam(teamId) {
  state.activeGameTeamId = teamId;
  $$(".type-input").forEach(i => i.classList.toggle("active", Number(i.dataset.teamId) === teamId));
}
/* ---------------------------------------------- 
     Handle Game Key 
----------------------------------------------  */
function handleGameKey(teamId, key) {
  if (state.resolving || state.resultsShown) return;
  const team = getTeam(teamId);
  if (!team || team.submitted) return;
  activateGameTeam(teamId);
  if (key === "BACK") { team.answerText = team.answerText.slice(0, -1); playSound("back"); }
  else if (key === "SPACE") { team.answerText = (team.answerText + " ").slice(0, 40); playSound("click"); }
  else if (key === "ENTER") {
    playSound("enter");
    submitTyped(teamId);
    return;
  } else if (team.answerText.length < 40) { team.answerText += key.toLowerCase(); playSound("click"); }
  const input = $(`.type-input[data-team-id="${teamId}"]`);
  if (input) input.value = team.answerText;
}
/* ---------------------------------------------- 
     Submit Typed 
----------------------------------------------  */
function submitTyped(teamId) {
  if (state.resolving || state.resultsShown) return;
  const team = getTeam(teamId);
  if (!team || team.submitted) return;
  team.answerText = team.answerText.trim();
  team.answer = team.answerText;
  team.answerTimeMs = performance.now() - state.startedAt;
  team.submitted = true;
  showLockedScreenForTeam(teamId);
  playSound("lock");
  if (state.teams.every(t => t.submitted)) startResolveSequence();
}
/* ---------------------------------------------- 
     Show Locked Screen For Team 
----------------------------------------------  */
function showLockedScreenForTeam(teamId) {
  const card = $(`[data-team-card="${teamId}"]`);
  if (!card) return;

  const oldScreen = card.querySelector(".locked-praise-screen");
  if (oldScreen) oldScreen.remove();

  card.classList.add("answer-locked-card");
  const screen = document.createElement("div");
  screen.className = "locked-praise-screen";
  screen.innerHTML = `
    <div class="locked-praise-icon">⚡</div>
    <div class="locked-praise-text">${esc(getLockedAnswerPhrase(teamId))}</div>
  `;
  card.appendChild(screen);
}

/* ---------------------------------------------- 
     Get Locked Answer Phrase 
----------------------------------------------  */
function getLockedAnswerPhrase(teamId) {
  const index = Math.floor(Math.random() * lockedAnswerPhrases.length);
  return lockedAnswerPhrases[index];
}

/* ---------------------------------------------- 
     Set Status For Team 
----------------------------------------------  */
function setStatusForTeam(teamId, text) {
  const status = $(`[data-status="${teamId}"]`);
  if (status) status.textContent = text;
}
/* ---------------------------------------------- 
     Start Resolve Sequence 
----------------------------------------------  */
function startResolveSequence() {
  if (state.resolving || state.resultsShown) return;
  state.resolving = true;
  playSound("allLocked");
  clearInterval(state.timerId);
  lockAllInputs();
  runCountdown(3, showResults);
}
/* ---------------------------------------------- 
     Lock All Inputs 
----------------------------------------------  */
function lockAllInputs() {
  $$(".choice-btn, .type-input, .mini-keyboard .key-btn").forEach(el => {
    el.disabled = true;
    el.classList.add("locked");
  });
  state.teams.forEach(t => {
    if (!t.submitted) setStatusForTeam(t.id, "");
  });
}
/* ---------------------------------------------- 
     Run Countdown 
----------------------------------------------  */
function runCountdown(start, done) {
  const overlay = $("#countdownOverlay");
  const number = $("#countdownNumber");
  overlay.classList.remove("hidden");
  let value = start;
  number.textContent = value;
  playSound("countdown");
  /* ---------------------------------------------- 
       Tick 
  ----------------------------------------------  */
  const tick = () => {
    value--;
    if (value <= 0) {
      number.textContent = "GO!";
      playSound("go");
      setTimeout(() => {
        overlay.classList.add("hidden");
        done();
      }, 430);
    } else {
      number.textContent = value;
      playSound("countdown");
      number.parentElement.style.animation = "none";
      void number.parentElement.offsetWidth;
      number.parentElement.style.animation = "";
      setTimeout(tick, 700);
    }
  };
  setTimeout(tick, 700);
}
/* ---------------------------------------------- 
     Show Results 
----------------------------------------------  */
function showResults() {
  if (state.resultsShown) return;
  state.resultsShown = true;
  stopBgm("round");

  const q = state.questions[state.current];
  const correctLabel = getCorrectLabel(q);
  $("#correctAnswerReveal").textContent = `Correct answer: ${correctLabel}`;

  let correctCount = 0;
  state.teams.forEach(team => {
    team.correct = isCorrect(q, team);
    if (team.correct) {
      correctCount++;
      const speed = team.answerTimeMs ? Math.max(0, 1 - team.answerTimeMs / (state.timeLimit * 1000)) : 0;
      team.score += Math.round(500 + speed * 500);
    }

    const card = $(`[data-team-card="${team.id}"]`);
    if (card) {
      card.classList.remove("answer-locked-card");
      const lockedScreen = card.querySelector(".locked-praise-screen");
      if (lockedScreen) lockedScreen.remove();
      revealTeamAnswerResult(card, q, team);
      card.classList.add(team.correct ? "result-correct" : "result-incorrect");
      const word = document.createElement("div");
      word.className = "result-word";
      word.textContent = team.correct ? "CORRECT!" : "WRONG!";
      card.appendChild(word);
    }
    const score = $(`[data-score="${team.id}"]`);
    if (score) score.textContent = team.score;
  });

  if (correctCount > 0) playSound("correct");
  if (correctCount < state.teams.length) setTimeout(() => playSound("wrong"), correctCount > 0 ? 360 : 0);
  const betweenSummary = $("#betweenSummary");
  if (betweenSummary) betweenSummary.textContent = "";
  $("#betweenQuestionPanel").classList.remove("hidden");
}
/* ---------------------------------------------- 
     Reveal Team Answer Result 
----------------------------------------------  */
function revealTeamAnswerResult(card, q, team) {
  const status = card.querySelector(".answer-status");
  if (status) status.textContent = "";

  if (q.type === "choice") {
    const correctIndexes = getCorrectIndexes(q);
    card.querySelectorAll(".choice-btn").forEach(btn => {
      const choiceIndex = Number(btn.dataset.choiceIndex);
      const isCorrectOption = correctIndexes.includes(choiceIndex);
      const isSelectedOption = team.submitted && team.answer === choiceIndex;

      btn.classList.remove("locked", "selected");
      btn.classList.toggle("result-option-correct", isCorrectOption);
      btn.classList.toggle("result-option-wrong", !isCorrectOption);
      btn.classList.toggle("result-option-selected", isSelectedOption);
    });
  }
  else {
    const input = card.querySelector(".type-input");
    if (input) input.classList.add(team.correct ? "type-result-correct" : "type-result-wrong");
  }
}
/* ---------------------------------------------- 
     Next Question 
----------------------------------------------  */
function nextQuestion() {
  if (state.current < state.questions.length - 1) {
    state.current++;
    renderQuestion();
  } else {
    showPodium();
  }
}
/* ---------------------------------------------- 
     Update Timer 
----------------------------------------------  */
function updateTimer(seconds, ratio) {
  $("#timerValue").textContent = Math.ceil(seconds);
  $("#timerFill").style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
}
/* ---------------------------------------------- 
     Get Correct Indexes 
----------------------------------------------  */
function getCorrectIndexes(q) {
  const raw = String(q.correctRaw || "1").trim();
  const tokens = raw.split(/[,;|/ ]+/).map(t => t.trim()).filter(Boolean);
  const indexes = [];
  tokens.forEach(token => {
    if (/^\d+$/.test(token)) {
      const idx = Number(token) - 1;
      if (idx >= 0 && idx < q.answers.length) indexes.push(idx);
    } else {
      const normalized = normalize(token);
      const idx = q.answers.findIndex(a => normalize(a) === normalized);
      if (idx >= 0) indexes.push(idx);
    }
  });
  return [...new Set(indexes.length ? indexes : [0])];
}
/* ---------------------------------------------- 
     Get Accepted Typed 
----------------------------------------------  */
function getAcceptedTyped(q) {
  const set = new Set(q.answers.map(a => normalize(a)).filter(Boolean));
  const raw = String(q.correctRaw || "").trim();
  if (raw && !/^\d+([,;|/ ]+\d+)*$/.test(raw)) {
    raw.split(/[,;|/]+/).forEach(x => {
      const n = normalize(x);
      if (n) set.add(n);
    });
  } else if (raw) {
    getCorrectIndexes(q).forEach(i => {
      if (q.answers[i]) set.add(normalize(q.answers[i]));
    });
  }
  return set;
}
/* ---------------------------------------------- 
     Get Correct Label 
----------------------------------------------  */
function getCorrectLabel(q) {
  if (q.type === "choice") return getCorrectIndexes(q).map(i => q.answers[i]).join(", ");
  return [...getAcceptedTyped(q)][0] || q.answers[0] || "";
}
/* ---------------------------------------------- 
     Is Correct 
----------------------------------------------  */
function isCorrect(q, team) {
  if (!team.submitted) return false;
  if (q.type === "choice") return getCorrectIndexes(q).includes(team.answer);
  return getAcceptedTyped(q).has(normalize(team.answerText));
}

/* ---------------------------------------------- 
     Create Scene 
----------------------------------------------  */
/* ---------------------------------------------- 
     Quiz 
----------------------------------------------  */
window.WhiteboardGameScenes.quiz = function(api) {
     return {
          id: "quiz",
          screenId: "gameScreen",
          aliases: ["game", "rounds", "quizScreen"],
          /* ---------------------------------------------- 
               Init 
          ----------------------------------------------  */
          init: function() {
               bindQuizScene();
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
               api.audio.stopBgm("round");
          }
     };
};
