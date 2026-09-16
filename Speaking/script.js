/* Speaking Report Maker - offline, mobile-focused static app */
const CLASS_DATA = window.SPEAKING_CLASS_DATA || [];

const RUBRIC = [
  {
    id: "englishOnly",
    title: "1. Comunicación solo en inglés",
    max: 1.5,
    options: [
      { label: "Excelente", points: 1.5, description: "Usa inglés durante toda la actividad. No usa español." },
      { label: "Bueno", points: 1.0, description: "Usa inglés casi todo el tiempo. Puede aparecer una palabra aislada en español." },
      { label: "Básico", points: 0.5, description: "Usa varias palabras en español. El mensaje depende parcialmente del español." },
      { label: "En proceso", points: 0, description: "Usa español frecuentemente o responde mayormente en español." }
    ]
  },
  {
    id: "spontaneous",
    title: "2. Sin lectura / producción espontánea",
    max: 1.5,
    options: [
      { label: "Excelente", points: 1.5, description: "Habla a partir de ideas. No lee. Solo usa palabras clave si fueron autorizadas." },
      { label: "Bueno", points: 1.0, description: "Habla mayormente de forma independiente. Puede mirar palabras clave, pero no lee oraciones completas." },
      { label: "Básico", points: 0.5, description: "Lee partes de la respuesta o depende mucho de sus notas." },
      { label: "En proceso", points: 0, description: "Lee un guion completo, usa celular/traductor o no puede continuar sin leer." }
    ]
  },
  {
    id: "taskCoverage",
    title: "3. Cobertura completa de preguntas y tarea",
    max: 2,
    options: [
      { label: "Excelente", points: 2.0, description: "Responde todo de forma completa, con detalles, razones, ejemplos y seguimiento." },
      { label: "Bueno", points: 1.5, description: "Responde la mayoría. Faltan detalles menores. Responde la pregunta de seguimiento." },
      { label: "Básico", points: 1.0, description: "Responde solo algunas preguntas. Faltan detalles importantes. El seguimiento es breve." },
      { label: "En proceso", points: 0.5, description: "Da respuestas muy limitadas y no cubre las partes principales de la tarea." }
    ]
  },
  {
    id: "time",
    title: "4. Tiempo de intervención",
    max: 1,
    options: [
      { label: "Excelente", points: 1.0, description: "Habla durante el tiempo estipulado y finaliza con claridad." },
      { label: "Bueno", points: 0.75, description: "Habla un poco menos o más de lo esperado, pero la respuesta está mayormente completa." },
      { label: "Básico", points: 0.5, description: "La intervención es muy corta o muy extensa. El tiempo afecta la claridad." },
      { label: "En proceso", points: 0.25, description: "Se detiene muy pronto, necesita reiniciar varias veces o no cumple el tiempo." }
    ]
  },
  {
    id: "languageTarget",
    title: "5. Vocabulario y gramática de la unidad/clase",
    max: 1.5,
    options: [
      { label: "Excelente", points: 1.5, description: "Usa vocabulario y gramática objetivo con suficiente precisión para comunicarse claramente." },
      { label: "Bueno", points: 1.0, description: "Usa parte del lenguaje objetivo. Hay errores, pero el mensaje sigue claro." },
      { label: "Básico", points: 0.5, description: "Usa lenguaje objetivo limitado. Los errores hacen el mensaje poco claro por momentos." },
      { label: "En proceso", points: 0, description: "Muestra poco o ningún uso del vocabulario/gramática objetivo." }
    ]
  },
  {
    id: "fluency",
    title: "6. Fluidez, pronunciación e inteligibilidad",
    max: 1,
    options: [
      { label: "Excelente", points: 1.0, description: "Discurso claro, con pausas naturales. La pronunciación no impide comprensión." },
      { label: "Bueno", points: 0.75, description: "Generalmente comprensible, con algunas pausas o dificultades de pronunciación." },
      { label: "Básico", points: 0.5, description: "Difícil de seguir por momentos por pausas largas, pronunciación poco clara o discurso fragmentado." },
      { label: "En proceso", points: 0.25, description: "Muy difícil de comprender; usa palabras aisladas o se bloquea varias veces." }
    ]
  },
  {
    id: "respectfulListening",
    title: "7. Escucha respetuosa y sin interrupciones",
    max: 1.5,
    options: [
      { label: "Excelente", points: 1.5, description: "Escucha con respeto. No interrumpe ni distrae la clase." },
      { label: "Bueno", points: 1.0, description: "Una interrupción o distracción." },
      { label: "Básico", points: 0.5, description: "Dos interrupciones o distracciones." },
      { label: "En proceso", points: 0, description: "Tres o más interrupciones, o una conducta irrespetuosa que afecta la clase." }
    ]
  }
];


const STORAGE_KEY = "lv-speaking-reports-v1";

/*
  Wix Velo production endpoints for shared Speaking sessions.
*/
const SPEAKING_WIX_BASE = "https://chiispiitas.wixsite.com/lev-grading";
const SPEAKING_SESSION_ENDPOINT = `${SPEAKING_WIX_BASE}/_functions/speakingSession`;
const SPEAKING_SUBMISSION_ENDPOINT = `${SPEAKING_WIX_BASE}/_functions/speakingSubmission`;

const REGULAR_ACTIVITY = "Regular grading";
const REGULAR_CHECKLIST_ACTIVITY = "Regular grading · Checklist"; // legacy
const REGULAR_NUMBER_ACTIVITY = "Regular grading · Number"; // legacy
const PARTICIPATION_ACTIVITY = "Participation";
const PARTICIPATION_CONFIG_STUDENT = 0;

let currentAppMode = null;
let regularGrades = new Map();
const regularPublishTimers = new Map();
let participationTallies = new Map();
let participationThreshold = 5;
let participationTouched = new Set();
const participationPublishTimers = new Map();

const state = {
  classId: null,
  studentNumber: null,
  scores: {},
  comment: "",
  activity: "Oral speaking assessment"
};

const $ = (selector) => document.querySelector(selector);
const modeScreen = $("#modeScreen");
const classScreen = $("#classScreen");
const assessmentScreen = $("#assessmentScreen");
const regularAssessmentScreen = $("#regularAssessmentScreen");
const participationAssessmentScreen = $("#participationAssessmentScreen");
const classGrid = $("#classGrid");
const assessmentTitle = $("#assessmentTitle");
const classMeta = $("#classMeta");
const studentCount = $("#studentCount");
const studentSearch = $("#studentSearch");
const studentSelect = $("#studentSelect");
const activityInput = $("#activityInput");
const rubricList = $("#rubricList");
const scoreValue = $("#scoreValue");
const scoreStatus = $("#scoreStatus");
const scoreRing = $("#scoreRing");
const reportPreview = $("#reportPreview");
const teacherComment = $("#teacherComment");
const toast = $("#toast");

function init() {
  renderRubric();
  bindEvents();
  initSharedSessions();
  updatePreview();
}

function bindEvents() {
  $("#backToClasses").addEventListener("click", showClassScreen);
  $("#backRegularToSession")?.addEventListener("click", showClassScreen);
  $("#backParticipationToSession")?.addEventListener("click", showClassScreen);
  $("#markExcellent").addEventListener("click", markAllExcellent);
  $("#refreshPreview").addEventListener("click", () => { updatePreview(); showToast("Preview refreshed"); });

  activityInput.addEventListener("input", () => {
    state.activity = activityInput.value.trim() || "Oral speaking assessment";
    updatePreview();
    saveStudentDraft();
    queueAutoPublishCurrentStudent();
  });
  teacherComment.addEventListener("input", () => {
    state.comment = teacherComment.value.trim();
    updatePreview();
    saveStudentDraft();
    queueAutoPublishCurrentStudent();
  });
  $("#previousStudent").addEventListener("click", () => moveStudent(-1));
  $("#nextStudent").addEventListener("click", () => moveStudent(1));
  $("#resetCurrent").addEventListener("click", () => {
    clearAssessment(true);
    updatePreview();
    saveStudentDraft();
    queueAutoPublishCurrentStudent();
    showToast("Current student reset");
  });
  studentSearch.addEventListener("input", () => {
    renderStudentOptions({ preserveSelection: true });
  });
  studentSearch.addEventListener("change", () => {
    lockStudentFromSearch({ allowUnique: true, silent: false });
  });
  studentSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      lockStudentFromSearch({ allowUnique: true, silent: false });
    }
  });
  studentSelect.addEventListener("change", () => {
    const value = Number(studentSelect.value);
    if (!Number.isFinite(value)) return;
    selectStudentNumber(value, { clearSearch: true });
  });
}

function getSelectedClass() {
  return CLASS_DATA.find(item => item.id === state.classId) || null;
}

function getSelectedStudent() {
  const klass = getSelectedClass();
  if (!klass) return null;
  if (state.studentNumber == null) return klass.students[0] || null;
  return klass.students.find(student => student.n === state.studentNumber) || null;
}

function renderClasses() {
  classGrid.innerHTML = "";
  CLASS_DATA.forEach((klass) => {
    const doneCount = countAssessedInClass(klass);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "class-card";
    button.innerHTML = `
      <h3>${escapeHtml(klass.label)}</h3>
      <p>${escapeHtml(klass.specialty)} · Paralelo ${escapeHtml(klass.section)}</p>
      <span class="class-badge">${doneCount}/${klass.students.length} graded</span>
    `;
    button.addEventListener("click", () => selectClass(klass.id));
    classGrid.appendChild(button);
  });
}

function selectClass(classId, { studentNumber = null, updateRoute = true } = {}) {
  if (!activeSpeakingSession || activeSpeakingSession.classId !== classId || sessionAppMode(activeSpeakingSession) !== "speaking") {
    showToast("Create or join a session for this class first");
    return;
  }
  state.classId = classId;
  const klass = getSelectedClass();
  if (!klass) return;

  assessmentTitle.textContent = klass.label;
  classMeta.textContent = `${klass.course} · Tutor(a): ${klass.tutor}`;
  studentCount.textContent = `${klass.students.length} students`;
  state.studentNumber = klass.students[0]?.n || null;
  studentSearch.value = "";
  renderStudentOptions();
  clearAssessment(false);
  if (studentNumber != null) {
    selectStudentNumber(studentNumber, { clearSearch: true, updateRoute: false });
  }

  currentAppMode = "speaking";
  modeScreen?.classList.remove("screen-active");
  classScreen.classList.remove("screen-active");
  regularAssessmentScreen?.classList.remove("screen-active");
  participationAssessmentScreen?.classList.remove("screen-active");
  assessmentScreen.classList.add("screen-active");
  window.scrollTo({ top: 0, behavior: "smooth" });
  updatePreview();
  refreshSharedSessionUI();
  if (updateRoute) {
    writeAppRoute({
      mode: "speaking",
      view: "grade",
      sessionId: activeSpeakingSession?.sessionId || "",
      studentNumber: state.studentNumber
    });
  }
}

function showClassScreen() {
  if (assessmentScreen?.classList.contains("screen-active")) saveStudentDraft();
  assessmentScreen?.classList.remove("screen-active");
  regularAssessmentScreen?.classList.remove("screen-active");
  participationAssessmentScreen?.classList.remove("screen-active");
  modeScreen?.classList.remove("screen-active");
  classScreen.classList.add("screen-active");
  refreshSessionModeUI();
  refreshSharedSessionUI();
  if (currentAppMode !== "participation") loadAvailableSpeakingSessions();
  writeAppRoute({
    mode: currentAppMode,
    view: "session",
    sessionId: activeSpeakingSession && sessionAppMode(activeSpeakingSession) === currentAppMode
      ? activeSpeakingSession.sessionId
      : ""
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getStudentsMatchingSearch(klass, rawQuery = studentSearch.value) {
  const query = normalize(rawQuery);
  if (!klass) return [];
  if (!query) return klass.students;
  return klass.students.filter(student =>
    normalize(student.name).includes(query) || String(student.n).includes(query)
  );
}

function findExactStudentFromSearch(klass, rawQuery = studentSearch.value) {
  const query = normalize(rawQuery);
  if (!klass || !query) return null;

  const numberPrefix = query.match(/^(\d+)(?:\.|\s|$)/);
  if (numberPrefix) {
    const exactNumber = klass.students.find(student => String(student.n) === numberPrefix[1]);
    if (exactNumber) return exactNumber;
  }

  return klass.students.find(student => normalize(student.name) === query) || null;
}

function renderStudentOptions({ preserveSelection = true } = {}) {
  const klass = getSelectedClass();
  if (!klass) return;

  const query = normalize(studentSearch.value);
  const currentStudent = klass.students.find(student => student.n === state.studentNumber) || klass.students[0] || null;

  if (!currentStudent) {
    studentSelect.innerHTML = "";
    state.studentNumber = null;
    return;
  }

  if (!klass.students.some(student => student.n === state.studentNumber)) {
    state.studentNumber = currentStudent.n;
  }

  const filtered = getStudentsMatchingSearch(klass);
  const studentsToShow = query ? filtered : klass.students;
  const currentInList = studentsToShow.some(student => student.n === state.studentNumber);

  studentSelect.innerHTML = "";

  if (preserveSelection && query && !currentInList) {
    const currentOption = document.createElement("option");
    currentOption.value = String(state.studentNumber);
    currentOption.textContent = `Current: ${currentStudent.n}. ${currentStudent.name}`;
    studentSelect.appendChild(currentOption);
  }

  studentsToShow.forEach(student => {
    const option = document.createElement("option");
    option.value = String(student.n);
    option.textContent = `${student.n}. ${student.name}`;
    studentSelect.appendChild(option);
  });

  studentSelect.value = String(state.studentNumber);
}

function selectStudentNumber(studentNumber, { clearSearch = false, showMessage = false, updateRoute = true } = {}) {
  const klass = getSelectedClass();
  if (!klass) return false;

  const nextStudent = klass.students.find(student => student.n === Number(studentNumber));
  if (!nextStudent) return false;

  const previousStudentNumber = state.studentNumber;
  if (previousStudentNumber !== nextStudent.n) {
    saveStudentDraft();
    state.studentNumber = nextStudent.n;
    loadStudentDraft();
  }

  if (clearSearch) studentSearch.value = "";
  renderStudentOptions({ preserveSelection: true });
  studentSelect.value = String(nextStudent.n);
  updatePreview();

  if (updateRoute && currentAppMode === "speaking" && assessmentScreen?.classList.contains("screen-active")) {
    writeAppRoute({
      mode: "speaking",
      view: "grade",
      sessionId: activeSpeakingSession?.sessionId || "",
      studentNumber: nextStudent.n
    });
  }

  if (showMessage) showToast(`Student locked: ${nextStudent.n}. ${nextStudent.name}`);
  return true;
}

function lockStudentFromSearch({ allowUnique = false, silent = false } = {}) {
  const klass = getSelectedClass();
  if (!klass) return false;

  const query = normalize(studentSearch.value);
  if (!query) {
    renderStudentOptions({ preserveSelection: true });
    return false;
  }

  const exact = findExactStudentFromSearch(klass);
  const matches = getStudentsMatchingSearch(klass);
  const match = exact || (allowUnique && matches.length === 1 ? matches[0] : null);

  if (!match) {
    renderStudentOptions({ preserveSelection: true });
    if (!silent && matches.length > 1) showToast("Choose the exact student from the list");
    if (!silent && !matches.length) showToast("No exact student found");
    return false;
  }

  return selectStudentNumber(match.n, { clearSearch: true, showMessage: !silent });
}

function moveStudent(direction) {
  const klass = getSelectedClass();
  if (!klass || !klass.students.length) return;
  saveStudentDraft();
  const currentIndex = klass.students.findIndex(student => student.n === state.studentNumber);
  const nextIndex = (currentIndex + direction + klass.students.length) % klass.students.length;
  state.studentNumber = klass.students[nextIndex].n;
  studentSearch.value = "";
  renderStudentOptions();
  studentSelect.value = String(state.studentNumber);
  loadStudentDraft();
  updatePreview();
  writeAppRoute({
    mode: "speaking",
    view: "grade",
    sessionId: activeSpeakingSession?.sessionId || "",
    studentNumber: state.studentNumber
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderRubric() {
  rubricList.innerHTML = "";
  RUBRIC.forEach((criterion) => {
    const card = document.createElement("article");
    card.className = "rubric-card";
    const header = document.createElement("div");
    header.className = "rubric-card-header";
    header.innerHTML = `<h4>${escapeHtml(criterion.title)}</h4><span class="max-pill">Max ${formatScore(criterion.max)}</span>`;

    const options = document.createElement("div");
    options.className = "option-grid";
    criterion.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option-button";
      button.dataset.criterion = criterion.id;
      button.dataset.points = String(option.points);
      button.dataset.index = String(index);
      button.innerHTML = `
        <span class="option-text">
          <span class="option-label"><span>${escapeHtml(option.label)}</span><span class="points-pill">${formatScore(option.points)}</span></span>
          <span class="option-description">${escapeHtml(option.description)}</span>
        </span>
      `;
      button.addEventListener("click", () => selectRubricOption(criterion.id, index));
      options.appendChild(button);
    });

    card.append(header, options);
    rubricList.appendChild(card);
  });
}

function selectRubricOption(criterionId, optionIndex) {
  const criterion = RUBRIC.find(item => item.id === criterionId);
  if (!criterion || !criterion.options[optionIndex]) return;
  state.scores[criterionId] = { optionIndex, points: criterion.options[optionIndex].points };
  updateRubricSelection();
  updateScore();
  updatePreview();
  saveStudentDraft();
  queueAutoPublishCurrentStudent();
}

function updateRubricSelection() {
  document.querySelectorAll(".option-button").forEach(button => {
    const criterionId = button.dataset.criterion;
    const selected = state.scores[criterionId];
    button.classList.toggle("selected", Boolean(selected && Number(button.dataset.index) === selected.optionIndex));
  });
}

function updateScore() {
  const marked = Object.keys(state.scores).length;
  if (marked === 0) {
    scoreValue.textContent = "— / 10";
    scoreStatus.textContent = "No criteria marked";
    scoreRing.textContent = "—";
    scoreRing.style.background = "rgba(255,255,255,.23)";
    return;
  }

  const total = getTotalScore();
  const percentage = Math.round((total / 10) * 100);
  scoreValue.textContent = `${formatScore(total)} / 10`;
  scoreStatus.textContent = marked === RUBRIC.length ? "All criteria marked" : `${marked} of ${RUBRIC.length} criteria marked`;
  scoreRing.textContent = `${percentage}%`;
  scoreRing.style.background = `conic-gradient(var(--yellow) ${percentage * 3.6}deg, rgba(255,255,255,.23) 0deg)`;
}

function getTotalScore() {
  const total = Object.values(state.scores).reduce((sum, item) => sum + Number(item.points || 0), 0);
  return Math.round(total * 100) / 100;
}

function markAllExcellent() {
  RUBRIC.forEach(criterion => {
    state.scores[criterion.id] = { optionIndex: 0, points: criterion.options[0].points };
  });
  updateRubricSelection();
  updateScore();
  updatePreview();
  saveStudentDraft();
  queueAutoPublishCurrentStudent();
  showToast("All criteria marked as excellent");
}

function clearAssessment(keepStudent = true) {
  state.scores = {};
  state.comment = "";
  state.activity = activityInput.value.trim() || "Oral speaking assessment";
  teacherComment.value = "";
  updateRubricSelection();
  updateScore();
  if (!keepStudent) loadStudentDraft();
}

function getReportObject() {
  const klass = getSelectedClass();
  const student = getSelectedStudent();
  const now = new Date();
  const total = getTotalScore();
  const rows = RUBRIC.map((criterion) => {
    const selected = state.scores[criterion.id];
    const option = selected ? criterion.options[selected.optionIndex] : null;
    return {
      criterion: criterion.title,
      max: criterion.max,
      level: option ? option.label : "Not marked",
      points: selected ? selected.points : null,
      observation: option ? option.description : ""
    };
  });

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now.toISOString(),
    date: formatDateTime(now),
    classId: klass?.id || "",
    classLabel: klass?.label || "No class selected",
    course: klass?.course || "",
    section: klass?.section || "",
    specialty: klass?.specialty || "",
    tutor: klass?.tutor || "",
    studentNumber: student?.n || "",
    studentName: student?.name || "No student selected",
    activity: state.activity || "Oral speaking assessment",
    total,
    rows,
    comment: state.comment || ""
  };
}

function buildReportText(report = getReportObject()) {
  const marked = report.rows.filter(row => row.level !== "Not marked").length;
  const rubricText = report.rows.map(row =>
    `${row.criterion}
   Level: ${row.level} · Points: ${formatScore(row.points)}/${formatScore(row.max)}`
  ).join("\n");

  return [
    "SPEAKING PERFORMANCE REPORT",
    "UNIDAD EDUCATIVA PARTICULAR LEV VIGOTSKY",
    "",
    `Class: ${report.classLabel}`,
    `Student: #${report.studentNumber} - ${report.studentName}`,
    `Activity: ${report.activity}`,
    `Date: ${report.date}`,
    `Score: ${formatScore(report.total)} / 10`,
    `Rubric status: ${marked}/${RUBRIC.length} criteria marked`,
    "",
    "RUBRIC DETAILS",
    rubricText,
    "",
    "TEACHER COMMENT",
    report.comment || "No additional comment.",
    "",
    "Teacher: Mr. David Santana"
  ].join("\n");
}

function updatePreview() {
  reportPreview.textContent = buildReportText();
  updateScore();
}

function loadReports() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch (error) {
    return [];
  }
}


function getStudentDraftKey(classId, studentNumber, sessionId = activeSpeakingSession?.sessionId) {
  if (!sessionId) return "";
  return `lv-speaking-draft-${sessionId}-${classId}-${studentNumber}`;
}

function saveStudentDraft() {
  const klass = getSelectedClass();
  const student = getSelectedStudent();
  const key = klass && student ? getStudentDraftKey(klass.id, student.n) : "";
  if (!key) return;

  localStorage.setItem(key, JSON.stringify({
    scores: state.scores,
    comment: state.comment,
    activity: state.activity,
    updatedAt: new Date().toISOString()
  }));
}

function loadStudentDraft() {
  const klass = getSelectedClass();
  const student = getSelectedStudent();
  const key = klass && student ? getStudentDraftKey(klass.id, student.n) : "";
  if (!key) {
    state.scores = {};
    state.comment = "";
    teacherComment.value = "";
    updateRubricSelection();
    updateScore();
    return;
  }

  let draft = null;
  try { draft = JSON.parse(localStorage.getItem(key) || "null"); } catch (error) { draft = null; }

  state.scores = draft?.scores || {};
  state.comment = draft?.comment || "";
  state.activity = draft?.activity || activeSpeakingSession?.activity || "Oral speaking assessment";
  activityInput.value = state.activity;
  teacherComment.value = state.comment;
  updateRubricSelection();
  updateScore();
}

const RUBRIC_SHORT = [
  "English only",
  "No reading",
  "Task coverage",
  "Time",
  "Vocabulary / grammar",
  "Fluency / pronunciation",
  "Respectful listening"
];

function getDraftForStudent(classId, studentNumber) {
  const key = getStudentDraftKey(classId, studentNumber);
  if (!key) return null;
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch (error) {
    return null;
  }
}

function hasDraftData(draft) {
  if (!draft) return false;
  const scoreCount = Object.keys(draft.scores || {}).length;
  const comment = String(draft.comment || "").trim();
  return scoreCount > 0 || comment.length > 0;
}

function buildLatestSavedMap(reports = loadReports()) {
  const map = new Map();
  reports.forEach(report => {
    const key = `${report.classId}|${report.studentNumber}`;
    if (!map.has(key)) map.set(key, report);
  });
  return map;
}

function buildReportFromDraft(klass, student, draft) {
  const rows = RUBRIC.map((criterion) => {
    const selected = draft?.scores?.[criterion.id];
    const option = Number.isInteger(selected?.optionIndex) ? criterion.options[selected.optionIndex] : null;
    return {
      criterion: criterion.title,
      max: criterion.max,
      level: option ? option.label : "Not marked",
      points: option ? option.points : null,
      observation: option ? option.description : ""
    };
  });
  const total = rows.reduce((sum, row) => sum + Number(row.points || 0), 0);
  const updatedAt = draft?.updatedAt || new Date().toISOString();
  return {
    id: `draft-${klass.id}-${student.n}`,
    createdAt: updatedAt,
    date: safeDateLabel(updatedAt),
    classId: klass.id,
    classLabel: klass.label,
    course: klass.course,
    section: klass.section,
    specialty: klass.specialty,
    tutor: klass.tutor,
    studentNumber: student.n,
    studentName: student.name,
    activity: draft?.activity || "Oral speaking assessment",
    total: Math.round(total * 100) / 100,
    rows,
    comment: draft?.comment || "",
    text: ""
  };
}

function getMarkedCount(report) {
  return (report?.rows || []).filter(row => row.level !== "Not marked").length;
}

function countAssessedInClass(klass) {
  const latestSaved = buildLatestSavedMap(loadReports().filter(report => report.classId === klass.id));
  return klass.students.reduce((count, student) => {
    const draft = getDraftForStudent(klass.id, student.n);
    const saved = latestSaved.get(`${klass.id}|${student.n}`);
    const report = hasDraftData(draft) ? buildReportFromDraft(klass, student, draft) : saved;
    return count + (getMarkedCount(report) > 0 ? 1 : 0);
  }, 0);
}

function getClassExportRows() {
  const klass = getSelectedClass();
  if (!klass) return [];
  saveStudentDraft();
  const latestSaved = buildLatestSavedMap(loadReports().filter(report => report.classId === klass.id));
  return klass.students.map(student => {
    const draft = getDraftForStudent(klass.id, student.n);
    const saved = latestSaved.get(`${klass.id}|${student.n}`);
    const report = hasDraftData(draft) ? buildReportFromDraft(klass, student, draft) : saved || null;
    const marked = getMarkedCount(report);
    return {
      klass,
      student,
      report,
      marked,
      status: marked > 0 ? "Assessed" : "Pending"
    };
  });
}

function getLatestSavedRows() {
  const latestSaved = buildLatestSavedMap(loadReports());
  return Array.from(latestSaved.values()).map(report => {
    const klass = CLASS_DATA.find(item => item.id === report.classId) || {
      id: report.classId,
      label: report.classLabel,
      course: report.course,
      section: report.section,
      specialty: report.specialty,
      tutor: report.tutor,
      students: []
    };
    const student = { n: report.studentNumber, name: report.studentName };
    const marked = getMarkedCount(report);
    return { klass, student, report, marked, status: marked > 0 ? "Assessed" : "Pending" };
  });
}

function buildGradeCsv(rows) {
  const header = [
    "Class", "Course", "Section", "Student Number", "Student", "Status", "Activity", "Date", "Total /10", "Marked Criteria",
    ...RUBRIC.flatMap(criterion => [criterion.title + " Level", criterion.title + " Points"]),
    "Teacher Comment"
  ];

  const body = rows.map(({ klass, student, report, status, marked }) => {
    const rowMap = Object.fromEntries((report?.rows || []).map(row => [row.criterion, row]));
    return [
      klass?.label || report?.classLabel || "",
      klass?.course || report?.course || "",
      klass?.section || report?.section || "",
      student?.n || report?.studentNumber || "",
      student?.name || report?.studentName || "",
      status,
      report?.activity || "",
      report?.date || "",
      status === "Assessed" ? formatScore(report?.total || 0) : "",
      marked || 0,
      ...RUBRIC.flatMap(criterion => [
        rowMap[criterion.title]?.level || "",
        rowMap[criterion.title] ? formatScore(rowMap[criterion.title].points || 0) : ""
      ]),
      report?.comment || ""
    ];
  });

  return [header, ...body].map(row => row.map(csvCell).join(";")).join("\n");
}

function getRowsStats(rows) {
  const assessedRows = rows.filter(row => row.status === "Assessed");
  const scores = assessedRows.map(row => Number(row.report?.total || 0));
  const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  return {
    total: rows.length,
    assessed: assessedRows.length,
    pending: rows.length - assessedRows.length,
    average: Math.round(average * 100) / 100
  };
}

function exportClassCsv() {
  const klass = getSelectedClass();
  if (!klass) { showToast("Select a class first"); return; }
  const rows = getClassExportRows();
  const csv = buildGradeCsv(rows);
  downloadBlob("﻿" + csv, `${safeFilename(klass.label)}-speaking-grades-${dateForFilename()}.csv`, "text/csv;charset=utf-8");
  showToast("Class CSV exported");
}

function exportAllCsv() {
  const rows = getLatestSavedRows();
  if (!rows.length) { showToast("No saved grades to export"); return; }
  const csv = buildGradeCsv(rows);
  downloadBlob("﻿" + csv, `all-speaking-grades-${dateForFilename()}.csv`, "text/csv;charset=utf-8");
  showToast("All saved grades exported as CSV");
}

function exportClassPdf() {
  const klass = getSelectedClass();
  if (!klass) { showToast("Select a class first"); return; }
  const rows = getClassExportRows();
  const html = buildPrintableGradeHtml(rows, {
    title: "Speaking Performance Grade Report",
    subtitle: `${klass.label} · ${klass.course} · Paralelo ${klass.section}`,
    includePending: true
  });
  openPrintableReport(html, `${safeFilename(klass.label)}-speaking-grades-${dateForFilename()}.html`);
}

function exportAllPdf() {
  const rows = getLatestSavedRows();
  if (!rows.length) { showToast("No saved grades to export"); return; }
  const html = buildPrintableGradeHtml(rows, {
    title: "Speaking Performance Grade Report",
    subtitle: "Latest saved speaking grades from this device",
    includePending: false
  });
  openPrintableReport(html, `all-speaking-grades-${dateForFilename()}.html`);
}

function buildPrintableGradeHtml(rows, options = {}) {
  const title = options.title || "Speaking Performance Grade Report";
  const subtitle = options.subtitle || "";
  const stats = getRowsStats(rows);
  const generated = formatDateTime(new Date());
  const grouped = rows.reduce((map, row) => {
    const key = row.klass?.label || row.report?.classLabel || "Class";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
    return map;
  }, new Map());

  const summaryCards = `
    <section class="summary-grid">
      <div><span>Total students</span><strong>${stats.total}</strong></div>
      <div><span>Assessed</span><strong>${stats.assessed}</strong></div>
      <div><span>Pending</span><strong>${stats.pending}</strong></div>
      <div><span>Average</span><strong>${stats.assessed ? `${formatScore(stats.average)} / 10` : "N/A"}</strong></div>
    </section>
  `;

  const classSections = Array.from(grouped.entries()).map(([classLabel, classRows]) => {
    const first = classRows[0] || {};
    const klass = first.klass || {};
    const mainRows = classRows.map(({ student, report, status, marked }) => `
      <tr class="${status === "Assessed" ? "" : "pending"}">
        <td class="num">${escapeHtml(student?.n || report?.studentNumber || "")}</td>
        <td><strong>${escapeHtml(student?.name || report?.studentName || "")}</strong></td>
        <td class="score">${status === "Assessed" ? escapeHtml(formatScore(report?.total || 0)) : "-"}</td>
        <td>${escapeHtml(status)}</td>
        <td>${escapeHtml(marked || 0)}/${RUBRIC.length}</td>
        <td>${escapeHtml(report?.activity || "")}</td>
        <td>${escapeHtml(report?.comment || "")}</td>
      </tr>
    `).join("");

    const detailRows = classRows.filter(row => row.status === "Assessed").map(({ student, report }) => {
      const rowMap = Object.fromEntries((report?.rows || []).map(row => [row.criterion, row]));
      const cells = RUBRIC.map((criterion, index) => {
        const row = rowMap[criterion.title];
        return `<td>${row ? `${escapeHtml(row.level)}<br><b>${escapeHtml(formatScore(row.points))}/${escapeHtml(formatScore(row.max))}</b>` : "-"}</td>`;
      }).join("");
      return `
        <tr>
          <td class="num">${escapeHtml(student?.n || "")}</td>
          <td><strong>${escapeHtml(student?.name || "")}</strong></td>
          ${cells}
        </tr>
      `;
    }).join("");

    return `
      <section class="class-section">
        <h2>${escapeHtml(classLabel)}</h2>
        <p class="class-meta">${escapeHtml(klass.course || "")} ${klass.section ? `· Paralelo ${escapeHtml(klass.section)}` : ""} ${klass.tutor ? `· Tutor(a): ${escapeHtml(klass.tutor)}` : ""}</p>
        <h3>General grade table</h3>
        <table>
          <thead>
            <tr>
              <th class="num">No.</th>
              <th>Student</th>
              <th class="score">Score /10</th>
              <th>Status</th>
              <th>Rubric</th>
              <th>Activity</th>
              <th>Teacher comment</th>
            </tr>
          </thead>
          <tbody>${mainRows}</tbody>
        </table>
        <h3>Rubric details</h3>
        ${detailRows ? `
        <table class="detail-table">
          <thead>
            <tr>
              <th class="num">No.</th>
              <th>Student</th>
              ${RUBRIC_SHORT.map(label => `<th>${escapeHtml(label)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${detailRows}</tbody>
        </table>` : `<p class="empty-note">No assessed students for rubric detail yet.</p>`}
      </section>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #16223e; font-family: Arial, Helvetica, sans-serif; background: #f3f7ff; }
  .page { max-width: 1180px; margin: 0 auto; padding: 18px; }
  header { padding: 18px 20px; color: #fff; background: linear-gradient(135deg, #1375ff, #084bb5); border-radius: 18px; }
  .eyebrow { margin: 0 0 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; opacity: .84; }
  h1 { margin: 0; font-size: 30px; letter-spacing: -.04em; }
  .subtitle { margin: 8px 0 0; font-weight: 700; opacity: .92; }
  .generated { margin: 6px 0 0; font-size: 12px; opacity: .82; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0; }
  .summary-grid div { padding: 12px; border: 1px solid #d8e4ff; border-radius: 14px; background: #fff; }
  .summary-grid span { display: block; color: #65708a; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
  .summary-grid strong { display: block; margin-top: 5px; font-size: 22px; }
  .class-section { margin-top: 16px; padding: 14px; border: 1px solid #d8e4ff; border-radius: 16px; background: #fff; page-break-inside: avoid; }
  h2 { margin: 0; font-size: 22px; color: #084bb5; }
  .class-meta { margin: 5px 0 12px; color: #65708a; font-size: 12px; font-weight: 700; }
  h3 { margin: 14px 0 7px; font-size: 14px; color: #17233f; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: fixed; }
  th, td { border: 1px solid #d7def0; padding: 6px; vertical-align: top; word-wrap: break-word; }
  th { color: #fff; background: #1375ff; font-size: 10px; text-transform: uppercase; letter-spacing: .03em; }
  tbody tr:nth-child(even) { background: #f8fbff; }
  .pending { color: #68738b; background: #fff9eb !important; }
  .num { width: 38px; text-align: center; }
  .score { width: 62px; text-align: center; font-weight: 800; }
  .detail-table th:nth-child(2), .detail-table td:nth-child(2) { width: 190px; }
  .detail-table td { font-size: 9.6px; }
  .empty-note { margin: 0; padding: 10px; border: 1px dashed #d7def0; border-radius: 10px; color: #65708a; }
  footer { margin-top: 14px; color: #65708a; font-size: 11px; text-align: center; }
  @media print {
    body { background: #fff; }
    .page { max-width: none; padding: 0; }
    header, .summary-grid div, .class-section { box-shadow: none; }
  }
</style>
</head>
<body>
  <main class="page">
    <header>
      <p class="eyebrow">Unidad Educativa Particular Lev Vigotsky · English Area</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="subtitle">${escapeHtml(subtitle)}</p>
      <p class="generated">Generated: ${escapeHtml(generated)} · Teacher: Mr. David Santana</p>
    </header>
    ${summaryCards}
    ${classSections || `<p class="empty-note">No saved grades available.</p>`}
    <footer>Generated by Speaking Report Maker. Scores follow the 2026-2027 oral speaking rubric.</footer>
  </main>
</body>
</html>`;
}

function openPrintableReport(html, fallbackFilename) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    downloadBlob(html, fallbackFilename, "text/html;charset=utf-8");
    showToast("Popup blocked. Printable HTML exported instead.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 450);
  showToast("PDF layout opened. Choose Save as PDF.");
}

function safeDateLabel(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return formatDateTime(date);
}

function fallbackCopy(text) {
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

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function formatScore(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0$/, "");
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function dateForFilename(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function safeFilename(value) {
  return String(value || "report")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .toLowerCase();
}

function csvCell(value) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}


/* =========================================================
   SHARED SPEAKING SESSIONS
   ========================================================= */

const SPEAKING_SESSION_STORAGE_KEY = "lv-speaking-active-session-v2";
const SPEAKING_DEVICE_STORAGE_KEY = "lv-speaking-device-id-v1";
const autoPublishTimers = new Map();
let activeSpeakingSession = loadActiveSpeakingSession();
let availableSpeakingSessions = [];

function loadActiveSpeakingSession() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SPEAKING_SESSION_STORAGE_KEY) || "null");
    return parsed && parsed.sessionId ? parsed : null;
  } catch {
    return null;
  }
}

function saveActiveSpeakingSession(session) {
  activeSpeakingSession = session || null;
  if (activeSpeakingSession) {
    localStorage.setItem(SPEAKING_SESSION_STORAGE_KEY, JSON.stringify(activeSpeakingSession));
  } else {
    localStorage.removeItem(SPEAKING_SESSION_STORAGE_KEY);
  }
  refreshSharedSessionUI();
}

function getSpeakingDeviceId() {
  let id = localStorage.getItem(SPEAKING_DEVICE_STORAGE_KEY);
  if (!id) {
    id = `device-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(SPEAKING_DEVICE_STORAGE_KEY, id);
  }
  return id;
}

function normalizeSpeakingSessionId(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 48);
}

function courseYearNumber(klass) {
  const id = String(klass?.id || "").toLowerCase();
  if (id.startsWith("decimo")) return "10";
  if (id.startsWith("primero")) return "1";
  if (id.startsWith("segundo")) return "2";
  if (id.startsWith("tercero")) return "3";

  const labelMatch = String(klass?.label || "").match(/\d+/);
  return labelMatch?.[0] || "X";
}

function courseTrackCode(klass) {
  return /tec|t[eé]cnico/i.test(`${klass?.id || ""} ${klass?.specialty || ""} ${klass?.label || ""}`) ? "TEC" : "CC";
}

function localDateId(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Guayaquil",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).formatToParts(date);
  const get = type => parts.find(part => part.type === type)?.value || "";
  return `${get("day")}-${get("month")}-${get("year")}`;
}

function generatedSessionIdForClass(klass) {
  if (!klass) return "";
  const base = `${courseYearNumber(klass)}-${courseTrackCode(klass)}-${localDateId()}`;
  return currentAppMode === "regular" ? `${base}-REG` : base;
}

function participationSessionIdForClass(klass) {
  if (!klass) return "";
  return normalizeSpeakingSessionId(`PART-${klass.id}`);
}

function sessionAppMode(session) {
  const activity = String(session?.activity || "");
  if (activity === PARTICIPATION_ACTIVITY) return "participation";
  return [REGULAR_ACTIVITY, REGULAR_CHECKLIST_ACTIVITY, REGULAR_NUMBER_ACTIVITY].includes(activity)
    ? "regular"
    : "speaking";
}

function readAppRoute() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const view = params.get("view");
  const sessionId = normalizeSpeakingSessionId(params.get("sessionId"));
  const studentRaw = Number(params.get("student"));

  return {
    mode: ["speaking", "regular", "participation"].includes(mode) ? mode : null,
    view: view === "grade" || view === "session" ? view : null,
    sessionId,
    studentNumber: Number.isFinite(studentRaw) && studentRaw > 0 ? studentRaw : null
  };
}

function writeAppRoute({
  mode = currentAppMode,
  view = null,
  sessionId = "",
  studentNumber = null
} = {}) {
  const url = new URL(window.location.href);
  ["mode", "view", "sessionId", "student"].forEach(key => url.searchParams.delete(key));

  if (["speaking", "regular", "participation"].includes(mode)) url.searchParams.set("mode", mode);
  if (view === "session" || view === "grade") url.searchParams.set("view", view);
  if (sessionId) url.searchParams.set("sessionId", normalizeSpeakingSessionId(sessionId));
  if (mode === "speaking" && view === "grade" && Number.isFinite(Number(studentNumber))) {
    url.searchParams.set("student", String(Number(studentNumber)));
  }

  history.replaceState(null, "", url);
}

async function restoreAppRoute() {
  const route = readAppRoute();
  if (!route.mode) {
    currentAppMode = null;
    refreshSharedSessionUI();
    showModeSelection({ updateRoute: false });
    return;
  }

  currentAppMode = route.mode;
  modeScreen?.classList.remove("screen-active");
  assessmentScreen?.classList.remove("screen-active");
  regularAssessmentScreen?.classList.remove("screen-active");
  participationAssessmentScreen?.classList.remove("screen-active");
  classScreen?.classList.add("screen-active");
  setSessionMode("create");
  refreshSessionModeUI();
  refreshSharedSessionUI();

  if (!route.sessionId) {
    writeAppRoute({ mode: route.mode, view: "session" });
    loadAvailableSpeakingSessions();
    return;
  }

  try {
    const url = new URL(SPEAKING_SESSION_ENDPOINT);
    url.searchParams.set("sessionId", route.sessionId);
    const data = await speakingApiJson(url.toString());
    const session = data.session;
    const klass = CLASS_DATA.find(item => item.id === session?.classId);

    if (!session || !klass) throw new Error("Session or class not found.");
    if (sessionAppMode(session) !== route.mode) {
      throw new Error("This session belongs to another grading mode.");
    }

    saveActiveSpeakingSession(session);

    if (route.view !== "grade") {
      refreshSessionModeUI();
      refreshSharedSessionUI();
      loadAvailableSpeakingSessions();
      writeAppRoute({
        mode: route.mode,
        view: "session",
        sessionId: session.sessionId
      });
      return;
    }

    if (route.mode === "participation") {
      await loadParticipationData(session);
      openParticipationGrading(session, { updateRoute: false });
      writeAppRoute({
        mode: "participation",
        view: "grade",
        sessionId: session.sessionId
      });
      return;
    }

    if (route.mode === "regular") {
      await loadRegularGradesFromSession(session);
      openRegularGrading(session, { updateRoute: false });
      writeAppRoute({
        mode: "regular",
        view: "grade",
        sessionId: session.sessionId
      });
      return;
    }

    await hydrateDraftsFromSession(session);
    selectClass(klass.id, {
      studentNumber: route.studentNumber,
      updateRoute: false
    });
    writeAppRoute({
      mode: "speaking",
      view: "grade",
      sessionId: session.sessionId,
      studentNumber: state.studentNumber
    });
  } catch (error) {
    console.error("Could not restore grading route", error);
    setSharedSessionStatus(`Could not restore session: ${error.message}`, true);
    showToast("Could not restore session");
    writeAppRoute({ mode: route.mode, view: "session" });
    loadAvailableSpeakingSessions();
  }
}

function selectWebsiteMode(mode, { updateRoute = true } = {}) {
  currentAppMode = ["regular", "participation"].includes(mode) ? mode : "speaking";
  modeScreen?.classList.remove("screen-active");
  assessmentScreen?.classList.remove("screen-active");
  regularAssessmentScreen?.classList.remove("screen-active");
  participationAssessmentScreen?.classList.remove("screen-active");
  classScreen?.classList.add("screen-active");
  setSessionMode("create");
  refreshSessionModeUI();
  refreshSharedSessionUI();
  if (currentAppMode !== "participation") loadAvailableSpeakingSessions();
  if (updateRoute) writeAppRoute({ mode: currentAppMode, view: "session" });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showModeSelection({ updateRoute = true } = {}) {
  assessmentScreen?.classList.remove("screen-active");
  regularAssessmentScreen?.classList.remove("screen-active");
  participationAssessmentScreen?.classList.remove("screen-active");
  classScreen?.classList.remove("screen-active");
  modeScreen?.classList.add("screen-active");
  if (updateRoute) writeAppRoute({ mode: null, view: null });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function refreshSessionModeUI() {
  const regular = currentAppMode === "regular";
  const participation = currentAppMode === "participation";
  const activeMatches = activeSpeakingSession && sessionAppMode(activeSpeakingSession) === currentAppMode;
  const gateway = document.querySelector(".session-gateway");
  const participationPanel = $("#participationLaunchPanel");

  if (gateway) gateway.hidden = participation;
  if (participationPanel) participationPanel.hidden = !participation;

  if ($("#sessionModeEyebrow")) {
    $("#sessionModeEyebrow").textContent = participation ? "Participation" : regular ? "Regular grading" : "Speaking";
  }
  if ($("#sessionTitle")) {
    $("#sessionTitle").textContent = participation ? "Participation" : "Session";
  }
  if ($("#sessionModeCopy")) {
    $("#sessionModeCopy").textContent = participation
      ? "Choose a class to open its one persistent Participation session."
      : regular
        ? "Create or join a shared grading session, then grade the whole class using a checklist or direct numbers."
        : "A session is required before grading. Create a new one for a class or join an existing shared session.";
  }
  if ($("#sessionModeChip")) {
    $("#sessionModeChip").textContent = participation ? "Persistent tallies" : regular ? "Fast grading" : "Shared grading";
  }
  if ($("#sessionTitleInput")) {
    $("#sessionTitleInput").placeholder = regular
      ? "Example: Homework 3"
      : "Example: Unit 9 speaking assessment";
  }
  if ($("#generatedIdHelp")) {
    $("#generatedIdHelp").textContent = regular
      ? "Regular sessions use one combined ✓ / X / numerical grading mode."
      : "ID format: course year + CC/TEC + date (DD-MM-YYYY).";
  }
  if ($("#currentSessionSummary")) {
    $("#currentSessionSummary").hidden = participation || !activeMatches;
  }

  populateParticipationClassSelect();
  updateGeneratedSessionId();
}

function populateParticipationClassSelect() {
  const select = $("#participationClassSelect");
  if (!select) return;
  const selected = select.value;
  select.innerHTML = '<option value="">Choose a class…</option>';
  CLASS_DATA.forEach(klass => {
    const option = document.createElement("option");
    option.value = klass.id;
    option.textContent = klass.label;
    select.appendChild(option);
  });
  if (CLASS_DATA.some(klass => klass.id === selected)) select.value = selected;
}

function populateSessionClassSelect() {
  const select = $("#sessionClassSelect");
  if (!select) return;

  const selected = select.value;
  select.innerHTML = '<option value="">Choose a class…</option>';
  CLASS_DATA.forEach(klass => {
    const option = document.createElement("option");
    option.value = klass.id;
    option.textContent = klass.label;
    select.appendChild(option);
  });

  if (CLASS_DATA.some(klass => klass.id === selected)) select.value = selected;
  updateGeneratedSessionId();
}

function updateGeneratedSessionId() {
  const classId = $("#sessionClassSelect")?.value || "";
  const klass = CLASS_DATA.find(item => item.id === classId) || null;
  const output = $("#generatedSessionId");
  if (output) output.value = generatedSessionIdForClass(klass);
}

function setSessionMode(mode) {
  const create = mode !== "join";
  $("#createModeButton")?.classList.toggle("active", create);
  $("#joinModeButton")?.classList.toggle("active", !create);
  $("#createModeButton")?.setAttribute("aria-selected", String(create));
  $("#joinModeButton")?.setAttribute("aria-selected", String(!create));
  $("#createSessionPane")?.classList.toggle("active", create);
  $("#joinSessionPane")?.classList.toggle("active", !create);
  if (!create) loadAvailableSpeakingSessions();
}

function setSharedSessionStatus(message, isError = false) {
  ["#homeSessionStatus", "#assessmentSessionStatus", "#regularSyncStatus", "#participationSyncStatus", "#participationLaunchStatus"].forEach(selector => {
    const element = $(selector);
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("error", Boolean(isError));
  });
}

function sessionResultsUrl(sessionId = activeSpeakingSession?.sessionId) {
  const base = new URL("results.html", window.location.href);
  if (sessionId) base.searchParams.set("sessionId", sessionId);
  return base.toString();
}

function refreshSharedSessionUI() {
  const session = activeSpeakingSession;
  const activeMatches = Boolean(session && currentAppMode && sessionAppMode(session) === currentAppMode);
  const summary = $("#currentSessionSummary");
  if (summary) summary.hidden = !activeMatches;

  const statePill = $("#homeSessionState");
  if (statePill) {
    statePill.textContent = activeMatches ? "Active" : "Required";
    statePill.classList.toggle("active", activeMatches);
  }

  if ($("#currentSessionId")) $("#currentSessionId").textContent = activeMatches ? session.sessionId : "—";
  if ($("#currentSessionMeta")) {
    $("#currentSessionMeta").textContent = activeMatches
      ? `${session.title || "Grading session"} · ${session.classLabel || session.classId || "Class"}`
      : "—";
  }

  if ($("#assessmentSessionId")) {
    $("#assessmentSessionId").textContent =
      session && sessionAppMode(session) === "speaking" ? session.sessionId : "No session";
  }
  if ($("#regularSessionId")) {
    $("#regularSessionId").textContent =
      session && sessionAppMode(session) === "regular" ? session.sessionId : "No session";
  }
  if ($("#participationSessionId")) {
    $("#participationSessionId").textContent =
      session && sessionAppMode(session) === "participation" ? session.sessionId : "No session";
  }

  const closed = String(session?.status || "").toLowerCase() === "closed";
  [$("#assessmentSessionState"), $("#regularSessionState")].forEach(element => {
    if (!element) return;
    element.textContent = closed ? "Closed" : "Live";
    element.classList.toggle("closed", closed);
    element.classList.toggle("active", Boolean(session && !closed));
  });
}

async function speakingApiJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    const rawError = data.error || `Server error ${response.status}`;
    if (String(rawError).includes("WDE0025")) {
      throw new Error("Wix CMS collection not found. Verify Import1/Import2 in the Wix backend.");
    }
    throw new Error(rawError);
  }
  return data;
}

async function createSpeakingSession() {
  const classId = $("#sessionClassSelect")?.value || "";
  const klass = CLASS_DATA.find(item => item.id === classId) || null;
  if (!klass) {
    showToast("Choose a class first");
    $("#sessionClassSelect")?.focus();
    return;
  }

  if (!currentAppMode) {
    showToast("Choose a grading mode first");
    showModeSelection();
    return;
  }

  const sessionId = generatedSessionIdForClass(klass);
  const customTitle = $("#sessionTitleInput")?.value.trim() || "";
  const modeLabel = currentAppMode === "regular" ? "Regular grading" : "Speaking";
  const title = customTitle || `${klass.label} · ${modeLabel} · ${localDateId()}`;
  const activity = currentAppMode === "regular"
    ? REGULAR_ACTIVITY
    : "Oral speaking assessment";
  const button = $("#createSessionButton");
  const oldText = button?.textContent || "Create session";

  try {
    if (button) {
      button.disabled = true;
      button.textContent = "Creating…";
    }
    setSharedSessionStatus(`Creating ${sessionId}…`);

    const data = await speakingApiJson(SPEAKING_SESSION_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({
        action: "create",
        sessionId,
        title,
        classId: klass.id,
        classLabel: klass.label,
        activity,
        createdBy: "David Santana"
      })
    });

    saveActiveSpeakingSession(data.session);
    setSharedSessionStatus(`Session ${data.session.sessionId} created. Changes will sync automatically.`);
    showToast(`Session ${data.session.sessionId} created`);

    if (currentAppMode === "regular") {
      await loadRegularGradesFromSession(data.session);
      openRegularGrading(data.session);
    } else {
      await hydrateDraftsFromSession(data.session);
      selectClass(klass.id);
    }
  } catch (error) {
    console.error(error);
    setSharedSessionStatus(`Could not create session: ${error.message}`, true);
    showToast("Could not create session");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = oldText;
    }
  }
}

async function loadAvailableSpeakingSessions() {
  const select = $("#availableSessionsSelect");
  const status = $("#sessionListStatus");
  if (!select || !currentAppMode) return;

  select.innerHTML = '<option value="">Loading sessions…</option>';
  select.disabled = true;
  if (status) {
    status.classList.remove("error");
    status.textContent = "Loading available sessions from Wix…";
  }

  try {
    const listUrl = new URL(SPEAKING_SESSION_ENDPOINT);
    listUrl.searchParams.set("list", "1");
    const data = await speakingApiJson(listUrl.toString());
    const sessions = Array.isArray(data.sessions)
      ? data.sessions
      : Array.isArray(data.items)
        ? data.items
        : [];

    availableSpeakingSessions = sessions
      .filter(session => session?.sessionId && sessionAppMode(session) === currentAppMode)
      .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));

    select.innerHTML = '<option value="">Choose a session…</option>';
    availableSpeakingSessions.forEach(session => {
      const option = document.createElement("option");
      option.value = session.sessionId;
      const statusText = String(session.status || "open").toLowerCase() === "closed" ? " · CLOSED" : "";
      const kindText = sessionAppMode(session) === "regular" ? " · Regular" : "";
      option.textContent = `${session.sessionId} · ${session.title || session.classLabel || "Session"}${kindText}${statusText}`;
      select.appendChild(option);
    });

    if (status) {
      status.textContent = availableSpeakingSessions.length
        ? `${availableSpeakingSessions.length} ${currentAppMode === "regular" ? "regular grading" : "speaking"} session(s) available.`
        : "No sessions found for this mode.";
    }
  } catch (error) {
    console.error(error);
    availableSpeakingSessions = [];
    select.innerHTML = '<option value="">Sessions unavailable</option>';
    if (status) {
      status.textContent = String(error.message).includes("sessionId")
        ? "The Wix speakingSession GET endpoint must return all sessions when no sessionId is supplied."
        : `Could not load sessions: ${error.message}`;
      status.classList.add("error");
    }
  } finally {
    select.disabled = false;
  }
}

async function joinSpeakingSession() {
  const sessionId = normalizeSpeakingSessionId($("#availableSessionsSelect")?.value);
  if (!sessionId) {
    showToast("Choose a session");
    return;
  }

  const button = $("#joinSessionButton");
  const oldText = button?.textContent || "Join selected session";
  try {
    if (button) {
      button.disabled = true;
      button.textContent = "Joining…";
    }

    const url = new URL(SPEAKING_SESSION_ENDPOINT);
    url.searchParams.set("sessionId", sessionId);
    const data = await speakingApiJson(url.toString());
    const session = data.session;
    const klass = CLASS_DATA.find(item => item.id === session?.classId);

    if (!session || !klass) {
      throw new Error("This session does not match a class in the grading app.");
    }
    if (sessionAppMode(session) !== currentAppMode) {
      throw new Error("This session belongs to another grading mode.");
    }

    saveActiveSpeakingSession(session);
    setSharedSessionStatus(`Joined ${session.sessionId}. Changes will sync automatically.`);
    showToast(`Joined ${session.sessionId}`);

    if (currentAppMode === "regular") {
      await loadRegularGradesFromSession(session);
      openRegularGrading(session);
    } else {
      await hydrateDraftsFromSession(session);
      selectClass(klass.id);
    }
  } catch (error) {
    console.error(error);
    setSharedSessionStatus(`Could not join session: ${error.message}`, true);
    showToast("Could not join session");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = oldText;
    }
  }
}

async function hydrateDraftsFromSession(session) {
  if (!session?.sessionId || !session?.classId) return;

  try {
    const url = new URL(SPEAKING_SUBMISSION_ENDPOINT);
    url.searchParams.set("sessionId", session.sessionId);
    const data = await speakingApiJson(url.toString());
    const items = Array.isArray(data.items) ? data.items : [];

    items.forEach(item => {
      const key = getStudentDraftKey(session.classId, item.studentNumber, session.sessionId);
      if (!key) return;

      let rows = [];
      try {
        rows = Array.isArray(item.rows)
          ? item.rows
          : JSON.parse(item.criteriaJson || "[]");
      } catch {
        rows = [];
      }

      const scores = {};
      rows.forEach(row => {
        if (!row || row.level === "Not marked") return;
        const criterion = RUBRIC.find(item => item.title === row.criterion);
        if (!criterion) return;
        const optionIndex = criterion.options.findIndex(option =>
          option.label === row.level || Number(option.points) === Number(row.points)
        );
        if (optionIndex >= 0) {
          scores[criterion.id] = {
            optionIndex,
            points: criterion.options[optionIndex].points
          };
        }
      });

      localStorage.setItem(key, JSON.stringify({
        scores,
        comment: item.comment || "",
        activity: item.activity || session.activity || "Oral speaking assessment",
        updatedAt: item.updatedAt || item.submittedAt || new Date().toISOString()
      }));
    });
  } catch (error) {
    console.warn("Could not hydrate session submissions", error);
  }
}

function leaveSpeakingSession() {
  if (!activeSpeakingSession) return;
  const oldId = activeSpeakingSession.sessionId;

  autoPublishTimers.forEach(timer => clearTimeout(timer));
  autoPublishTimers.clear();
  regularPublishTimers.forEach(timer => clearTimeout(timer));
  regularPublishTimers.clear();

  saveActiveSpeakingSession(null);
  regularGrades = new Map();
  state.classId = null;
  state.studentNumber = null;
  state.scores = {};
  state.comment = "";

  assessmentScreen?.classList.remove("screen-active");
  regularAssessmentScreen?.classList.remove("screen-active");
  participationAssessmentScreen?.classList.remove("screen-active");
  modeScreen?.classList.remove("screen-active");
  classScreen?.classList.add("screen-active");

  setSharedSessionStatus(`Left session ${oldId}. Create or join another session to continue.`);
  refreshSessionModeUI();
  writeAppRoute({ mode: currentAppMode, view: "session" });
  loadAvailableSpeakingSessions();
}

function captureCurrentStudentSnapshot() {
  const session = activeSpeakingSession;
  const klass = getSelectedClass();
  const student = getSelectedStudent();
  if (!session || sessionAppMode(session) !== "speaking" || !klass || !student || session.classId !== klass.id) return null;
  if (String(session.status || "").toLowerCase() === "closed") return null;

  const report = getReportObject();
  return {
    sessionId: session.sessionId,
    recordKey: `${session.sessionId}|${student.n}`,
    deviceId: getSpeakingDeviceId(),
    contributorName: "David Santana",
    record: {
      classId: klass.id,
      classLabel: klass.label,
      course: klass.course,
      section: klass.section,
      specialty: klass.specialty,
      tutor: klass.tutor,
      studentNumber: student.n,
      studentName: student.name,
      activity: report.activity,
      total: report.total,
      markedCriteria: getMarkedCount(report),
      rows: report.rows,
      comment: report.comment,
      createdAt: report.createdAt,
      submittedAt: new Date().toISOString()
    }
  };
}

function queueAutoPublishCurrentStudent() {
  const snapshot = captureCurrentStudentSnapshot();
  if (!snapshot) return;

  const existing = autoPublishTimers.get(snapshot.recordKey);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    autoPublishTimers.delete(snapshot.recordKey);
    publishSpeakingSnapshot(snapshot);
  }, 450);

  autoPublishTimers.set(snapshot.recordKey, timer);
  setSharedSessionStatus("Saving changes…");
}

async function publishSpeakingSnapshot(snapshot) {
  try {
    await speakingApiJson(SPEAKING_SUBMISSION_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({
        sessionId: snapshot.sessionId,
        deviceId: snapshot.deviceId,
        contributorName: snapshot.contributorName,
        record: snapshot.record
      })
    });

    if (activeSpeakingSession?.sessionId === snapshot.sessionId) {
      setSharedSessionStatus("All changes saved to the shared session.");
    }
  } catch (error) {
    console.error(error);
    if (activeSpeakingSession?.sessionId === snapshot.sessionId) {
      setSharedSessionStatus(`Auto-save failed: ${error.message}`, true);
    }
  }
}

function regularDraftKey(sessionId, classId, studentNumber) {
  return `lv-regular-grade-${sessionId}-${classId}-${studentNumber}`;
}

function blankRegularGrade() {
  return { kind: "blank", value: null };
}

function normalizeRegularGrade(raw) {
  if (!raw || raw.kind === "blank" || raw.value === null || raw.value === "") {
    return blankRegularGrade();
  }

  if (raw.kind === "check") return { kind: "check", value: 10 };
  if (raw.kind === "x") return { kind: "x", value: 0 };

  const value = Number(raw.value);
  if (!Number.isFinite(value) || value < 0 || value > 10) return blankRegularGrade();
  return { kind: "number", value: Math.round(value * 100) / 100 };
}
function saveRegularGradeLocal(studentNumber) {
  const session = activeSpeakingSession;
  if (!session?.sessionId || !session?.classId) return;
  const grade = regularGrades.get(Number(studentNumber)) || blankRegularGrade();
  localStorage.setItem(
    regularDraftKey(session.sessionId, session.classId, studentNumber),
    JSON.stringify({ ...grade, updatedAt: new Date().toISOString() })
  );
}

function readRegularGradeLocal(session, studentNumber) {
  try {
    const raw = JSON.parse(
      localStorage.getItem(regularDraftKey(session.sessionId, session.classId, studentNumber)) || "null"
    );
    return normalizeRegularGrade(raw);
  } catch {
    return blankRegularGrade();
  }
}

async function loadRegularGradesFromSession(session) {
  regularGrades = new Map();
  const klass = CLASS_DATA.find(item => item.id === session?.classId);
  if (!session?.sessionId || !klass) return;

  const localByStudent = new Map(
    klass.students.map(student => [student.n, readRegularGradeLocal(session, student.n)])
  );

  try {
    const url = new URL(SPEAKING_SUBMISSION_ENDPOINT);
    url.searchParams.set("sessionId", session.sessionId);
    const data = await speakingApiJson(url.toString());
    const items = Array.isArray(data.items) ? data.items : [];
    const serverByStudent = new Map(items.map(item => [Number(item.studentNumber), item]));

    klass.students.forEach(student => {
      const item = serverByStudent.get(student.n);
      if (!item) {
        regularGrades.set(student.n, localByStudent.get(student.n) || blankRegularGrade());
        return;
      }

      if (Number(item.markedCriteria || 0) <= 0) {
        regularGrades.set(student.n, blankRegularGrade());
        return;
      }

      let rows = [];
      try {
        rows = Array.isArray(item.rows) ? item.rows : JSON.parse(item.criteriaJson || "[]");
      } catch {
        rows = [];
      }
      const level = String(rows[0]?.level || "");

      if (level.startsWith("✓") || (session.activity === REGULAR_CHECKLIST_ACTIVITY && Number(item.scoreTotal) === 10)) {
        regularGrades.set(student.n, { kind: "check", value: 10 });
      } else if (level === "X" || (session.activity === REGULAR_CHECKLIST_ACTIVITY && Number(item.scoreTotal) === 0)) {
        regularGrades.set(student.n, { kind: "x", value: 0 });
      } else {
        regularGrades.set(student.n, {
          kind: "number",
          value: Math.round(Number(item.scoreTotal || 0) * 100) / 100
        });
      }
    });
  } catch (error) {
    console.warn("Could not load regular grades from Wix; using local drafts.", error);
    klass.students.forEach(student => {
      regularGrades.set(student.n, localByStudent.get(student.n) || blankRegularGrade());
    });
  }
}

function openRegularGrading(session = activeSpeakingSession, { updateRoute = true } = {}) {
  if (!session || sessionAppMode(session) !== "regular") return;

  const klass = CLASS_DATA.find(item => item.id === session.classId);
  if (!klass) {
    showToast("Class not found for this session");
    return;
  }

  currentAppMode = "regular";
  state.classId = klass.id;

  modeScreen?.classList.remove("screen-active");
  classScreen?.classList.remove("screen-active");
  assessmentScreen?.classList.remove("screen-active");
  regularAssessmentScreen?.classList.add("screen-active");

  if ($("#regularAssessmentEyebrow")) $("#regularAssessmentEyebrow").textContent = "Regular grading";
  if ($("#regularAssessmentTitle")) $("#regularAssessmentTitle").textContent = session.title || klass.label;
  if ($("#regularClassMeta")) {
    $("#regularClassMeta").textContent = `${klass.label} · ${klass.course} · Tutor(a): ${klass.tutor}`;
  }
  if ($("#regularStudentCount")) $("#regularStudentCount").textContent = `${klass.students.length} students`;
  if ($("#regularRosterEyebrow")) $("#regularRosterEyebrow").textContent = "Regular grading";
  if ($("#regularInstructions")) {
    $("#regularInstructions").textContent =
      "✓ gives 10, X gives 0, or type any score from 0 to 10. Clear the number field and leave both buttons unselected for a blank grade.";
  }

  refreshSharedSessionUI();
  renderRegularRoster();
  if (updateRoute) {
    writeAppRoute({
      mode: "regular",
      view: "grade",
      sessionId: session.sessionId
    });
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function regularGradeDisplay(grade) {
  if (!grade || grade.kind === "blank") return "—";
  if (grade.kind === "check") return "10";
  if (grade.kind === "x") return "0";
  return formatScore(grade.value);
}

function renderRegularRoster() {
  const host = $("#regularRoster");
  const session = activeSpeakingSession;
  const klass = CLASS_DATA.find(item => item.id === session?.classId);
  if (!host || !session || !klass) return;

  const closed = String(session.status || "").toLowerCase() === "closed";

  host.innerHTML = klass.students.map(student => {
    const grade = regularGrades.get(student.n) || blankRegularGrade();
    const inputValue = grade.kind === "blank" ? "" : grade.value;

    return `
      <article class="regular-student-row" data-student-row="${student.n}">
        <div class="regular-student-identity">
          <span class="regular-student-number">${student.n}</span>
          <strong>${escapeHtml(student.name)}</strong>
        </div>
        <div class="regular-grade-control combined">
          <div class="regular-check-controls">
            <button class="regular-mark-button check ${grade.kind === "check" ? "selected" : ""}"
                    type="button" data-student="${student.n}" data-mark="check" ${closed ? "disabled" : ""}>✓</button>
            <button class="regular-mark-button x ${grade.kind === "x" ? "selected" : ""}"
                    type="button" data-student="${student.n}" data-mark="x" ${closed ? "disabled" : ""}>×</button>
          </div>
          <input class="regular-number-input"
                 type="number"
                 min="0"
                 max="10"
                 step="0.01"
                 inputmode="decimal"
                 data-student="${student.n}"
                 placeholder="—"
                 value="${escapeAttribute(inputValue)}"
                 ${closed ? "disabled" : ""} />
        </div>
        <div class="regular-grade-value" id="regular-grade-value-${student.n}">${escapeHtml(regularGradeDisplay(grade))}</div>
      </article>
    `;
  }).join("");

  host.querySelectorAll(".regular-mark-button").forEach(button => {
    button.addEventListener("click", () => {
      const studentNumber = Number(button.dataset.student);
      const mark = button.dataset.mark;
      const current = regularGrades.get(studentNumber) || blankRegularGrade();
      const next = current.kind === mark
        ? blankRegularGrade()
        : mark === "check"
          ? { kind: "check", value: 10 }
          : { kind: "x", value: 0 };

      regularGrades.set(studentNumber, next);
      saveRegularGradeLocal(studentNumber);
      renderRegularRoster();
      queueRegularPublish(studentNumber);
    });
  });

  host.querySelectorAll(".regular-number-input").forEach(input => {
    input.addEventListener("input", () => {
      const studentNumber = Number(input.dataset.student);
      const raw = input.value.trim();
      input.classList.remove("invalid");

      if (raw === "") {
        regularGrades.set(studentNumber, blankRegularGrade());
      } else {
        const value = Number(raw);
        if (!Number.isFinite(value) || value < 0 || value > 10) {
          input.classList.add("invalid");
          $("#regularSyncStatus").textContent = "Grades must be between 0 and 10.";
          return;
        }
        regularGrades.set(studentNumber, {
          kind: "number",
          value: Math.round(value * 100) / 100
        });
      }

      const row = input.closest(".regular-student-row");
      row?.querySelector(".regular-mark-button.check")?.classList.remove("selected");
      row?.querySelector(".regular-mark-button.x")?.classList.remove("selected");

      const display = document.getElementById(`regular-grade-value-${studentNumber}`);
      if (display) display.textContent = regularGradeDisplay(regularGrades.get(studentNumber));
      saveRegularGradeLocal(studentNumber);
      queueRegularPublish(studentNumber);
    });
  });

  if (closed && $("#regularSyncStatus")) {
    $("#regularSyncStatus").textContent = "This session is closed. Grades are read-only.";
  }
}

function buildRegularSnapshot(studentNumber) {
  const session = activeSpeakingSession;
  const klass = CLASS_DATA.find(item => item.id === session?.classId);
  const student = klass?.students.find(item => item.n === Number(studentNumber));
  if (!session || sessionAppMode(session) !== "regular" || !klass || !student) return null;
  if (String(session.status || "").toLowerCase() === "closed") return null;

  const grade = normalizeRegularGrade(regularGrades.get(student.n));
  const blank = grade.kind === "blank";
  const score = blank ? 0 : Number(grade.value);

  const level = blank
    ? "Not marked"
    : grade.kind === "check"
      ? "✓ Checked"
      : grade.kind === "x"
        ? "X"
        : "Numerical grade";

  const observation = blank
    ? ""
    : grade.kind === "check"
      ? "Set to 10 with the check button."
      : grade.kind === "x"
        ? "Set to 0 with the X button."
        : "Entered manually in the numerical field.";

  return {
    sessionId: session.sessionId,
    recordKey: `${session.sessionId}|${student.n}`,
    deviceId: getSpeakingDeviceId(),
    contributorName: "David Santana",
    record: {
      classId: klass.id,
      classLabel: klass.label,
      course: klass.course,
      section: klass.section,
      specialty: klass.specialty,
      tutor: klass.tutor,
      studentNumber: student.n,
      studentName: student.name,
      activity: session.title || session.activity,
      total: score,
      markedCriteria: blank ? 0 : 1,
      rows: [{
        criterion: "Regular grade",
        max: 10,
        level,
        points: blank ? null : score,
        observation
      }],
      comment: "",
      source: "Lev Vigotsky Regular Grading",
      createdAt: new Date().toISOString(),
      submittedAt: new Date().toISOString()
    }
  };
}

function queueRegularPublish(studentNumber) {
  const snapshot = buildRegularSnapshot(studentNumber);
  if (!snapshot) return;

  const key = snapshot.recordKey;
  const existing = regularPublishTimers.get(key);
  if (existing) clearTimeout(existing);

  regularPublishTimers.set(key, setTimeout(() => {
    regularPublishTimers.delete(key);
    publishRegularSnapshot(snapshot);
  }, 350));

  if ($("#regularSyncStatus")) {
    $("#regularSyncStatus").textContent = "Saving changes…";
    $("#regularSyncStatus").classList.remove("error");
  }
}

async function publishRegularSnapshot(snapshot) {
  try {
    await speakingApiJson(SPEAKING_SUBMISSION_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({
        sessionId: snapshot.sessionId,
        deviceId: snapshot.deviceId,
        contributorName: snapshot.contributorName,
        record: snapshot.record
      })
    });

    if (activeSpeakingSession?.sessionId === snapshot.sessionId && $("#regularSyncStatus")) {
      $("#regularSyncStatus").textContent = "All changes saved to Results.";
      $("#regularSyncStatus").classList.remove("error");
    }
  } catch (error) {
    console.error(error);
    if (activeSpeakingSession?.sessionId === snapshot.sessionId && $("#regularSyncStatus")) {
      $("#regularSyncStatus").textContent = `Auto-save failed: ${error.message}`;
      $("#regularSyncStatus").classList.add("error");
    }
  }
}

async function continueActiveSession() {
  const session = activeSpeakingSession;
  if (!session || sessionAppMode(session) !== currentAppMode) {
    showToast("No active session for this mode");
    return;
  }

  const klass = CLASS_DATA.find(item => item.id === session.classId);
  if (!klass) {
    showToast("Class not found");
    return;
  }

  if (currentAppMode === "regular") {
    await loadRegularGradesFromSession(session);
    openRegularGrading(session);
  } else {
    await hydrateDraftsFromSession(session);
    selectClass(klass.id);
  }
}

function resultSessionModeLabel(session) {
  const mode = sessionAppMode(session);
  if (mode === "participation") return "Participation";
  return mode === "regular" ? "Regular" : "Speaking";
}

async function loadStartResultsSessions() {
  const panel = $("#startResultsPanel");
  const select = $("#startResultsSessionSelect");
  const status = $("#startResultsStatus");
  if (!panel || !select) return;

  panel.hidden = false;
  select.disabled = true;
  select.innerHTML = '<option value="">Loading sessions…</option>';
  if (status) {
    status.classList.remove("error");
    status.textContent = "Loading all saved sessions…";
  }

  try {
    const listUrl = new URL(SPEAKING_SESSION_ENDPOINT);
    listUrl.searchParams.set("list", "1");
    const data = await speakingApiJson(listUrl.toString());
    const sessions = (Array.isArray(data.sessions) ? data.sessions : Array.isArray(data.items) ? data.items : [])
      .filter(session => session?.sessionId)
      .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));

    select.innerHTML = '<option value="">Choose a session…</option>';
    sessions.forEach(session => {
      const option = document.createElement("option");
      option.value = session.sessionId;
      const mode = resultSessionModeLabel(session);
      const statusText = String(session.status || "open").toLowerCase() === "closed" ? " · CLOSED" : "";
      const classText = session.classLabel || session.classId || "Class";
      const title = session.title || session.activity || "Session";
      option.textContent = `${mode} · ${classText} · ${title} · ${session.sessionId}${statusText}`;
      select.appendChild(option);
    });

    if (status) {
      status.textContent = sessions.length
        ? `${sessions.length} session(s) available.`
        : "No saved sessions found.";
    }
  } catch (error) {
    console.error(error);
    select.innerHTML = '<option value="">Sessions unavailable</option>';
    if (status) {
      status.textContent = `Could not load sessions: ${error.message}`;
      status.classList.add("error");
    }
  } finally {
    select.disabled = false;
  }
}

function openSelectedSessionResults() {
  const sessionId = normalizeSpeakingSessionId($("#startResultsSessionSelect")?.value);
  if (!sessionId) {
    showToast("Choose a session first");
    return;
  }
  window.location.href = sessionResultsUrl(sessionId);
}

function openSpeakingResults() {
  window.location.href = sessionResultsUrl(activeSpeakingSession?.sessionId || "");
}

function initSharedSessions() {
  populateSessionClassSelect();

  $("#chooseSpeakingMode")?.addEventListener("click", () => selectWebsiteMode("speaking"));
  $("#chooseRegularMode")?.addEventListener("click", () => selectWebsiteMode("regular"));
  $("#chooseParticipationMode")?.addEventListener("click", () => selectWebsiteMode("participation"));
  $("#chooseResultsMode")?.addEventListener("click", loadStartResultsSessions);
  $("#refreshStartResults")?.addEventListener("click", loadStartResultsSessions);
  $("#openSelectedResults")?.addEventListener("click", openSelectedSessionResults);
  $("#backToModeSelection")?.addEventListener("click", showModeSelection);

  $("#sessionClassSelect")?.addEventListener("change", updateGeneratedSessionId);
  $("#createModeButton")?.addEventListener("click", () => setSessionMode("create"));
  $("#joinModeButton")?.addEventListener("click", () => setSessionMode("join"));
  $("#createSessionButton")?.addEventListener("click", createSpeakingSession);
  $("#joinSessionButton")?.addEventListener("click", joinSpeakingSession);
  $("#refreshSessionsButton")?.addEventListener("click", loadAvailableSpeakingSessions);
  $("#continueHomeSession")?.addEventListener("click", continueActiveSession);

  $("#openHomeResults")?.addEventListener("click", openSpeakingResults);
  $("#openAssessmentResults")?.addEventListener("click", openSpeakingResults);
  $("#openRegularResults")?.addEventListener("click", openSpeakingResults);
  $("#leaveHomeSession")?.addEventListener("click", leaveSpeakingSession);
  $("#openParticipationClass")?.addEventListener("click", openParticipationClass);
  $("#saveParticipationThreshold")?.addEventListener("click", saveParticipationThreshold);
  $("#openParticipationResults")?.addEventListener("click", openSpeakingResults);

  restoreAppRoute();
}

window.addEventListener("beforeunload", saveStudentDraft);
init();
