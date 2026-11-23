const App = window.UEPLVApp;
const config = window.UEPLV_SITE_CONFIG;
const el = id => document.getElementById(id);
const escape = App.escapeHtml;
const examId = new URLSearchParams(location.search).get("exam");
const key = `ueplv-practice:${config.VERSION}:${examId}`;
const main = el("mainContent");
let paper, questions, state, tick;

async function init() {
  if (!/^(a1|a2|b1)-practice-[ab]$/.test(examId || "")) throw new Error("Choose a practice exam from the catalog.");
  const response = await fetch(`content/exams/${examId}.json`);
  if (!response.ok) throw new Error("This practice exam could not be loaded. Try refreshing the page.");
  paper = await response.json();
  questions = paper.parts.flatMap((part, partIndex) => part.questions.map(question => ({ ...question, part, partIndex })));
  const level = config.levels.find(item => item.level === paper.level);
  const title = `${paper.level} Practice${paper.variation === "B" ? " · Variation B" : ""}`;
  document.title = `${title} | Lev Vigotsky`;
  el("startTitle").textContent = title;
  el("startMeta").textContent = `${level.grade} · ${questions.length} questions · ${paper.minutes} minutes`;
  if (paper.level !== "A1") {
    el("groupLabel").hidden = false;
    el("studentGroup").hidden = false;
    el("studentGroup").required = true;
  }
  let saved;
  try { saved = JSON.parse(localStorage.getItem(key)); } catch { /* Storage may be blocked. */ }
  if (saved?.student?.name && saved.answers && saved.id && Number.isFinite(saved.endsAt)) {
    state = saved;
    el("studentName").value = saved.student.name;
    el("studentGroup").value = saved.student.group || "";
    const button = el("continueSavedBtn");
    button.classList.remove("hidden");
    button.textContent = saved.result ? "Open saved results" : "Continue saved practice";
    el("startBtn").textContent = "Start a new attempt";
  }
  el("startBtn").disabled = false;
  App.registerLocalState(key, () => state);
  el("studentForm").addEventListener("submit", event => {
    event.preventDefault();
    const name = el("studentName").value.trim();
    if (!/\p{L}/u.test(name) || /[\p{Cc}\p{Cf}]/u.test(name)) {
      el("startStatus").textContent = "Enter your name.";
      return;
    }
    if (state && !state.result) {
      openDialog("Start a new attempt?", "The saved answers on this device will be replaced.", "Start new attempt", start);
    } else {
      start();
    }
    function start() {
      closeDialog();
      state = {
        id: crypto.randomUUID(),
        student: { name, group: el("studentGroup").value },
        startedAt: Date.now(),
        endsAt: Date.now() + paper.minutes * 60000,
        answers: {}, flags: {}, audio: {}, notes: "", part: 0, current: 0
      };
      save();
      enter();
    }
  });
  el("continueSavedBtn").onclick = enter;
  el("backBtn").onclick = () => jump(state.current - 1);
  el("nextBtn").onclick = () => state.current === questions.length - 1 ? confirmSubmit() : jump(state.current + 1);
  el("flagBtn").onclick = () => {
    const id = questions[state.current].id;
    state.flags[id] = !state.flags[id];
    save();
    renderNav();
  };
  el("menuBtn").onclick = () => setMenu(true);
  el("closeMenuBtn").onclick = () => setMenu(false);
  el("overviewBtn").onclick = () => { setMenu(false); overview(); };
  el("submitMenuBtn").onclick = () => { setMenu(false); confirmSubmit(); };
  el("notesBtn").onclick = () => {
    openDialog("Your notes", "", "Done", closeDialog);
    const notes = document.createElement("textarea");
    notes.rows = 6;
    notes.maxLength = 4000;
    notes.setAttribute("aria-label", "Your notes");
    notes.value = state.notes;
    notes.oninput = () => { state.notes = notes.value; save(); };
    el("dialogBody").append(notes);
  };
  document.addEventListener("keydown", event => {
    if (!state || state.result || state.payload || el("examShell").classList.contains("hidden") ||
        event.target.matches("input, textarea, select, button, audio, a") ||
        !el("modalRoot").classList.contains("hidden") || el("sideMenu").classList.contains("open")) return;
    if (event.key === "ArrowRight") jump(state.current + 1);
    if (event.key === "ArrowLeft") jump(state.current - 1);
  });
}

function save() { App.saveLocalState(key, state); }
function setMenu(open) {
  el("sideMenu").classList.toggle("hidden", !open);
  el("sideMenu").classList.toggle("open", open);
  el("sideMenu").setAttribute("aria-hidden", String(!open));
}
function openDialog(title, message, label, action) {
  const root = el("modalRoot");
  root.innerHTML = `<div class="modal-card">
    <div class="modal-head"><h2>${escape(title)}</h2><button type="button" class="icon-btn" data-close-modal aria-label="Close dialog">×</button></div>
    <div id="dialogBody"><p>${escape(message)}</p></div>
    <button type="button" class="button primary" id="dialogAction">${escape(label)}</button>
  </div>`;
  root.classList.remove("hidden");
  root.setAttribute("aria-hidden", "false");
  root.querySelector("[data-close-modal]").onclick = closeDialog;
  el("dialogAction").onclick = action;
}
function closeDialog() {
  el("modalRoot").classList.add("hidden");
  el("modalRoot").setAttribute("aria-hidden", "true");
}
function overview() {
  const unanswered = questions.filter(q => !state.answers[q.id]?.trim()).length;
  openDialog("Question overview", `${unanswered} unanswered. Choose a question to review it.`, "Done", closeDialog);
  const container = document.createElement("div");
  container.className = "overview-list";
  questions.forEach((question, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button outline";
    button.textContent = `${index + 1} · ${state.answers[question.id]?.trim() ? "Answered" : "Blank"}${state.flags[question.id] ? " · Flagged" : ""}`;
    button.onclick = () => { closeDialog(); jump(index); };
    container.append(button);
  });
  el("dialogBody").append(container);
}
function enter() {
  el("startScreen").classList.add("hidden");
  el("examShell").classList.remove("hidden");
  el("headerStudent").textContent = state.student.name;
  el("headerClass").textContent = `${paper.level} · ${paper.variation === "B" ? "Variation B" : "Practice"}`;
  if (state.result) { renderResult(); return; }
  if (state.payload) { renderPending(); return; }
  renderPart();
  if (state.current !== questions.findIndex(q => q.partIndex === state.part)) revealQuestion(state.current);
  clearInterval(tick);
  tick = setInterval(updateTimer, 500);
  updateTimer();
}
function updateTimer() {
  const seconds = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
  el("timer").textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  if (!seconds && !state.payload && !state.result) {
    closeDialog();
    setMenu(false);
    lockAttempt();
    renderPending("Time is up. Your answers are ready to submit.");
  }
}
function renderNav() {
  const nav = el("bottomNav");
  nav.innerHTML = paper.parts.map((part, index) => `<div class="part-nav-card">
    <button type="button" class="part-label" data-part="${index}" ${state.part === index ? 'aria-current="step"' : ""}>${part.skill === "listening" ? "Listening" : "Reading"} ${paper.parts.slice(0, index + 1).filter(other => other.skill === part.skill).length}</button>
    ${questions.map((q, number) => q.part === part ? `<button type="button" class="q-pill${state.current === number ? " active" : ""}${state.answers[q.id]?.trim() ? " answered" : ""}${state.flags[q.id] ? " flagged" : ""}" data-question="${number}">${number + 1}</button>` : "").join("")}
  </div>`).join("");
  const selected = nav.querySelector(".q-pill.active");
  if (selected) {
    const available = nav.getBoundingClientRect();
    const box = selected.getBoundingClientRect();
    if (box.right > available.right) nav.scrollLeft += box.right - available.right + 6;
    if (box.left < available.left) nav.scrollLeft -= available.left - box.left + 6;
  }
  const flagged = !!state.flags[questions[state.current].id];
  el("flagBtn").classList.toggle("flagged", flagged);
  el("flagBtn").textContent = flagged ? "★" : "☆";
  el("backBtn").disabled = state.current === 0;
  el("nextBtn").textContent = state.current === questions.length - 1 ? "Submit" : "Next";
}
el("bottomNav").onclick = event => {
  const button = event.target.closest("button");
  if (!button || state.payload) return;
  if (button.hasAttribute("data-part")) openPart(Number(button.dataset.part));
  if (button.hasAttribute("data-question")) jump(Number(button.dataset.question));
};

function openPart(index) {
  if (state.part === index) { main.scrollTop = 0; return; }
  state.part = index;
  state.current = questions.findIndex(q => q.partIndex === index);
  save();
  renderPart();
}
function jump(index) {
  if (state.payload || !questions[index]) return;
  const switched = state.part !== questions[index].partIndex;
  state.current = index;
  state.part = questions[index].partIndex;
  save();
  if (switched) renderPart();
  else renderNav();
  revealQuestion(index);
}
function revealQuestion(index) {
  const panel = main.querySelector(`[data-panel="${index}"]`);
  if (panel) main.scrollTop += panel.getBoundingClientRect().top - main.getBoundingClientRect().top - 10;
}

function renderPassage(part, items) {
  if (!part.passage) return null;
  const text = escape(part.passage);
  const marker = /\((\d+)\)\s+_{3,}|\[(\d+)\]/g;
  const markers = [...text.matchAll(marker)];
  const inline = markers.length === items.length && markers.every((match, position) =>
    Number(match[1] || match[2]) === position + 1 && items[position].q.prompt === `Gap ${position + 1}`);
  if (!inline) return { inline: false, html: `<div class="passage">${text}</div>` };
  const sentences = markers[0][2] ? (items[0].q.options || part.options) : null;
  const bank = sentences ? `<ol type="A" class="exam-sentence-bank">${sentences.map(choice => `<li>${escape(choice)}</li>`).join("")}</ol>` : "";
  const completed = text.replace(marker, (_, number, sentenceNumber) => {
    const gap = Number(number || sentenceNumber);
    const { q, index } = items[gap - 1];
    const value = state.answers[q.id] || "";
    const options = q.options || part.options;
    const attributes = `class="exam-inline-gap" data-panel="${index}" data-answer="${index}" aria-label="Gap ${gap}"`;
    if (!options?.length) return `<input ${attributes} type="text" value="${escape(value)}" placeholder="${gap}" maxlength="250" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false">`;
    return `<select ${attributes}><option value="">${gap}</option>${options.map((choice, i) =>
      `<option value="${escape(choice)}"${choice === value ? " selected" : ""}>${sentences ? String.fromCharCode(65 + i) : escape(choice)}</option>`
    ).join("")}</select>`;
  });
  return { inline: true, html: `<div class="passage exam-cloze">${completed}</div>${bank}` };
}

function renderPart() {
  const part = paper.parts[state.part];
  main.querySelector("audio")?.pause();
  const items = questions.flatMap((q, index) => q.part === part ? [{ q, index }] : []);
  const passage = renderPassage(part, items);
  main.innerHTML = `<section class="part-workspace">
    <h2>${escape(part.title)}</h2>
    <p>${escape(part.instructions)}</p>
    ${part.audio ? '<div class="audio-panel"><button type="button" class="button outline" id="playAudio">Play recording</button><audio class="practice-audio" aria-label="Listening recording" preload="metadata" controls></audio><p id="audioStatus" class="status-text" role="status"></p></div>' : ""}
    <div class="part-grid${passage && !passage.inline ? " with-passage" : ""}">${passage?.html || ""}
    ${passage?.inline ? "" : `<div>${items.map(({ q, index }) => renderQuestion(q, index)).join("")}</div>`}
    </div></section>`;
  if (part.audio) bindAudio(part);
  main.scrollTop = 0;
  renderNav();
}
function renderQuestion(q, index) {
  const answer = state.answers[q.id] || "";
  const label = q.prompt || "Answer";
  const options = q.options || q.part.options;
  const context = q.part.id === "r1" && q.context
    ? `<img class="notice-image" width="400" height="258" src="images/part-one/${escape(examId)}-${escape(q.id)}.svg" alt="${escape(q.context)}"><p class="question-context" hidden>${escape(q.context)}</p>`
    : q.context ? `<p class="question-context">${escape(q.context)}</p>` : "";
  const controls = options?.length
    ? options.map(option => `<label class="choice-row radio-row"><input type="radio" name="answer-${index}" data-answer="${index}" value="${escape(option)}" ${answer === option ? "checked" : ""}><span>${escape(option)}</span></label>`).join("")
    : `<input class="gap-input" aria-label="Answer ${index + 1}" type="text" data-answer="${index}" autocomplete="off" maxlength="250" value="${escape(answer)}">`;
  return `<fieldset class="question-panel" data-panel="${index}"><legend>${index + 1}. ${escape(label)}</legend><div class="question-controls">${context}${controls}</div></fieldset>`;
}
main.addEventListener("error", event => {
  if (!event.target.matches(".notice-image")) return;
  event.target.hidden = true;
  event.target.nextElementSibling.hidden = false;
}, true);

main.addEventListener("input", event => {
  if (!event.target.hasAttribute("data-answer") || state.payload) return;
  const index = Number(event.target.dataset.answer);
  state.answers[questions[index].id] = event.target.value;
  state.current = index;
  save();
  renderNav();
});
main.addEventListener("focusin", event => {
  if (!event.target.matches(".exam-inline-gap") || state.payload) return;
  state.current = Number(event.target.dataset.answer);
  save();
  renderNav();
});
function bindAudio(part) {
  const audio = main.querySelector("audio");
  audio.src = part.audio;
  audio.addEventListener("loadedmetadata", () => {
    const savedTime = state.audio[part.id] || 0;
    if (savedTime > 0 && savedTime < audio.duration - 1) audio.currentTime = savedTime;
  }, { once: true });
  let lastSaved = 0;
  const remember = () => {
    state.audio[part.id] = audio.currentTime;
    save();
  };
  audio.addEventListener("timeupdate", () => {
    if (Date.now() - lastSaved < 3000) return;
    lastSaved = Date.now();
    remember();
  });
  audio.addEventListener("pause", remember);
  audio.addEventListener("seeked", remember);
  audio.addEventListener("error", () => {
    const status = el("audioStatus");
    if (status) status.textContent = "The recording could not load. Try Play recording again.";
  });
  const button = el("playAudio");
  button.onclick = async () => {
    button.disabled = true;
    const status = el("audioStatus");
    status.textContent = "";
    try {
      if (audio.error) audio.load();
      await App.playExamAudio(audio);
    } catch {
      status.textContent = "The recording did not start. Check your connection and try again.";
    } finally { button.disabled = false; }
  };
}
function confirmSubmit() {
  const blank = questions.filter(q => !state.answers[q.id]?.trim()).length;
  openDialog("Submit your practice?", blank ? `${blank} questions are blank. You can go back or submit these answers.` : "Submit to see your score and review your answers.", "Submit answers", () => {
    closeDialog();
    lockAttempt();
    renderPending();
    sendAttempt();
  });
}
function lockAttempt() {
  clearInterval(tick);
  main.querySelector("audio")?.pause();
  state.payload = {
    attemptId: state.id, examId, keyVersion: config.VERSION,
    studentName: state.student.name, group: state.student.group,
    answers: { ...state.answers },
    durationSeconds: Math.min(paper.minutes * 60, Math.max(0, Math.round((Date.now() - state.startedAt) / 1000)))
  };
  save();
}
function hideControls() {
  for (const id of ["menuBtn", "flagBtn", "notesBtn", "timer"]) el(id).hidden = true;
  document.querySelector(".player-footer").hidden = true;
}
function renderPending(message = "Your answers are ready. Submit to see your results.") {
  hideControls();
  main.innerHTML = `<section class="attempt-result"><h2>Submission</h2><p>${escape(message)}</p>
    <button class="button primary" id="sendAttempt" type="button">Submit answers</button>
    <p id="submitStatus" role="status"></p></section>`;
  main.scrollTop = 0;
  el("sendAttempt").onclick = sendAttempt;
}
async function sendAttempt() {
  const button = el("sendAttempt");
  const status = el("submitStatus");
  if (button.disabled) return;
  if (!config.API_BASE_URL) { status.textContent = "The submission service is unavailable."; return; }
  button.disabled = true;
  status.textContent = "Sending answers…";
  try {
    const response = await fetch(App.buildApiUrl("submit"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.payload),
      signal: AbortSignal.timeout ? AbortSignal.timeout(18000) : undefined
    });
    const result = await response.json();
    if (!response.ok || result.attemptId !== state.id || !Array.isArray(result.items)) {
      throw new Error(result.message || result.error || "Submission was not confirmed.");
    }
    state.result = result;
    save();
    renderResult();
  } catch (error) {
    status.textContent = `${error.message || "Submission was not confirmed."} Your answers are still saved. Try again.`;
    button.textContent = "Retry submission";
    button.disabled = false;
  }
}
function renderResult() {
  hideControls();
  const result = state.result;
  const sections = result.sections.map(section => `${section.id === "reading" ? "Reading" : "Listening"} ${section.score}/${section.maxScore}`).join(" · ");
  main.innerHTML = `<section class="attempt-result"><h2>Practice results</h2>
    <p class="scoreline">${escape(result.score)} / ${escape(result.maxScore)}</p>
    <p>${escape(sections)}</p><p>Receipt ${escape(result.attemptId)}</p>
    <div class="actions"><button class="button outline" type="button" id="downloadDetailsPngBtn">Download PNG</button><button class="button outline" type="button" id="clearAttempt">Clear from this device</button><a class="button primary" href="./">Return to practice</a></div>
    <div id="detailsContent" class="review-list"><h3>Answer review</h3><p>${escape(state.student.name)} · ${escape(examId)} · ${result.score} / ${result.maxScore} · Key ${escape(result.keyVersion)}</p><p>${escape(sections)}</p>${result.items.map(item => {
      const question = questions.find(q => q.id === item.id);
      const number = questions.indexOf(question) + 1;
      return `<details><summary>${number}. ${escape(question?.prompt || item.id)} · ${item.correct ? "Correct" : "Review"}</summary>
        ${question?.context ? `<p>${escape(question.context)}</p>` : ""}
        <p>Your answer: ${escape(item.studentAnswer || "—")}</p>
        <p>Correct answer: ${escape(item.correctAnswers.join(" / "))}</p>
        ${question?.explanation ? `<p>${escape(question.explanation)}</p>` : ""}</details>`;
    }).join("")}${paper.parts.filter(part => part.transcript).map(part => `<details><summary>Transcript · ${escape(part.title)}</summary><p>${escape(part.transcript)}</p></details>`).join("")}</div>
  </section>`;
  el("clearAttempt").onclick = () => { App.clearLocalState(key); location.reload(); };
  el("downloadDetailsPngBtn").onclick = () => window.UEPLVResultsPng?.download(el("downloadDetailsPngBtn"), true);
  main.scrollTop = 0;
  main.focus({ preventScroll: true });
}

init().catch(error => { el("startMeta").textContent = ""; el("startStatus").textContent = error.message; });
