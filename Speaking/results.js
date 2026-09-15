"use strict";

const SPEAKING_WIX_BASE = "https://chiispiitas.wixsite.com/lev-grading";
const SPEAKING_SESSION_ENDPOINT = `${SPEAKING_WIX_BASE}/_functions/speakingSession`;
const SPEAKING_SUBMISSION_ENDPOINT = `${SPEAKING_WIX_BASE}/_functions/speakingSubmission`;
const REGULAR_ACTIVITY = "Regular grading";
const REGULAR_CHECKLIST_ACTIVITY = "Regular grading · Checklist"; // legacy
const REGULAR_NUMBER_ACTIVITY = "Regular grading · Number"; // legacy
const ACTIVE_SESSION_KEY = "lv-speaking-active-session-v2";

const $ = selector => document.querySelector(selector);
const els = {
  sessionIdInput: $("#sessionIdInput"),
  loadSessionButton: $("#loadSessionButton"),
  statusBox: $("#statusBox"),
  sessionBanner: $("#sessionBanner"),
  sessionTitle: $("#sessionTitle"),
  sessionMeta: $("#sessionMeta"),
  sessionCode: $("#sessionCode"),
  averageValue: $("#averageValue"),
  assessedValue: $("#assessedValue"),
  entryValue: $("#entryValue"),
  sessionStatusValue: $("#sessionStatusValue"),
  refreshButton: $("#refreshButton"),
  toggleSessionButton: $("#toggleSessionButton"),
  copySessionButton: $("#copySessionButton"),
  copyGradesButton: $("#copyGradesButton"),
  detailColumnHeader: $("#detailColumnHeader"),
  rankingGrid: $("#rankingGrid"),
  entrySearch: $("#entrySearch"),
  entryTableBody: $("#entryTableBody"),
  toast: $("#toast")
};

let activeSession = null;
let entries = [];

function normalizeSessionId(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[char]));
}

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function formatScore(value) {
  const number = Math.round(Number(value || 0) * 100) / 100;
  return Number.isInteger(number) ? String(number) : String(number).replace(".", ",");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("es-EC", { dateStyle:"medium", timeStyle:"short" }).format(date);
}

function setStatus(message, type = "") {
  els.statusBox.textContent = message;
  els.statusBox.className = `status-box ${type}`.trim();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 1800);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.error || `Error ${response.status}`);
  return data;
}

function sessionMode(session = activeSession) {
  const activity = String(session?.activity || "");
  return [REGULAR_ACTIVITY, REGULAR_CHECKLIST_ACTIVITY, REGULAR_NUMBER_ACTIVITY].includes(activity)
    ? "regular"
    : "speaking";
}

function regularEntryKind(item) {
  const rows = parseCriteriaRows(item);
  const level = String(rows[0]?.level || "");
  if (level.startsWith("✓")) return "check";
  if (level === "X") return "x";
  return Number(item?.markedCriteria || 0) > 0 ? "number" : "blank";
}
function resultDetailLabel(item) {
  if (Number(item?.markedCriteria || 0) <= 0) return "Pending";
  if (sessionMode() !== "regular") return `${item.markedCriteria}/7`;

  const kind = regularEntryKind(item);
  if (kind === "check") return "✓";
  if (kind === "x") return "X";
  return "Number";
}
function rankingSubtitle(item) {
  if (sessionMode() === "regular") {
    const kind = regularEntryKind(item);
    const label = kind === "check" ? "✓ Checked" : kind === "x" ? "X" : "Numerical grade";
    return `#${item.studentNumber || ""} · ${label}`;
  }
  return `#${item.studentNumber || ""} · ${item.markedCriteria || 0}/7 rubric criteria`;
}
function rankEntries(items) {
  const sorted = [...items].sort((a,b) => {
    const scoreDiff = Number(b.scoreTotal || 0) - Number(a.scoreTotal || 0);
    if (scoreDiff) return scoreDiff;
    return Number(a.studentNumber || 0) - Number(b.studentNumber || 0);
  });
  let lastScore = null;
  let lastRank = 0;
  return sorted.map((item,index) => {
    const score = Math.round(Number(item.scoreTotal || 0) * 100) / 100;
    const rank = index === 0 || score !== lastScore ? index + 1 : lastRank;
    lastScore = score;
    lastRank = rank;
    return { ...item, rank };
  });
}

function renderSummary(stats = {}) {
  const assessedCount = Number(stats.assessed ?? entries.filter(item => Number(item.markedCriteria || 0) > 0).length);
  els.averageValue.textContent = assessedCount ? `${formatScore(stats.average || 0)} / 10` : "—";
  els.assessedValue.textContent = String(assessedCount);
  els.entryValue.textContent = String(stats.total ?? entries.length ?? 0);
  const status = String(activeSession?.status || "—");
  els.sessionStatusValue.textContent = status ? status.charAt(0).toUpperCase() + status.slice(1) : "—";
}

function renderSession() {
  if (!activeSession) {
    els.sessionBanner.hidden = true;
    els.toggleSessionButton.disabled = true;
    els.copySessionButton.disabled = true;
    els.copyGradesButton.disabled = true;
    return;
  }

  const regular = sessionMode() === "regular";
  const typeLabel = regular ? "Regular grading" : "Speaking";

  els.sessionBanner.hidden = false;
  els.sessionTitle.textContent = activeSession.title || activeSession.activity || "Grading session";
  els.sessionMeta.textContent = `${activeSession.classLabel || activeSession.classId || "Class"} · ${typeLabel}`;
  els.sessionCode.textContent = activeSession.sessionId;
  els.toggleSessionButton.disabled = false;
  els.copySessionButton.disabled = false;
  els.copyGradesButton.disabled = false;
  if (els.detailColumnHeader) {
    els.detailColumnHeader.textContent = regular ? "Input" : "Rubric";
  }
  document.title = `${typeLabel} Results · Lev Grading`;

  const closed = String(activeSession.status || "").toLowerCase() === "closed";
  els.toggleSessionButton.textContent = closed ? "Reopen session" : "Close session";
}

function renderRanking() {
  const ranked = rankEntries(entries.filter(item => Number(item.markedCriteria || 0) > 0));
  if (!ranked.length) {
    els.rankingGrid.innerHTML = '<div class="empty-card">No submissions in this session yet.</div>';
    return;
  }
  els.rankingGrid.innerHTML = ranked.map(item => `
    <article class="rank-card">
      <div class="rank-number">${item.rank}</div>
      <div class="rank-name">
        <strong>${escapeHtml(item.studentName || "")}</strong>
        <span>${escapeHtml(rankingSubtitle(item))}</span>
      </div>
      <div class="rank-score">${escapeHtml(formatScore(item.scoreTotal))}</div>
    </article>
  `).join("");
}

function parseCriteriaRows(item) {
  if (Array.isArray(item?.rows)) return item.rows;
  try {
    const parsed = JSON.parse(item?.criteriaJson || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function renderEntryDetails(item) {
  const rows = parseCriteriaRows(item);
  const markedRows = rows.filter(row => row && row.level !== "Not marked");

  const criteriaHtml = markedRows.length
    ? markedRows.map(row => `
        <div class="criteria-detail-card">
          <div class="criteria-detail-head">
            <strong>${escapeHtml(row.criterion || "Criterion")}</strong>
            <span>${row.points == null ? "—" : `${escapeHtml(formatScore(row.points))} / ${escapeHtml(formatScore(row.max || 0))}`}</span>
          </div>
          <div class="criteria-detail-level">${escapeHtml(row.level || "—")}</div>
          ${row.observation ? `<p>${escapeHtml(row.observation)}</p>` : ""}
        </div>
      `).join("")
    : '<div class="empty-detail">No grade has been entered for this student yet.</div>';

  const comment = String(item?.comment || "").trim();

  return `
    <div class="entry-detail-wrap">
      <div class="entry-detail-grid">
        ${criteriaHtml}
      </div>
      <div class="entry-comment-block">
        <span>Teacher comment</span>
        <p>${comment ? escapeHtml(comment) : "No comment."}</p>
      </div>
    </div>
  `;
}

function renderEntries() {
  const query = normalize(els.entrySearch.value);
  const rankingMap = new Map(
    rankEntries(entries.filter(item => Number(item.markedCriteria || 0) > 0))
      .map(item => [String(item.recordKey || `${item.sessionId}|${item.studentNumber}`), item.rank])
  );

  const visible = entries
    .filter(item => !query || normalize(`${item.studentNumber} ${item.studentName} ${item.contributorName}`).includes(query))
    .sort((a, b) => Number(a.studentNumber || 0) - Number(b.studentNumber || 0));

  if (!visible.length) {
    els.entryTableBody.innerHTML = '<tr><td colspan="7">No matching entries.</td></tr>';
    return;
  }

  els.entryTableBody.innerHTML = visible.map((item, index) => {
    const key = String(item.recordKey || `${item.sessionId}|${item.studentNumber}`);
    const rank = rankingMap.get(key);
    const detailId = `entry-detail-${index}`;

    return `
      <tr class="entry-row" data-detail-id="${detailId}" tabindex="0" aria-expanded="false">
        <td>${rank || "—"}</td>
        <td><strong>${escapeHtml(item.studentName || "")}</strong><br><small>#${escapeHtml(item.studentNumber || "")}</small></td>
        <td class="score">${Number(item.markedCriteria || 0) > 0 ? `${escapeHtml(formatScore(item.scoreTotal))} / 10` : "—"}</td>
        <td>${escapeHtml(resultDetailLabel(item))}</td>
        <td>${escapeHtml(item.contributorName || item.deviceId || "—")}</td>
        <td>${escapeHtml(formatDate(item.updatedAt || item.submittedAt || item.evaluatedAt))}</td>
        <td class="expand-cell"><button type="button" class="expand-entry-button" aria-label="Expand entry">⌄</button></td>
      </tr>
      <tr class="entry-detail-row" id="${detailId}" hidden>
        <td colspan="7">${renderEntryDetails(item)}</td>
      </tr>
    `;
  }).join("");

  els.entryTableBody.querySelectorAll(".entry-row").forEach(row => {
    const toggle = () => {
      const detail = document.getElementById(row.dataset.detailId);
      if (!detail) return;
      const opening = detail.hidden;
      detail.hidden = !opening;
      row.setAttribute("aria-expanded", String(opening));
      row.classList.toggle("expanded", opening);
      const button = row.querySelector(".expand-entry-button");
      if (button) button.textContent = opening ? "⌃" : "⌄";
    };

    row.addEventListener("click", event => {
      if (event.target.closest("a")) return;
      toggle();
    });

    row.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
    });
  });
}

function renderAll(stats = {}) {
  renderSession();
  renderSummary(stats);
  renderRanking();
  renderEntries();
}

async function loadSession(sessionId = els.sessionIdInput.value) {
  const normalized = normalizeSessionId(sessionId);
  if (!normalized) {
    setStatus("Enter a session ID.", "error");
    return;
  }

  els.sessionIdInput.value = normalized;
  els.loadSessionButton.disabled = true;
  els.refreshButton.disabled = true;
  setStatus(`Loading ${normalized}…`);

  try {
    const url = new URL(SPEAKING_SUBMISSION_ENDPOINT);
    url.searchParams.set("sessionId", normalized);
    const data = await fetchJson(url.toString());

    activeSession = data.session || null;
    entries = Array.isArray(data.items) ? data.items : [];

    if (activeSession) {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(activeSession));
      const pageUrl = new URL(window.location.href);
      pageUrl.searchParams.set("sessionId", activeSession.sessionId);
      history.replaceState(null, "", pageUrl);
    }

    renderAll(data.stats || {});
    setStatus(`${entries.length} submission(s) loaded for ${normalized}.`, "ok");
  } catch (error) {
    console.error(error);
    activeSession = null;
    entries = [];
    renderAll({});
    setStatus(`Could not load session: ${error.message}`, "error");
  } finally {
    els.loadSessionButton.disabled = false;
    els.refreshButton.disabled = false;
  }
}

async function toggleSessionStatus() {
  if (!activeSession?.sessionId) return;
  const currentlyClosed = String(activeSession.status || "").toLowerCase() === "closed";
  const action = currentlyClosed ? "reopen" : "close";

  els.toggleSessionButton.disabled = true;
  try {
    const data = await fetchJson(SPEAKING_SESSION_ENDPOINT, {
      method:"POST",
      headers:{ "Content-Type":"text/plain;charset=UTF-8" },
      body:JSON.stringify({ action, sessionId:activeSession.sessionId })
    });
    activeSession = data.session;
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(activeSession));
    renderSession();
    const assessedEntries = entries.filter(item => Number(item.markedCriteria || 0) > 0);
    renderSummary({
      total: entries.length,
      assessed: assessedEntries.length,
      average: assessedEntries.length
        ? assessedEntries.reduce((sum, item) => sum + Number(item.scoreTotal || 0), 0) / assessedEntries.length
        : 0
    });
    showToast(currentlyClosed ? "Session reopened" : "Session closed");
  } catch (error) {
    setStatus(`Could not update session: ${error.message}`, "error");
  } finally {
    els.toggleSessionButton.disabled = false;
  }
}

function gradeClipboardValue(entry) {
  if (!entry || Number(entry.markedCriteria || 0) <= 0) return "0.03";

  const score = Number(entry.scoreTotal);
  if (!Number.isFinite(score)) return "0.03";
  if (score === 0) return "0.02";
  if (Number.isInteger(score)) return String(score);
  return score.toFixed(2);
}

function buildGradesClipboardText() {
  if (!activeSession?.classId) {
    throw new Error("This session has no class assigned.");
  }

  const classes = Array.isArray(window.SPEAKING_CLASS_DATA)
    ? window.SPEAKING_CLASS_DATA
    : [];
  const klass = classes.find(item => item.id === activeSession.classId);

  if (!klass) {
    throw new Error("The class roster for this session could not be found.");
  }

  const entryByStudent = new Map(
    entries.map(item => [Number(item.studentNumber), item])
  );

  return [...klass.students]
    .sort((a, b) => Number(a.n) - Number(b.n))
    .map(student => gradeClipboardValue(entryByStudent.get(Number(student.n))))
    .join("\n");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

async function copyGradesToClipboard() {
  if (!activeSession) {
    showToast("Load a session first");
    return;
  }

  try {
    const text = buildGradesClipboardText();
    await copyText(text);
    const lineCount = text ? text.split("\n").length : 0;
    showToast(`${lineCount} grades copied`);
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not copy grades");
  }
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));
      button.classList.add("active");
      $(button.dataset.tab === "entries" ? "#entriesPanel" : "#rankingPanel").classList.add("active");
    });
  });
}

function init() {
  bindTabs();
  els.loadSessionButton.addEventListener("click", () => loadSession());
  els.refreshButton.addEventListener("click", () => loadSession(activeSession?.sessionId || els.sessionIdInput.value));
  els.toggleSessionButton.addEventListener("click", toggleSessionStatus);
  els.copySessionButton.addEventListener("click", async () => {
    if (!activeSession?.sessionId) return;
    await copyText(activeSession.sessionId);
    showToast("Session ID copied");
  });
  els.copyGradesButton.addEventListener("click", copyGradesToClipboard);
  els.entrySearch.addEventListener("input", renderEntries);
  els.sessionIdInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      loadSession();
    }
  });

  const params = new URLSearchParams(window.location.search);
  const fromUrl = normalizeSessionId(params.get("sessionId"));
  let stored = "";
  try {
    stored = normalizeSessionId(JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY) || "null")?.sessionId);
  } catch {}
  const initial = fromUrl || stored;
  if (initial) {
    els.sessionIdInput.value = initial;
    loadSession(initial);
  }
}

init();
