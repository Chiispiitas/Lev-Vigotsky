"use strict";
/* ---------------------------------------------- 
     Main App Made by: David Santana 
----------------------------------------------  */

/* ---------------------------------------------- 
     Database 
----------------------------------------------  */
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
  activeGameTeamId: null,
  editorQuestions: [],
  selectedMode: "",
  tug: null
};

/* ---------------------------------------------- 
     Query Selector 
----------------------------------------------  */
const $ = (q) => document.querySelector(q);
/* ---------------------------------------------- 
     Query Selector All 
----------------------------------------------  */
const $$ = (q, root = document) => [...root.querySelectorAll(q)];
const screens = {
  title: $("#titleScreen"),
  pool: $("#poolScreen"),
  poolSelect: $("#poolScreen"),
  mode: $("#modeScreen"),
  modeSelect: $("#modeScreen"),
  teams: $("#teamScreen"),
  teamSelect: $("#teamScreen"),
  game: $("#gameScreen"),
  quiz: $("#gameScreen"),
  tug: $("#tugScreen"),
  tugOfWar: $("#tugScreen"),
  podium: $("#podiumScreen"),
  results: $("#podiumScreen")
};


const audio = {
  ctx: null,
  master: null,
  unlocked: false,
  titleBgm: null,
  roundBgm: null,
  podiumMp3: null,
  currentBgm: null,
  bgmReady: false,
  volume: 0.70
};

/* ---------------------------------------------- 
     Sound System 
----------------------------------------------  */
/* ---------------------------------------------- 
     Unlock Audio 
----------------------------------------------  */
function unlockAudio() {
  try {
    if (!audio.ctx) {
      audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.24 * audio.volume;
      audio.master.connect(audio.ctx.destination);
    }
    if (audio.ctx.state === "suspended") audio.ctx.resume();
    audio.unlocked = true;
  } catch (err) {
    audio.unlocked = false;
  }
}

/* ---------------------------------------------- 
     Setup BGM 
----------------------------------------------  */
function setupBgm() {
  if (audio.bgmReady) return;
  audio.titleBgm = new Audio("assets/title.mp3");
  audio.roundBgm = new Audio("assets/round.mp3");
  audio.podiumMp3 = new Audio("assets/podium.mp3");

  [audio.titleBgm, audio.roundBgm, audio.podiumMp3].forEach(track => {
    track.loop = true;
    track.preload = "auto";
    track.volume = 0.42;
    track.addEventListener("error", () => {
      // Keep the game running even if the user has not placed the MP3 files yet.
    });
  });

  if (audio.podiumMp3) {
    audio.podiumMp3.loop = false;
    audio.podiumMp3.preload = "auto";
    audio.podiumMp3.volume = 0.62;
    audio.podiumMp3.addEventListener("error", () => {
      // Keep the game running even if podium.mp3 is not present.
    });
  }

  audio.bgmReady = true;
  applyVolume();
}

/* ---------------------------------------------- 
     Apply Volume 
----------------------------------------------  */
function applyVolume() {
  const v = Math.max(0, Math.min(1, audio.volume));
  if (audio.master) audio.master.gain.value = 0.24 * v;
  if (audio.titleBgm) audio.titleBgm.volume = 0.42 * v;
  if (audio.roundBgm) audio.roundBgm.volume = 0.38 * v;
  if (audio.podiumMp3) audio.podiumMp3.volume = 0.62 * v;
}

/* ---------------------------------------------- 
     Start BGM 
----------------------------------------------  */
function startBgm(name) {
  setupBgm();
  const target = name === "round" ? audio.roundBgm : audio.titleBgm;
  const other = name === "round" ? audio.titleBgm : audio.roundBgm;
  if (!target) return;

  if (other && !other.paused) {
    other.pause();
    other.currentTime = 0;
  }

  if (audio.currentBgm && audio.currentBgm !== target && !audio.currentBgm.paused) {
    audio.currentBgm.pause();
    audio.currentBgm.currentTime = 0;
  }

  audio.currentBgm = target;
  target.loop = true;
  applyVolume();
  target.play().catch(() => {
    // Browser autoplay rules may wait until the next user interaction.
  });
}

/* ---------------------------------------------- 
     Stop BGM 
----------------------------------------------  */
function stopBgm(name) {
  setupBgm();
  const track = name === "round" ? audio.roundBgm : name === "podium" ? audio.podiumMp3 : audio.titleBgm;
  if (!track) return;
  track.pause();
  track.currentTime = 0;
  if (audio.currentBgm === track) audio.currentBgm = null;
}

/* ---------------------------------------------- 
     Play Podium MP3 
----------------------------------------------  */
function playPodiumMp3() {
  setupBgm();
  if (!audio.podiumMp3) return;
  audio.podiumMp3.pause();
  audio.podiumMp3.currentTime = 0;
  audio.podiumMp3.loop = false;
  applyVolume();
  audio.podiumMp3.play().catch(() => {
    // Browser autoplay rules may wait until the next user interaction.
  });
}

/* ---------------------------------------------- 
     Stop All BGM 
----------------------------------------------  */
function stopAllBgm() {
  setupBgm();
  [audio.titleBgm, audio.roundBgm, audio.podiumMp3].forEach(track => {
    if (!track) return;
    track.pause();
    track.currentTime = 0;
  });
  audio.currentBgm = null;
}

/* ---------------------------------------------- 
     Play Tone 
----------------------------------------------  */
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

/* ---------------------------------------------- 
     Play Noise 
----------------------------------------------  */
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

/* ---------------------------------------------- 
     Play Sound 
----------------------------------------------  */
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


/* ---------------------------------------------- 
     Bind Global Click Effects 
----------------------------------------------  */
function bindGlobalClickEffects() {
  document.addEventListener("pointerdown", function(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    createGlobalClickBurst(event.clientX, event.clientY);
  }, true);
}

/* ---------------------------------------------- 
     Create Global Click Burst 
----------------------------------------------  */
function createGlobalClickBurst(clientX, clientY) {
  const stage = document.getElementById("stage");
  if (!stage) return;

  const rect = stage.getBoundingClientRect();
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;

  const scaleX = rect.width / 1920;
  const scaleY = rect.height / 1080;
  const x = (clientX - rect.left) / scaleX;
  const y = (clientY - rect.top) / scaleY;
  const shapes = ["✦", "★", "◆", "●", "✧", "▣"];

  for (let i = 0; i < 12; i++) {
    const particle = document.createElement("span");
    const angle = (Math.PI * 2 / 12) * i + Math.random() * 0.45;
    const distance = 48 + Math.random() * 74;
    particle.className = "click-pop-particle";
    particle.textContent = shapes[Math.floor(Math.random() * shapes.length)];
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    particle.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
    particle.style.animationDelay = `${Math.random() * 0.04}s`;
    stage.appendChild(particle);
    setTimeout(function() { particle.remove(); }, 760);
  }
}

/* ---------------------------------------------- 
     Start App 
----------------------------------------------  */
document.addEventListener("DOMContentLoaded", init);

/* ---------------------------------------------- 
     Init 
----------------------------------------------  */
function init() {
  setupBgm();
  setupScenes();
  bindGlobalClickEffects();
  startBgm("title");

  /* ---------------------------------------------- 
       Unlock And Retry Title 
  ----------------------------------------------  */
  const unlockAndRetryTitle = () => {
    unlockAudio();
    if ((screens.title && screens.title.classList.contains("active")) ||
        (screens.pool && screens.pool.classList.contains("active")) ||
        (screens.mode && screens.mode.classList.contains("active")) ||
        (screens.teams && screens.teams.classList.contains("active"))) {
      startBgm("title");
    }
  };

  document.addEventListener("pointerdown", unlockAndRetryTitle, { once: true });
  document.addEventListener("keydown", unlockAndRetryTitle, { once: true });
  bindGlobalKeys();

  if (window.SceneManager) window.SceneManager.go("title");
}

/* ---------------------------------------------- 
     Setup Scenes 
----------------------------------------------  */
function setupScenes() {
  const sceneManager = window.SceneManager;
  const definitions = window.WhiteboardGameScenes || {};
  if (!sceneManager || !definitions) return;

  const sceneApi = {
    $,
    $$,
    state,
    screens,
    audio: {
      unlockAudio,
      startBgm,
      stopBgm,
      stopAllBgm,
      playPodiumMp3,
      playSound
    },
    showScreen
  };

  sceneManager.setAliases({
    pool: "poolSelect",
    modes: "modeSelect",
    mode: "modeSelect",
    teams: "teamSelect",
    game: "quiz",
    tug: "tugOfWar",
    tugOfWar: "tugOfWar",
    podium: "results"
  });

  ["title", "poolSelect", "modeSelect", "teamSelect", "quiz", "tugOfWar", "results"].forEach(name => {
    if (typeof definitions[name] === "function") {
      sceneManager.register(name, definitions[name](sceneApi));
    }
  });

  window.WhiteboardGameApp = { state, screens, showScreen, audio: sceneApi.audio };
}

/* ---------------------------------------------- 
     Show Screen 
----------------------------------------------  */
function showScreen(name, payload = {}) {
  if (window.SceneManager && window.SceneManager.go(name, payload)) return;

  const legacyAliases = { poolSelect: "pool", modeSelect: "mode", teamSelect: "teams", quiz: "game", results: "podium" };
  const legacyName = legacyAliases[name] || name;
  Object.values(screens).forEach(screen => screen && screen.classList.remove("active"));
  if (screens[legacyName]) screens[legacyName].classList.add("active");
}


/* ---------------------------------------------- 
     Keyboard HTML 
----------------------------------------------  */
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


/* ---------------------------------------------- 
     Global Keyboard Controls 
----------------------------------------------  */
/* ---------------------------------------------- 
     Bind Global Keys 
----------------------------------------------  */
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

    if (screens.tug && screens.tug.classList.contains("active")) {
      if (key.toLowerCase() === "r") { e.preventDefault(); playSound("reset"); resetToPool(); return; }
      if (key.toLowerCase() === "f") { e.preventDefault(); showPodium(); return; }
      if (typeof handleTugKeyboardKey == "function") { handleTugKeyboardKey(e); }
    }
  });
}

/* ---------------------------------------------- 
     Get Team 
----------------------------------------------  */
function getTeam(id) {
  return state.teams.find(t => t.id === id);
}


/* ---------------------------------------------- 
     Normalize 
----------------------------------------------  */
function normalize(value) {
  return String(value ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9ñ\s]/gi, " ")
    .replace(/\s+/g, " ").trim();
}


/* ---------------------------------------------- 
     Is Typed Answer Correct 
----------------------------------------------  */
function isTypedAnswerCorrect(q, value) {
  const typed = normalize(value);
  if (!typed) return false;
  return [...getAcceptedTyped(q)].some(answer => answer && typed.includes(answer));
}

/* ---------------------------------------------- 
     Esc 
----------------------------------------------  */
function esc(value) {
  return String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}


