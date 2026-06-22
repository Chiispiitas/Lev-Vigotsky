"use strict";

const COURSE_ID = "tercero-tecnico-fct-2026";
const WIX_SITE_BASE = "https://chiispiitas.wixsite.com/mr-david-collection";
const PAPER_API_BASE = `${WIX_SITE_BASE}/_functions`;
const apiBase = PAPER_API_BASE;
const SUSTENTACION_ENDPOINT = `${apiBase}/sustentacion`;

const STUDENTS = [
  { n: 1, name: "ALCÍVAR CEDEÑO GÉNESSIS ANALÍA" }, { n: 2, name: "ANDRADE LARA MATIAS SEBASTIAN" },
  { n: 3, name: "BAILÓN ESTRADA DILLAN SANTIAGO" }, { n: 4, name: "CAÑARTE CASTRO FREDDY MATHIAS" },
  { n: 5, name: "CARREÑO MENDOZA KEILA ANAHÍ" }, { n: 6, name: "CASTRELLON VERA ISMAEL" },
  { n: 7, name: "CEDEÑO QUIJIJE MATEO" }, { n: 8, name: "CEDEÑO VASQUEZ MARCO ANDRES" },
  { n: 9, name: "CEVALLOS COBEÑA JOSE MATIAS" }, { n: 10, name: "CEVALLOS LOPEZ SHIRLEY VALERIA" },
  { n: 11, name: "CEVALLOS YOSA EMILY SCARLETH" }, { n: 12, name: "DELGADO MERO MAYKEL DARIAN" },
  { n: 13, name: "DUARTE AVEIGA CRISTHIAN VALENTIN" }, { n: 14, name: "FALCONI MERO VIELKA ROMINA" },
  { n: 15, name: "FRANCO FRANCO LUISANA VALENTINA" }, { n: 16, name: "LOOR OCHOA JOHAN PAUL" },
  { n: 17, name: "MACIAS TUBAY ANGELA DAMARYS" }, { n: 18, name: "MASAPANTA ZAMBRANO JEAN MARCOS" },
  { n: 19, name: "MEDRANDA PONCE MELANY YANOSKA" }, { n: 20, name: "MEJIA LOPEZ GERALD JOHAN" },
  { n: 21, name: "MENDOZA CAJAMARCA HANNA MICHELLE" }, { n: 22, name: "MORRILLO CORDERO MIGUEL ANGEL" },
  { n: 23, name: "MUÑOZ SUAREZ BRANDON DARIO" }, { n: 24, name: "NAULA SÁNCHEZ NOHELIA VALEZKA" },
  { n: 25, name: "PELAEZ SABANDO KEYLA DAMARIS" }, { n: 26, name: "PIGUAVE BARREZUETA ANGIE NAYIBETH" },
  { n: 27, name: "REYES MERA RANDY ELIAN" }, { n: 28, name: "REYES SABANDO BRITHANY PAMELA" },
  { n: 29, name: "RODRÍGUEZ URDÁNIGO BRUNO ABDÓN" }, { n: 30, name: "SANTANA MEJIA SARA NAHOMY" },
  { n: 31, name: "TUMBACO MACÍAS JUAN DAVID" }, { n: 32, name: "VELASCO REYES MILAGROS ANALIA" },
  { n: 33, name: "VERA MOREIRA BIANKA MILENA" }, { n: 34, name: "VERA PILAY JHON WALTER" },
  { n: 35, name: "VIDAL FREYA MELINA" }, { n: 36, name: "ZAMORA ESCALANTE MATIAS BENJAMIN" }
];

const $ = (selector) => document.querySelector(selector);
const els = {
  refreshButton: $("#refreshButton"),
  classAverage: $("#classAverage"),
  averageCaption: $("#averageCaption"),
  studentCount: $("#studentCount"),
  entryCount: $("#entryCount"),
  lastRefresh: $("#lastRefresh"),
  studentAverageGrid: $("#studentAverageGrid"),
  entryTableBody: $("#entryTableBody"),
  entrySearch: $("#entrySearch"),
  statusBox: $("#statusBox")
};

let entries = [];
let sessions = [];

function formatScore(value) {
  const rounded = Math.round(Number(value || 0) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}

function formatDate(value) {
  if (!value) return "—";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [year, month, day] = raw.slice(0, 10).split("-");
    return `${day}/${month}/${year}`;
  }
  try {
    return new Intl.DateTimeFormat("es-EC", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return raw;
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[char]));
}

function normalize(text) {
  return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function addScoreRanks(items, scoreGetter) {
  let lastScore = null;
  let lastRank = 0;
  return items.map((item, index) => {
    const score = Math.round(Number(scoreGetter(item) || 0) * 100) / 100;
    const rank = index === 0 || score !== lastScore ? index + 1 : lastRank;
    lastScore = score;
    lastRank = rank;
    return { ...item, rank };
  });
}

function setStatus(message, type = "") {
  els.statusBox.textContent = message;
  els.statusBox.className = `status ${type}`.trim();
}

async function fetchEntries() {
  setStatus("Cargando calificaciones…");
  els.refreshButton.disabled = true;
  try {
    const url = new URL(SUSTENTACION_ENDPOINT);
    url.searchParams.set("courseId", COURSE_ID);
    const response = await fetch(url.toString());
    const data = await response.json();
    if (!response.ok || data.ok === false) throw new Error(data.error || `Error ${response.status}`);
    entries = Array.isArray(data.items) ? data.items : [];
    sessions = Array.isArray(data.sessions) ? data.sessions : [];
    renderAll();
    setStatus(`${entries.length} registro(s) cargado(s).`, "ok");
  } catch (error) {
    console.error(error);
    entries = [];
    sessions = [];
    renderAll();
    const localHint = window.location.protocol === "file:" ? " Abre esta página desde GitHub Pages o con un servidor local si el navegador bloquea file://." : "";
    setStatus(`No se pudo cargar calificaciones: ${error.message}.${localHint}`, "error");
  } finally {
    els.refreshButton.disabled = false;
  }
}

function averageByStudent() {
  const map = new Map();
  entries.forEach((entry) => {
    const number = Number(entry.studentNumber || 0);
    if (!number) return;
    const key = String(number);
    if (!map.has(key)) {
      map.set(key, {
        studentNumber: number,
        studentName: entry.studentName || (STUDENTS.find((student) => student.n === number)?.name || `Estudiante ${number}`),
        scores: [],
        lastDate: entry.submittedAt || entry.savedAt || entry.evaluationDate || ""
      });
    }
    const item = map.get(key);
    item.scores.push(Number(entry.scoreTotal || 0));
    const candidateDate = entry.submittedAt || entry.savedAt || entry.evaluationDate || "";
    if (String(candidateDate) > String(item.lastDate)) item.lastDate = candidateDate;
  });
  return Array.from(map.values())
    .map((item) => ({
      ...item,
      average: item.scores.length ? item.scores.reduce((sum, score) => sum + score, 0) / item.scores.length : 0,
      entries: item.scores.length
    }))
    .sort((a, b) => {
      const scoreDiff = Number(b.average || 0) - Number(a.average || 0);
      if (scoreDiff) return scoreDiff;
      const entryDiff = Number(b.entries || 0) - Number(a.entries || 0);
      if (entryDiff) return entryDiff;
      return Number(a.studentNumber || 0) - Number(b.studentNumber || 0);
    });
}

function renderProjection() {
  const averages = addScoreRanks(averageByStudent(), (item) => item.average);
  const allScores = averages.flatMap((item) => item.scores);
  const classAverage = allScores.length ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length : 0;
  els.classAverage.textContent = allScores.length ? `${formatScore(classAverage)} / 10` : "—";
  els.averageCaption.textContent = allScores.length ? "Promedio calculado con las calificaciones publicadas" : "Esperando calificaciones publicadas";
  els.studentCount.textContent = String(averages.length);
  els.entryCount.textContent = String(entries.length);
  els.lastRefresh.textContent = new Intl.DateTimeFormat("es-EC", { hour: "2-digit", minute: "2-digit" }).format(new Date());

  if (!averages.length) {
    els.studentAverageGrid.innerHTML = `<div class="student-card"><div class="student-name"><strong>No hay datos todavía</strong><span>Usa Publicar calificaciones en la rúbrica para enviar las evaluaciones.</span></div></div>`;
    return;
  }

  els.studentAverageGrid.innerHTML = averages.map((item) => `
    <article class="student-card">
      <div class="student-number">${item.rank}</div>
      <div class="student-name">
        <strong>${escapeHtml(item.studentName)}</strong>
        <span>${item.entries} entrada${item.entries === 1 ? "" : "s"} · último registro: ${escapeHtml(formatDate(item.lastDate))}</span>
      </div>
      <div class="student-score">${escapeHtml(formatScore(item.average))}</div>
    </article>`).join("");
}

function judgeForEntry(entry) {
  if (entry.juez || entry.judgeName) return entry.juez || entry.judgeName;
  const session = sessions.find((item) => item.sessionKey && item.sessionKey === entry.sessionKey) || sessions.find((item) => item.batchId && item.batchId === entry.batchId);
  return session?.juez || session?.judgeName || "—";
}

function renderEntries() {
  const query = normalize(els.entrySearch.value);
  const filtered = query ? entries.filter((entry) => normalize(`${entry.studentNumber} ${entry.studentName} ${entry.evaluationDate} ${judgeForEntry(entry)}`).includes(query)) : entries;
  const sorted = [...filtered].sort((a, b) => {
    const scoreDiff = Number(b.scoreTotal || 0) - Number(a.scoreTotal || 0);
    if (scoreDiff) return scoreDiff;
    const dateA = String(a.submittedAt || a.savedAt || a.evaluationDate || "");
    const dateB = String(b.submittedAt || b.savedAt || b.evaluationDate || "");
    const dateDiff = dateB.localeCompare(dateA);
    if (dateDiff) return dateDiff;
    return Number(a.studentNumber || 0) - Number(b.studentNumber || 0);
  });

  if (!sorted.length) {
    els.entryTableBody.innerHTML = `<tr><td colspan="6">No hay entradas para mostrar.</td></tr>`;
    return;
  }

  const ranked = addScoreRanks(sorted, (entry) => entry.scoreTotal);
  els.entryTableBody.innerHTML = ranked.map((entry) => `
    <tr>
      <td>${escapeHtml(entry.rank || "")}</td>
      <td><strong>${escapeHtml(entry.studentName || "")}</strong></td>
      <td>${escapeHtml(formatDate(entry.evaluationDate))}</td>
      <td class="score">${escapeHtml(formatScore(entry.scoreTotal))} / 10</td>
      <td>${escapeHtml(judgeForEntry(entry))}</td>
      <td>${escapeHtml(formatDate(entry.submittedAt || entry.savedAt))}</td>
    </tr>`).join("");
}

function renderAll() {
  renderProjection();
  renderEntries();
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      const panel = button.dataset.tab === "entries" ? "#entriesPanel" : "#projectionPanel";
      $(panel).classList.add("active");
    });
  });
}

function init() {
  bindTabs();
  els.refreshButton.addEventListener("click", fetchEntries);
  els.entrySearch.addEventListener("input", renderEntries);
  fetchEntries();
}

init();
