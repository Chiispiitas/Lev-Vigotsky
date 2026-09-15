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

const state = {
  classId: null,
  studentNumber: null,
  scores: {},
  comment: "",
  activity: "Oral speaking assessment"
};

const $ = (selector) => document.querySelector(selector);
const classScreen = $("#classScreen");
const assessmentScreen = $("#assessmentScreen");
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

function selectClass(classId) {
  if (!activeSpeakingSession || activeSpeakingSession.classId !== classId) {
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

  classScreen.classList.remove("screen-active");
  assessmentScreen.classList.add("screen-active");
  window.scrollTo({ top: 0, behavior: "smooth" });
  updatePreview();
  refreshSharedSessionUI();
}

function showClassScreen() {
  saveStudentDraft();
  assessmentScreen.classList.remove("screen-active");
  classScreen.classList.add("screen-active");
  refreshSharedSessionUI();
  loadAvailableSpeakingSessions();
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

function selectStudentNumber(studentNumber, { clearSearch = false, showMessage = false } = {}) {
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
  return `${courseYearNumber(klass)}-${courseTrackCode(klass)}-${localDateId()}`;
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
  ["#homeSessionStatus", "#assessmentSessionStatus"].forEach(selector => {
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
  const summary = $("#currentSessionSummary");
  if (summary) summary.hidden = !session;

  const statePill = $("#homeSessionState");
  if (statePill) {
    statePill.textContent = session ? "Active" : "Required";
    statePill.classList.toggle("active", Boolean(session));
  }

  if ($("#currentSessionId")) $("#currentSessionId").textContent = session?.sessionId || "—";
  if ($("#currentSessionMeta")) {
    $("#currentSessionMeta").textContent = session
      ? `${session.title || "Speaking session"} · ${session.classLabel || session.classId || "Class"}`
      : "—";
  }

  if ($("#assessmentSessionId")) $("#assessmentSessionId").textContent = session?.sessionId || "No session";
  if ($("#assessmentSessionState")) {
    const closed = String(session?.status || "").toLowerCase() === "closed";
    $("#assessmentSessionState").textContent = closed ? "Closed" : "Live";
    $("#assessmentSessionState").classList.toggle("closed", closed);
    $("#assessmentSessionState").classList.toggle("active", Boolean(session && !closed));
  }
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

  const sessionId = generatedSessionIdForClass(klass);
  const customTitle = $("#sessionTitleInput")?.value.trim() || "";
  const title = customTitle || `${klass.label} · ${localDateId()}`;
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
        activity: "Oral speaking assessment",
        createdBy: "David Santana"
      })
    });

    saveActiveSpeakingSession(data.session);
    await hydrateDraftsFromSession(data.session);
    setSharedSessionStatus(`Session ${data.session.sessionId} created. Changes will sync automatically.`);
    showToast(`Session ${data.session.sessionId} created`);
    selectClass(klass.id);
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
  if (!select) return;

  select.innerHTML = '<option value="">Loading sessions…</option>';
  select.disabled = true;
  if (status) status.textContent = "Loading available sessions from Wix…";

  try {
    const data = await speakingApiJson(SPEAKING_SESSION_ENDPOINT);
    const sessions = Array.isArray(data.sessions)
      ? data.sessions
      : Array.isArray(data.items)
        ? data.items
        : [];

    availableSpeakingSessions = sessions
      .filter(session => session?.sessionId)
      .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));

    select.innerHTML = '<option value="">Choose a session…</option>';
    availableSpeakingSessions.forEach(session => {
      const option = document.createElement("option");
      option.value = session.sessionId;
      const statusText = String(session.status || "open").toLowerCase() === "closed" ? " · CLOSED" : "";
      option.textContent = `${session.sessionId} · ${session.title || session.classLabel || "Speaking"}${statusText}`;
      select.appendChild(option);
    });

    if (status) {
      status.textContent = availableSpeakingSessions.length
        ? `${availableSpeakingSessions.length} session(s) available.`
        : "No sessions found.";
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
      throw new Error("This session does not match a class in the Speaking app.");
    }

    saveActiveSpeakingSession(session);
    await hydrateDraftsFromSession(session);
    setSharedSessionStatus(`Joined ${session.sessionId}. Changes will sync automatically.`);
    showToast(`Joined ${session.sessionId}`);
    selectClass(klass.id);
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
  saveActiveSpeakingSession(null);
  state.classId = null;
  state.studentNumber = null;
  state.scores = {};
  state.comment = "";
  assessmentScreen.classList.remove("screen-active");
  classScreen.classList.add("screen-active");
  setSharedSessionStatus(`Left session ${oldId}. Create or join another session to continue.`);
  loadAvailableSpeakingSessions();
}

function captureCurrentStudentSnapshot() {
  const session = activeSpeakingSession;
  const klass = getSelectedClass();
  const student = getSelectedStudent();
  if (!session || !klass || !student || session.classId !== klass.id) return null;
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

function openSpeakingResults() {
  window.location.href = sessionResultsUrl(activeSpeakingSession?.sessionId || "");
}

function initSharedSessions() {
  populateSessionClassSelect();

  $("#sessionClassSelect")?.addEventListener("change", updateGeneratedSessionId);
  $("#createModeButton")?.addEventListener("click", () => setSessionMode("create"));
  $("#joinModeButton")?.addEventListener("click", () => setSessionMode("join"));
  $("#createSessionButton")?.addEventListener("click", createSpeakingSession);
  $("#joinSessionButton")?.addEventListener("click", joinSpeakingSession);
  $("#refreshSessionsButton")?.addEventListener("click", loadAvailableSpeakingSessions);
  $("#openHomeResults")?.addEventListener("click", openSpeakingResults);
  $("#openAssessmentResults")?.addEventListener("click", openSpeakingResults);
  $("#leaveHomeSession")?.addEventListener("click", leaveSpeakingSession);

  refreshSharedSessionUI();
  loadAvailableSpeakingSessions();

  if (activeSpeakingSession?.sessionId) {
    const klass = CLASS_DATA.find(item => item.id === activeSpeakingSession.classId);
    if (klass) {
      hydrateDraftsFromSession(activeSpeakingSession).then(() => {
        selectClass(klass.id);
      });
    }
  }
}

window.addEventListener("beforeunload", saveStudentDraft);
init();
