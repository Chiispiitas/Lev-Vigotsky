(() => {
  "use strict";

  const SAMPLE_QUESTIONS = [
  {
    "question": "¿Cómo se dice 'frío' en inglés?",
    "answers": [
      "big",
      "quiet",
      "cold",
      "bad"
    ],
    "timeLimit": 20,
    "correctRaw": "3",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'caliente' en inglés?",
    "answers": [
      "hot",
      "horrible",
      "beautiful",
      "sad"
    ],
    "timeLimit": 20,
    "correctRaw": "1",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'limpio' en inglés?",
    "answers": [
      "young",
      "clean",
      "cold",
      "expensive"
    ],
    "timeLimit": 20,
    "correctRaw": "2",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'sucio' en inglés?",
    "answers": [
      "boring",
      "fast",
      "expensive",
      "dirty"
    ],
    "timeLimit": 20,
    "correctRaw": "4",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'rápido' en inglés?",
    "answers": [
      "easy",
      "beautiful",
      "fast",
      "new"
    ],
    "timeLimit": 20,
    "correctRaw": "3",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'lento' en inglés?",
    "answers": [
      "slow",
      "horrible",
      "new",
      "cheap"
    ],
    "timeLimit": 20,
    "correctRaw": "1",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'amable' en inglés?",
    "answers": [
      "long",
      "dirty",
      "small",
      "friendly"
    ],
    "timeLimit": 20,
    "correctRaw": "4",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'antipático' en inglés?",
    "answers": [
      "unfriendly",
      "noisy",
      "slow",
      "quiet"
    ],
    "timeLimit": 20,
    "correctRaw": "1",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'agradable' en inglés?",
    "answers": [
      "cold",
      "new",
      "difficult",
      "nice"
    ],
    "timeLimit": 20,
    "correctRaw": "4",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'horrible' en inglés?",
    "answers": [
      "horrible",
      "boring",
      "nice",
      "bad"
    ],
    "timeLimit": 20,
    "correctRaw": "1",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'grande' en inglés?",
    "answers": [
      "old",
      "slow",
      "large",
      "bad"
    ],
    "timeLimit": 20,
    "correctRaw": "3",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'pequeño' en inglés?",
    "answers": [
      "small",
      "difficult",
      "dirty",
      "sad"
    ],
    "timeLimit": 20,
    "correctRaw": "1",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'largo' en inglés?",
    "answers": [
      "cheap",
      "long",
      "horrible",
      "happy"
    ],
    "timeLimit": 20,
    "correctRaw": "2",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'corto' en inglés?",
    "answers": [
      "cheap",
      "short",
      "bad",
      "big"
    ],
    "timeLimit": 20,
    "correctRaw": "2",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'ruidoso' en inglés?",
    "answers": [
      "noisy",
      "friendly",
      "fast",
      "small"
    ],
    "timeLimit": 20,
    "correctRaw": "1",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'silencioso' en inglés?",
    "answers": [
      "new",
      "quiet",
      "slow",
      "beautiful"
    ],
    "timeLimit": 20,
    "correctRaw": "2",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'bueno' en inglés?",
    "answers": [
      "good",
      "young",
      "new",
      "difficult"
    ],
    "timeLimit": 20,
    "correctRaw": "1",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'malo' en inglés?",
    "answers": [
      "good",
      "bad",
      "difficult",
      "cold"
    ],
    "timeLimit": 20,
    "correctRaw": "2",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'hermoso' en inglés?",
    "answers": [
      "big",
      "large",
      "beautiful",
      "quiet"
    ],
    "timeLimit": 20,
    "correctRaw": "3",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'feo' en inglés?",
    "answers": [
      "cold",
      "ugly",
      "dirty",
      "difficult"
    ],
    "timeLimit": 20,
    "correctRaw": "2",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'grande' en inglés?",
    "answers": [
      "long",
      "difficult",
      "big",
      "sad"
    ],
    "timeLimit": 20,
    "correctRaw": "3",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'pequeño' en inglés?",
    "answers": [
      "old",
      "horrible",
      "unfriendly",
      "small"
    ],
    "timeLimit": 20,
    "correctRaw": "4",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'barato' en inglés?",
    "answers": [
      "hot",
      "cheap",
      "unfriendly",
      "easy"
    ],
    "timeLimit": 20,
    "correctRaw": "2",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'caro' en inglés?",
    "answers": [
      "expensive",
      "beautiful",
      "young",
      "clean"
    ],
    "timeLimit": 20,
    "correctRaw": "1",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'interesante' en inglés?",
    "answers": [
      "clean",
      "interesting",
      "boring",
      "quiet"
    ],
    "timeLimit": 20,
    "correctRaw": "2",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'aburrido' en inglés?",
    "answers": [
      "happy",
      "clean",
      "new",
      "boring"
    ],
    "timeLimit": 20,
    "correctRaw": "4",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'nuevo' en inglés?",
    "answers": [
      "bad",
      "boring",
      "new",
      "fast"
    ],
    "timeLimit": 20,
    "correctRaw": "3",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'viejo' en inglés?",
    "answers": [
      "fast",
      "cheap",
      "quiet",
      "old"
    ],
    "timeLimit": 20,
    "correctRaw": "4",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'feliz' en inglés?",
    "answers": [
      "young",
      "bad",
      "happy",
      "slow"
    ],
    "timeLimit": 20,
    "correctRaw": "3",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'triste' en inglés?",
    "answers": [
      "sad",
      "nice",
      "good",
      "happy"
    ],
    "timeLimit": 20,
    "correctRaw": "1",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'fácil' en inglés?",
    "answers": [
      "ugly",
      "short",
      "young",
      "easy"
    ],
    "timeLimit": 20,
    "correctRaw": "4",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'difícil' en inglés?",
    "answers": [
      "friendly",
      "difficult",
      "easy",
      "bad"
    ],
    "timeLimit": 20,
    "correctRaw": "2",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'viejo' en inglés?",
    "answers": [
      "boring",
      "interesting",
      "expensive",
      "old"
    ],
    "timeLimit": 20,
    "correctRaw": "4",
    "type": "choice"
  },
  {
    "question": "¿Cómo se dice 'joven' en inglés?",
    "answers": [
      "friendly",
      "expensive",
      "young",
      "horrible"
    ],
    "timeLimit": 20,
    "correctRaw": "3",
    "type": "choice"
  }
];
  const EMOJIS = ["🦉","🦊","🐯","🐸","🐼","🐵","🐺","🐧","🦁","🐨","🐰","🐲","⭐","⚡","🍀","🔥"];
  const CONFETTI_COLORS = ["#ff7777","#4ca7ff","#ffcf5b","#6edd8b","#ffc3dc"];
  const TYPABLE = /^[a-zA-ZñÑáéíóúÁÉÍÓÚüÜ ]$/;

  const state = {
    questions: [],
    teamCount: 2,
    teams: [],
    current: 0,
    timerId: null,
    startedAt: 0,
    timeLimit: 20,
    resolving: false,
    resultsShown: false,
    lastTimerSecond: null,
    activeNameTeamId: 0,
    activeGameTeamId: null
  };

  const $ = (q) => document.querySelector(q);
  const $$ = (q) => [...document.querySelectorAll(q)];
  const screens = {
    pool: $("#poolScreen"),
    teams: $("#teamScreen"),
    game: $("#gameScreen"),
    podium: $("#podiumScreen")
  };


  const audio = {
    ctx: null,
    master: null,
    unlocked: false
  };

  function unlockAudio() {
    try {
      if (!audio.ctx) {
        audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
        audio.master = audio.ctx.createGain();
        audio.master.gain.value = 0.24;
        audio.master.connect(audio.ctx.destination);
      }
      if (audio.ctx.state === "suspended") audio.ctx.resume();
      audio.unlocked = true;
    } catch (err) {
      audio.unlocked = false;
    }
  }

  function playTone(freq, duration = 0.12, options = {}) {
    if (!audio.unlocked) unlockAudio();
    if (!audio.ctx || !audio.master) return;
    const now = audio.ctx.currentTime + (options.delay || 0);
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    const filter = audio.ctx.createBiquadFilter();

    osc.type = options.type || "sine";
    osc.frequency.setValueAtTime(freq, now);
    if (options.toFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.toFreq), now + duration);

    filter.type = "lowpass";
    filter.frequency.value = options.filter || 4200;
    filter.Q.value = options.q || 0.4;

    const peak = options.gain ?? 0.28;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    osc.start(now);
    osc.stop(now + duration + 0.035);
  }

  function playNoise(duration = 0.16, options = {}) {
    if (!audio.unlocked) unlockAudio();
    if (!audio.ctx || !audio.master) return;
    const now = audio.ctx.currentTime + (options.delay || 0);
    const bufferSize = Math.max(1, Math.floor(audio.ctx.sampleRate * duration));
    const buffer = audio.ctx.createBuffer(1, bufferSize, audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const source = audio.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = options.filterType || "bandpass";
    filter.frequency.value = options.frequency || 900;
    filter.Q.value = options.q || 1.4;
    const gain = audio.ctx.createGain();
    gain.gain.setValueAtTime(options.gain ?? 0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    source.start(now);
    source.stop(now + duration);
  }

  function playSound(name) {
    switch (name) {
      case "click":
        playTone(560, 0.055, { type: "square", gain: 0.12, filter: 3000 });
        break;
      case "select":
        playTone(620, 0.07, { type: "triangle", gain: 0.16 });
        playTone(880, 0.08, { type: "triangle", gain: 0.12, delay: 0.055 });
        break;
      case "back":
        playTone(330, 0.075, { type: "square", gain: 0.12, toFreq: 220 });
        break;
      case "enter":
        playTone(540, 0.08, { type: "triangle", gain: 0.15 });
        playTone(760, 0.09, { type: "triangle", gain: 0.14, delay: 0.07 });
        break;
      case "start":
        playTone(420, 0.09, { type: "triangle", gain: 0.16 });
        playTone(630, 0.09, { type: "triangle", gain: 0.16, delay: 0.08 });
        playTone(940, 0.16, { type: "triangle", gain: 0.18, delay: 0.17 });
        break;
      case "lock":
        playTone(720, 0.08, { type: "square", gain: 0.14 });
        playTone(1020, 0.09, { type: "square", gain: 0.10, delay: 0.055 });
        break;
      case "allLocked":
        playTone(520, 0.10, { type: "sawtooth", gain: 0.13 });
        playTone(780, 0.10, { type: "sawtooth", gain: 0.12, delay: 0.09 });
        break;
      case "countdown":
        playTone(760, 0.11, { type: "square", gain: 0.18 });
        break;
      case "go":
        playTone(620, 0.10, { type: "triangle", gain: 0.18 });
        playTone(920, 0.14, { type: "triangle", gain: 0.18, delay: 0.08 });
        break;
      case "correct":
        playTone(660, 0.10, { type: "triangle", gain: 0.16 });
        playTone(880, 0.12, { type: "triangle", gain: 0.16, delay: 0.09 });
        playTone(1320, 0.18, { type: "triangle", gain: 0.18, delay: 0.18 });
        break;
      case "wrong":
        playTone(220, 0.22, { type: "sawtooth", gain: 0.16, toFreq: 120, filter: 1600 });
        playNoise(0.16, { gain: 0.08, frequency: 240, q: 0.8 });
        break;
      case "timerLow":
        playTone(480, 0.07, { type: "square", gain: 0.10 });
        break;
      case "podium":
        playTone(520, 0.10, { type: "triangle", gain: 0.16 });
        playTone(660, 0.10, { type: "triangle", gain: 0.16, delay: 0.1 });
        playTone(780, 0.10, { type: "triangle", gain: 0.16, delay: 0.2 });
        playTone(1040, 0.35, { type: "triangle", gain: 0.20, delay: 0.32 });
        break;
      case "reset":
        playTone(420, 0.08, { type: "square", gain: 0.12 });
        playTone(300, 0.12, { type: "square", gain: 0.10, delay: 0.08 });
        break;
    }
  }

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    document.addEventListener("pointerdown", unlockAudio, { once: true });
    document.addEventListener("keydown", unlockAudio, { once: true });
    bindPool();
    bindNav();
    bindGlobalKeys();
    updateStats();
  }

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  function bindPool() {
    const fileInput = $("#fileInput");
    const dropZone = $("#dropZone");
    $("#chooseFileBtn").addEventListener("click", () => { playSound("click"); fileInput.click(); });
    fileInput.addEventListener("change", async () => {
      if (fileInput.files && fileInput.files[0]) await loadXlsx(fileInput.files[0]);
    });
    dropZone.addEventListener("click", e => {
      if (!e.target.closest("button")) fileInput.click();
    });
    ["dragenter","dragover"].forEach(type => dropZone.addEventListener(type, e => {
      e.preventDefault();
      dropZone.classList.add("dragging");
    }));
    ["dragleave","drop"].forEach(type => dropZone.addEventListener(type, e => {
      e.preventDefault();
      dropZone.classList.remove("dragging");
    }));
    dropZone.addEventListener("drop", async e => {
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) await loadXlsx(file);
    });
    $("#loadSampleBtn").addEventListener("click", () => {
      state.questions = SAMPLE_QUESTIONS.map(q => ({...q, answers:[...q.answers]}));
      setStatus(`Loaded included sample with ${state.questions.length} questions.`, "good");
      playSound("select");
      updateStats();
    });
    $$(".seg").forEach(btn => btn.addEventListener("click", () => {
      $$(".seg").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.teamCount = Number(btn.dataset.teamCount);
      playSound("select");
    }));
    $("#goTeamsBtn").addEventListener("click", () => {
      if (!state.questions.length) return;
      playSound("start");
      createTeams();
      renderTeamEditor();
      showScreen("teams");
    });
  }

  function bindNav() {
    $("#backToPoolBtn").addEventListener("click", () => { playSound("back"); showScreen("pool"); });
    $("#startGameBtn").addEventListener("click", () => { playSound("start"); startGame(); });
    $("#nextQuestionBtn").addEventListener("click", () => { playSound("enter"); nextQuestion(); });
    $("#playAgainBtn").addEventListener("click", () => { playSound("reset"); resetToPool(); });
  }

  async function loadXlsx(file) {
    try {
      setStatus("Reading XLSX file...", "");
      const rows = await readXlsxRows(await file.arrayBuffer());
      const questions = parseKahootRows(rows);
      if (!questions.length) throw new Error("No valid questions found.");
      state.questions = questions;
      setStatus(`Loaded ${questions.length} questions from ${file.name}.`, "good");
      playSound("select");
    } catch (err) {
      console.error(err);
      state.questions = [];
      setStatus(`Could not load file. ${err.message}`, "bad");
    }
    updateStats();
  }

  function setStatus(text, type) {
    const box = $("#fileStatus");
    box.textContent = text;
    box.classList.remove("good", "bad");
    if (type) box.classList.add(type);
  }

  function updateStats() {
    const total = state.questions.length;
    const choice = state.questions.filter(q => q.type === "choice").length;
    const typed = state.questions.filter(q => q.type === "type").length;
    const nums = $("#poolStats").querySelectorAll("b");
    nums[0].textContent = total;
    nums[1].textContent = choice;
    nums[2].textContent = typed;
    $("#goTeamsBtn").disabled = total === 0;
  }

  function createTeams() {
    state.teams = Array.from({length: state.teamCount}, (_, i) => ({
      id: i,
      emoji: EMOJIS[i],
      name: `Team ${i + 1}`,
      score: 0,
      answer: null,
      answerText: "",
      answerTimeMs: 0,
      submitted: false,
      correct: false
    }));
    state.activeNameTeamId = 0;
  }

  function renderTeamEditor() {
    const grid = $("#teamEditorGrid");
    grid.className = `team-grid team-editor ${state.teamCount === 2 ? "two" : "four"}`;
    grid.innerHTML = "";

    state.teams.forEach(team => {
      const card = document.createElement("article");
      card.className = "team-editor-card";
      card.innerHTML = `
        <div class="team-title-line">
          <div class="big-emoji">${team.emoji}</div>
          <input class="team-name-input" readonly maxlength="18" value="${esc(team.name)}" data-team-name="${team.id}" />
        </div>
        <div class="emoji-row">
          ${EMOJIS.map(e => `<button class="emoji-btn ${e === team.emoji ? "selected" : ""}" data-team-id="${team.id}" data-emoji="${e}">${e}</button>`).join("")}
        </div>
        <div class="team-keyboard" data-name-keyboard="${team.id}">${keyboardHtml(team.id, "name")}</div>
      `;
      grid.appendChild(card);
    });

    $$(".team-name-input").forEach(input => input.addEventListener("click", () => activateNameTeam(Number(input.dataset.teamName))));
    $$(".emoji-btn").forEach(btn => btn.addEventListener("click", () => {
      const team = getTeam(Number(btn.dataset.teamId));
      team.emoji = btn.dataset.emoji;
      playSound("select");
      renderTeamEditor();
    }));
    $$(".team-keyboard .key-btn").forEach(btn => btn.addEventListener("click", () => handleNameKey(btn.dataset.key, Number(btn.dataset.teamId))));
    activateNameTeam(state.activeNameTeamId || 0);
  }

  function activateNameTeam(teamId) {
    state.activeNameTeamId = teamId;
    $$(".team-name-input").forEach(i => i.classList.toggle("active", Number(i.dataset.teamName) === teamId));
    $$(".team-keyboard").forEach(k => k.classList.toggle("active", Number(k.dataset.nameKeyboard) === teamId));
  }

  function handleNameKey(key, teamId = state.activeNameTeamId) {
    const team = getTeam(teamId);
    if (!team) return;
    activateNameTeam(teamId);
    if (key === "BACK") { team.name = team.name.slice(0, -1); playSound("back"); }
    else if (key === "CLEAR") { team.name = ""; playSound("back"); }
    else if (key === "SPACE") { team.name = (team.name + " ").slice(0, 18); playSound("click"); }
    else if (key === "ENTER") {
      playSound("enter");
      activateNameTeam(teamId >= state.teamCount - 1 ? 0 : teamId + 1);
      return;
    } else if (team.name.length < 18) { team.name += key; playSound("click"); }
    const input = $(`.team-name-input[data-team-name="${teamId}"]`);
    if (input) input.value = team.name;
  }

  function keyboardHtml(teamId, mode) {
    const rows = [
      ["Q","W","E","R","T","Y","U","I","O","P"],
      ["A","S","D","F","G","H","J","K","L"],
      ["Z","X","C","V","B","N","M"],
      ["BACK","SPACE","CLEAR","ENTER"]
    ];
    if (mode === "game") rows[3] = ["BACK","SPACE","ENTER"];
    return rows.map(row => `<div class="keyboard-row">${
      row.map(key => {
        const label = key === "BACK" ? "⌫" : key === "SPACE" ? "SPACE" : key === "CLEAR" ? "CLEAR" : key === "ENTER" ? "ENTER" : key;
        const extra = key === "SPACE" ? "super-wide" : (key === "BACK" || key === "CLEAR" || key === "ENTER" ? "wide" : "");
        const enter = key === "ENTER" ? "enter" : "";
        return `<button class="key-btn ${extra} ${enter}" data-team-id="${teamId}" data-key="${key}">${label}</button>`;
      }).join("")
    }</div>`).join("");
  }

  function startGame() {
    state.teams.forEach((team, i) => {
      team.name = (team.name || `Team ${i + 1}`).trim().slice(0, 18);
      team.score = 0;
    });
    state.current = 0;
    showScreen("game");
    renderQuestion();
  }

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
        <div class="answer-status" data-status="${team.id}">Choose an answer.</div>
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

  function choiceBody(q, team) {
    return `<div class="choices">${q.answers.map((answer, i) => `<button class="choice-btn" data-team-id="${team.id}" data-choice-index="${i}">${esc(answer)}</button>`).join("")}</div>`;
  }

  function typeBody(team) {
    return `<div class="type-wrap">
      <input class="type-input" readonly maxlength="40" data-team-id="${team.id}" />
      <div class="mini-keyboard">${keyboardHtml(team.id, "game")}</div>
    </div>`;
  }

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
    setStatusForTeam(teamId, "Answer locked!");
    playSound("lock");
    if (state.teams.every(t => t.submitted)) startResolveSequence();
  }

  function activateGameTeam(teamId) {
    state.activeGameTeamId = teamId;
    $$(".type-input").forEach(i => i.classList.toggle("active", Number(i.dataset.teamId) === teamId));
  }

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

  function submitTyped(teamId) {
    if (state.resolving || state.resultsShown) return;
    const team = getTeam(teamId);
    if (!team || team.submitted) return;
    team.answerText = team.answerText.trim();
    team.answer = team.answerText;
    team.answerTimeMs = performance.now() - state.startedAt;
    team.submitted = true;
    setStatusForTeam(teamId, team.answerText ? "Answer locked!" : "Blank answer locked.");
    playSound("lock");
    if (state.teams.every(t => t.submitted)) startResolveSequence();
  }

  function setStatusForTeam(teamId, text) {
    const status = $(`[data-status="${teamId}"]`);
    if (status) status.textContent = text;
  }

  function startResolveSequence() {
    if (state.resolving || state.resultsShown) return;
    state.resolving = true;
    playSound("allLocked");
    clearInterval(state.timerId);
    lockAllInputs();
    runCountdown(3, showResults);
  }

  function lockAllInputs() {
    $$(".choice-btn, .type-input, .mini-keyboard .key-btn").forEach(el => {
      el.disabled = true;
      el.classList.add("locked");
    });
    state.teams.forEach(t => {
      if (!t.submitted) setStatusForTeam(t.id, "No answer locked.");
    });
  }

  function runCountdown(start, done) {
    const overlay = $("#countdownOverlay");
    const number = $("#countdownNumber");
    overlay.classList.remove("hidden");
    let value = start;
    number.textContent = value;
    playSound("countdown");
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

  function showResults() {
    if (state.resultsShown) return;
    state.resultsShown = true;

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
    $("#betweenSummary").textContent = `${correctCount} / ${state.teams.length} teams answered correctly.`;
    $("#betweenQuestionPanel").classList.remove("hidden");
  }

  function nextQuestion() {
    if (state.current < state.questions.length - 1) {
      state.current++;
      renderQuestion();
    } else {
      showPodium();
    }
  }

  function showPodium() {
    clearInterval(state.timerId);
    $("#countdownOverlay").classList.add("hidden");
    const ranking = [...state.teams].sort((a,b) => b.score - a.score);
    const podium = $("#podiumArea");
    podium.innerHTML = "";
    ranking.forEach((team, i) => {
      const card = document.createElement("div");
      card.className = `podium-card rank-${i + 1}`;
      card.style.animationDelay = `${i * .14}s`;
      card.innerHTML = `
        <div class="podium-emoji">${team.emoji}</div>
        <div class="podium-name">${esc(team.name)}</div>
        <div class="podium-score">${team.score} pts</div>
        <div class="podium-step">${i + 1}</div>
      `;
      podium.appendChild(card);
    });
    makeConfetti();
    playSound("podium");
    showScreen("podium");
  }

  function makeConfetti() {
    const layer = $("#confettiLayer");
    layer.innerHTML = "";
    for (let i = 0; i < 120; i++) {
      const c = document.createElement("span");
      c.className = "confetti";
      c.style.left = `${Math.random() * 100}%`;
      c.style.animationDelay = `${Math.random() * 4}s`;
      c.style.animationDuration = `${2.8 + Math.random() * 2.4}s`;
      c.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      layer.appendChild(c);
    }
  }

  function resetToPool() {
    clearInterval(state.timerId);
    state.resolving = false;
    state.resultsShown = false;
    $("#countdownOverlay").classList.add("hidden");
    showScreen("pool");
  }

  function updateTimer(seconds, ratio) {
    $("#timerValue").textContent = Math.ceil(seconds);
    $("#timerFill").style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
  }

  function bindGlobalKeys() {
    document.addEventListener("keydown", e => {
      const key = e.key;

      if (screens.game.classList.contains("active")) {
        if (key.toLowerCase() === "r") {
          e.preventDefault();
          playSound("reset");
          resetToPool();
          return;
        }
        if (key.toLowerCase() === "f") {
          e.preventDefault();
          showPodium();
          return;
        }
      }

      if (screens.teams.classList.contains("active")) {
        if (key === "Backspace") { e.preventDefault(); handleNameKey("BACK"); }
        else if (key === "Enter") { e.preventDefault(); handleNameKey("ENTER"); }
        else if (key === " ") { e.preventDefault(); handleNameKey("SPACE"); }
        else if (TYPABLE.test(key)) { e.preventDefault(); handleNameKey(key.toUpperCase()); }
      }

      if (screens.game.classList.contains("active")) {
        const q = state.questions[state.current];
        if (!q || q.type !== "type" || state.activeGameTeamId === null) return;
        if (key === "Backspace") { e.preventDefault(); handleGameKey(state.activeGameTeamId, "BACK"); }
        else if (key === "Enter") { e.preventDefault(); handleGameKey(state.activeGameTeamId, "ENTER"); }
        else if (key === " ") { e.preventDefault(); handleGameKey(state.activeGameTeamId, "SPACE"); }
        else if (TYPABLE.test(key)) { e.preventDefault(); handleGameKey(state.activeGameTeamId, key.toUpperCase()); }
      }
    });
  }

  function getTeam(id) {
    return state.teams.find(t => t.id === id);
  }

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

  function getCorrectLabel(q) {
    if (q.type === "choice") return getCorrectIndexes(q).map(i => q.answers[i]).join(", ");
    return [...getAcceptedTyped(q)][0] || q.answers[0] || "";
  }

  function isCorrect(q, team) {
    if (!team.submitted) return false;
    if (q.type === "choice") return getCorrectIndexes(q).includes(team.answer);
    return getAcceptedTyped(q).has(normalize(team.answerText));
  }

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9ñ\s]/gi, " ")
      .replace(/\s+/g, " ").trim();
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }

  async function readXlsxRows(arrayBuffer) {
    const zip = readZipDirectory(arrayBuffer);
    const workbookXml = await getZipText(zip, "xl/workbook.xml");
    const relsXml = await getZipText(zip, "xl/_rels/workbook.xml.rels").catch(() => "");
    const sheetPath = firstSheetPath(workbookXml, relsXml, zip) || "xl/worksheets/sheet1.xml";
    const shared = await readSharedStrings(zip);
    return parseWorksheet(await getZipText(zip, sheetPath), shared);
  }

  function readZipDirectory(arrayBuffer) {
    const view = new DataView(arrayBuffer), bytes = new Uint8Array(arrayBuffer);
    const eocd = findEocd(bytes);
    if (eocd < 0) throw new Error("Invalid XLSX/ZIP file.");
    const total = view.getUint16(eocd + 10, true);
    const cdSize = view.getUint32(eocd + 12, true);
    const cdOffset = view.getUint32(eocd + 16, true);
    const decoder = new TextDecoder("utf-8");
    const entries = new Map();
    let ptr = cdOffset, end = cdOffset + cdSize;
    for (let i = 0; i < total && ptr < end; i++) {
      if (view.getUint32(ptr, true) !== 0x02014b50) break;
      const method = view.getUint16(ptr + 10, true);
      const compressedSize = view.getUint32(ptr + 20, true);
      const nameLen = view.getUint16(ptr + 28, true);
      const extraLen = view.getUint16(ptr + 30, true);
      const commentLen = view.getUint16(ptr + 32, true);
      const localHeaderOffset = view.getUint32(ptr + 42, true);
      const name = decoder.decode(bytes.slice(ptr + 46, ptr + 46 + nameLen)).replace(/\\/g, "/");
      entries.set(name, {method, compressedSize, localHeaderOffset});
      ptr += 46 + nameLen + extraLen + commentLen;
    }
    return {arrayBuffer, view, entries};
  }

  function findEocd(bytes) {
    const min = Math.max(0, bytes.length - 66000);
    for (let i = bytes.length - 22; i >= min; i--) {
      if (bytes[i] === 0x50 && bytes[i+1] === 0x4b && bytes[i+2] === 0x05 && bytes[i+3] === 0x06) return i;
    }
    return -1;
  }

  async function getZipText(zip, path) {
    return new TextDecoder("utf-8").decode(await getZipBuffer(zip, cleanPath(path)));
  }

  async function getZipBuffer(zip, path) {
    const entry = zip.entries.get(path);
    if (!entry) throw new Error(`Missing XLSX part: ${path}`);
    const offset = entry.localHeaderOffset;
    if (zip.view.getUint32(offset, true) !== 0x04034b50) throw new Error("Invalid ZIP local header.");
    const nameLen = zip.view.getUint16(offset + 26, true);
    const extraLen = zip.view.getUint16(offset + 28, true);
    const start = offset + 30 + nameLen + extraLen;
    const compressed = zip.arrayBuffer.slice(start, start + entry.compressedSize);
    if (entry.method === 0) return compressed;
    if (entry.method !== 8) throw new Error(`Unsupported ZIP compression method: ${entry.method}`);
    if (!("DecompressionStream" in window)) throw new Error("Use a recent Chrome, Edge, or Chromium browser for XLSX loading.");
    return await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer();
  }

  async function readSharedStrings(zip) {
    if (!zip.entries.has("xl/sharedStrings.xml")) return [];
    const doc = new DOMParser().parseFromString(await getZipText(zip, "xl/sharedStrings.xml"), "application/xml");
    return [...doc.getElementsByTagName("si")].map(si => [...si.getElementsByTagName("t")].map(t => t.textContent || "").join(""));
  }

  function firstSheetPath(workbookXml, relsXml, zip) {
    try {
      const doc = new DOMParser().parseFromString(workbookXml, "application/xml");
      const sheet = doc.getElementsByTagName("sheet")[0];
      if (!sheet) return null;
      const rid = sheet.getAttribute("r:id") || sheet.getAttribute("id");
      if (!rid || !relsXml) return zip.entries.has("xl/worksheets/sheet1.xml") ? "xl/worksheets/sheet1.xml" : null;
      const rels = new DOMParser().parseFromString(relsXml, "application/xml");
      const rel = [...rels.getElementsByTagName("Relationship")].find(r => r.getAttribute("Id") === rid);
      if (!rel) return null;
      let target = rel.getAttribute("Target") || "";
      target = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
      return cleanPath(target);
    } catch { return null; }
  }

  function cleanPath(path) {
    const parts = path.replace(/\\/g, "/").split("/");
    const out = [];
    for (const part of parts) {
      if (!part || part === ".") continue;
      if (part === "..") out.pop();
      else out.push(part);
    }
    return out.join("/");
  }

  function parseWorksheet(xml, shared) {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const rows = [];
    [...doc.getElementsByTagName("row")].forEach((rowNode, rowIndex) => {
      const rowNumber = Number(rowNode.getAttribute("r") || rowIndex + 1) - 1;
      const row = rows[rowNumber] || [];
      [...rowNode.getElementsByTagName("c")].forEach(cell => {
        const ref = cell.getAttribute("r") || "";
        const col = lettersToCol(ref.replace(/[0-9]/g, ""));
        row[col] = cellValue(cell, shared);
      });
      rows[rowNumber] = row;
    });
    return rows;
  }

  function cellValue(cell, shared) {
    const type = cell.getAttribute("t");
    if (type === "inlineStr") return [...cell.getElementsByTagName("t")].map(t => t.textContent || "").join("");
    const v = cell.getElementsByTagName("v")[0];
    const raw = v ? v.textContent || "" : "";
    if (type === "s") return shared[Number(raw)] ?? "";
    if (type === "b") return raw === "1";
    if (raw === "") return "";
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }

  function lettersToCol(letters) {
    let idx = 0;
    for (let i = 0; i < letters.length; i++) idx = idx * 26 + (letters.charCodeAt(i) - 64);
    return Math.max(0, idx - 1);
  }

  function parseKahootRows(rows) {
    const headerIndex = rows.findIndex(row => {
      const cells = (row || []).map(c => normalize(c));
      return cells.some(c => c.includes("question")) && cells.some(c => c.includes("answer 1")) && cells.some(c => c.includes("correct"));
    });
    if (headerIndex < 0) throw new Error("Kahoot headers were not found.");
    const header = rows[headerIndex].map(c => normalize(c));
    const qCol = header.findIndex(c => c.includes("question"));
    const answerCols = [1,2,3,4].map(n => header.findIndex(c => c.includes(`answer ${n}`)));
    const timeCol = header.findIndex(c => c.includes("time"));
    const correctCol = header.findIndex(c => c.includes("correct"));
    const questions = [];
    for (let i = headerIndex + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const question = String(row[qCol] ?? "").trim();
      if (!question) continue;
      const answers = answerCols.map(col => col >= 0 ? String(row[col] ?? "").trim() : "").filter(Boolean);
      if (!answers.length) continue;
      questions.push({
        question,
        answers,
        timeLimit: Math.max(5, Math.min(300, Number(row[timeCol]) || 20)),
        correctRaw: correctCol >= 0 ? String(row[correctCol] ?? "1").trim() || "1" : "1",
        type: answers.length >= 2 ? "choice" : "type"
      });
    }
    return questions;
  }
})();
