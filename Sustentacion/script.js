/* Rúbrica de Sustentación de Práctica Preprofesional - UEPLV */
"use strict";

const COURSE = {
  id: "tercero-tecnico-fct-2026",
  label: "3ro Técnico",
  course: "Tercero de Bachillerato",
  specialty: "Bachillerato Técnico Contable",
  period: "2026-2027",
  institution: "Unidad Educativa Particular Lev Vigotsky"
};

const STUDENTS = [
  { n: 1, name: "ALCÍVAR CEDEÑO GÉNESSIS ANALÍA" },
  { n: 2, name: "ANDRADE LARA MATIAS SEBASTIAN" },
  { n: 3, name: "BAILÓN ESTRADA DILLAN SANTIAGO" },
  { n: 4, name: "CAÑARTE CASTRO FREDDY MATHIAS" },
  { n: 5, name: "CARREÑO MENDOZA KEILA ANAHÍ" },
  { n: 6, name: "CASTRELLON VERA ISMAEL" },
  { n: 7, name: "CEDEÑO QUIJIJE MATEO" },
  { n: 8, name: "CEDEÑO VASQUEZ MARCO ANDRES" },
  { n: 9, name: "CEVALLOS COBEÑA JOSE MATIAS" },
  { n: 10, name: "CEVALLOS LOPEZ SHIRLEY VALERIA" },
  { n: 11, name: "CEVALLOS YOSA EMILY SCARLETH" },
  { n: 12, name: "DELGADO MERO MAYKEL DARIAN" },
  { n: 13, name: "DUARTE AVEIGA CRISTHIAN VALENTIN" },
  { n: 14, name: "FALCONI MERO VIELKA ROMINA" },
  { n: 15, name: "FRANCO FRANCO LUISANA VALENTINA" },
  { n: 16, name: "LOOR OCHOA JOHAN PAUL" },
  { n: 17, name: "MACIAS TUBAY ANGELA DAMARYS" },
  { n: 18, name: "MASAPANTA ZAMBRANO JEAN MARCOS" },
  { n: 19, name: "MEDRANDA PONCE MELANY YANOSKA" },
  { n: 20, name: "MEJIA LOPEZ GERALD JOHAN" },
  { n: 21, name: "MENDOZA CAJAMARCA HANNA MICHELLE" },
  { n: 22, name: "MORRILLO CORDERO MIGUEL ANGEL" },
  { n: 23, name: "MUÑOZ SUAREZ BRANDON DARIO" },
  { n: 24, name: "NAULA SÁNCHEZ NOHELIA VALEZKA" },
  { n: 25, name: "PELAEZ SABANDO KEYLA DAMARIS" },
  { n: 26, name: "PIGUAVE BARREZUETA ANGIE NAYIBETH" },
  { n: 27, name: "REYES MERA RANDY ELIAN" },
  { n: 28, name: "REYES SABANDO BRITHANY PAMELA" },
  { n: 29, name: "RODRÍGUEZ URDÁNIGO BRUNO ABDÓN" },
  { n: 30, name: "SANTANA MEJIA SARA NAHOMY" },
  { n: 31, name: "TUMBACO MACÍAS JUAN DAVID" },
  { n: 32, name: "VELASCO REYES MILAGROS ANALIA" },
  { n: 33, name: "VERA MOREIRA BIANKA MILENA" },
  { n: 34, name: "VERA PILAY JHON WALTER" },
  { n: 35, name: "VIDAL FREYA MELINA" },
  { n: 36, name: "ZAMORA ESCALANTE MATIAS BENJAMIN" }
];

const RUBRIC = [
  { id: "tiempo", title: "Tiempo", max: 1, options: [
    { value: 1, label: "El estudiante cumple con el tiempo establecido de 2:00 a 3 minutos." },
    { value: 0.5, label: "El estudiante se pasa del tiempo estipulado." },
    { value: 0.25, label: "El estudiante no se ha preparado y no cumple con lo solicitado." }
  ] },
  { id: "preparacion", title: "Preparación", max: 2, options: [
    { value: 2, label: "Se nota buen dominio del tema, no comete errores y no duda." },
    { value: 1.5, label: "Exposición fluida con muy pocos errores." },
    { value: 1, label: "Hace algunas rectificaciones y de vez en cuando parece dudar." }
  ] },
  { id: "interes", title: "Interés", max: 2, options: [
    { value: 2, label: "Atrae la atención de los asistentes y mantiene el interés durante toda la exposición." },
    { value: 1.5, label: "Interesante al principio, pero se vuelve monótona." },
    { value: 1, label: "Le cuesta mantener el interés de los compañeros." }
  ] },
  { id: "voz", title: "Voz", max: 2, options: [
    { value: 2, label: "Buena vocalización, entonación adecuada, matizada y buen timbre de voz." },
    { value: 1.5, label: "Buena vocalización, pero con timbre de voz bajo." },
    { value: 1, label: "Cuesta comprender algunos fragmentos." }
  ] },
  { id: "expresion", title: "Expresión corporal y seguridad", max: 2, options: [
    { value: 2, label: "Su postura, gestos y contacto visual son adecuados y seguros." },
    { value: 1.5, label: "Mantiene postura correcta y gestos adecuados, pero le falta contacto visual." },
    { value: 0.5, label: "Se mantuvo nervioso o tenso durante toda la exposición." }
  ] },
  { id: "soporte", title: "Soporte", max: 1, options: [
    { value: 1, label: "La exposición se acompaña con materiales adecuados, atractivos y de calidad." },
    { value: 0.5, label: "Soporte didáctico poco interesante." },
    { value: 0.25, label: "Soporte didáctico inadecuado." }
  ] }
];

const QUICK_NOTES = [
  "Cumple con el tiempo",
  "Buen dominio del tema",
  "Exposición clara",
  "Mantiene el interés",
  "Buena vocalización",
  "Contacto visual adecuado",
  "Material de apoyo adecuado",
  "Debe mejorar la seguridad",
  "Debe controlar mejor el tiempo",
  "Debe fortalecer el soporte visual"
];

const STORAGE_KEY = "lv_sustentacion_fct_3ro_tecnico_2026_v2";
const LEGACY_STORAGE_KEY = "lv_sustentacion_fct_3ro_tecnico_2026_v1";
const WIX_SITE_BASE = "https://chiispiitas.wixsite.com/mr-david-collection";
const PAPER_API_BASE = `${WIX_SITE_BASE}/_functions`;
const apiBase = PAPER_API_BASE;
const SUSTENTACION_ENDPOINT = `${apiBase}/sustentacion`;
const PUBLIC_BASE_URL = "https://chiispiitas.github.io/Lev-Vigotsky/Sustentacion/";
const PRINT_BASE_URL = window.location.protocol === "file:"
  ? PUBLIC_BASE_URL
  : window.location.href.replace(/[^/]*$/, "");

const $ = (selector) => document.querySelector(selector);
const els = {
  activityInput: $("#activityInput"),
  dateInput: $("#dateInput"),
  studentSearch: $("#studentSearch"),
  studentSelect: $("#studentSelect"),
  studentStatus: $("#studentStatus"),
  rubricList: $("#rubricList"),
  scoreValue: $("#scoreValue"),
  scoreStatus: $("#scoreStatus"),
  scoreRing: $("#scoreRing"),
  quickNotes: $("#quickNotes"),
  teacherComment: $("#teacherComment"),
  statAssessed: $("#statAssessed"),
  statPending: $("#statPending"),
  statAverage: $("#statAverage"),
  historyDialog: $("#historyDialog"),
  historyList: $("#historyList"),
  toast: $("#toast"),
  serverStatus: $("#serverStatus")
};

let store = loadStore();
let currentStudentNumber = STUDENTS[0].n;
let suppressChange = false;
let toastTimer = null;

function loadStore() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    const parsed = JSON.parse(current || legacy || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn(error);
    return {};
  }
}

function writeStore() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function defaultCriteria() {
  return Object.fromEntries(RUBRIC.map((criterion) => [criterion.id, criterion.options[0].value]));
}

function todayISO() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function defaultRecord(student) {
  return {
    studentNumber: student.n,
    studentName: student.name,
    activity: els.activityInput?.value || "Sustentación de Prácticas Preprofesionales (FCT)",
    date: todayISO(),
    criteria: defaultCriteria(),
    notes: [],
    comment: "",
    evaluated: false,
    savedAt: null,
    serverSyncedAt: null,
    serverItemId: null
  };
}

function getStudentByNumber(number) {
  return STUDENTS.find((student) => student.n === Number(number)) || STUDENTS[0];
}

function getRecord(number = currentStudentNumber) {
  const student = getStudentByNumber(number);
  const saved = store[String(student.n)];
  return {
    ...defaultRecord(student),
    ...(saved || {}),
    criteria: { ...defaultCriteria(), ...(saved?.criteria || {}) },
    notes: Array.isArray(saved?.notes) ? saved.notes : []
  };
}

function setRecord(number, record) {
  store[String(number)] = {
    ...record,
    studentNumber: Number(number),
    studentName: getStudentByNumber(number).name
  };
  writeStore();
  refreshStats();
  refreshStudentOptions();
}

function readCriteriaFromDom() {
  const values = {};
  RUBRIC.forEach((criterion) => {
    const checked = document.querySelector(`input[name="criterion-${criterion.id}"]:checked`);
    values[criterion.id] = checked ? Number(checked.value) : criterion.options[0].value;
  });
  return values;
}

function readNotesFromDom() {
  return Array.from(document.querySelectorAll(".note-chip.active")).map((button) => button.dataset.note);
}

function saveCurrentDraft(markEvaluated = false) {
  const student = getStudentByNumber(currentStudentNumber);
  const old = getRecord(student.n);
  const next = {
    ...old,
    activity: els.activityInput.value.trim() || "Sustentación de Prácticas Preprofesionales (FCT)",
    date: els.dateInput.value || todayISO(),
    comment: els.teacherComment.value.trim(),
    criteria: readCriteriaFromDom(),
    notes: readNotesFromDom(),
    evaluated: markEvaluated ? true : old.evaluated,
    savedAt: markEvaluated ? new Date().toISOString() : old.savedAt
  };
  setRecord(student.n, next);
  updateStatusPill(next);
  updateScore(next);
  return next;
}

function formatScore(value) {
  const rounded = Math.round(Number(value || 0) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}

function scoreNumber(record) {
  return RUBRIC.reduce((sum, criterion) => sum + Number(record.criteria?.[criterion.id] ?? criterion.options[0].value), 0);
}

function selectedOption(criterion, value) {
  return criterion.options.find((option) => Number(option.value) === Number(value)) || criterion.options[0];
}

function formatDate(iso) {
  if (!iso) return "";
  const [year, month, day] = String(iso).split("-");
  return day && month && year ? `${day}/${month}/${year}` : iso;
}

function formatDateTime(value) {
  try {
    return new Intl.DateTimeFormat("es-EC", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch (error) {
    return String(value || "");
  }
}

function normalizeSearch(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function refreshStudentOptions() {
  const query = normalizeSearch(els.studentSearch.value);
  const list = query ? STUDENTS.filter((student) => normalizeSearch(`${student.n} ${student.name}`).includes(query)) : STUDENTS;
  els.studentSelect.innerHTML = "";
  (list.length ? list : STUDENTS).forEach((student) => {
    const option = document.createElement("option");
    const record = getRecord(student.n);
    option.value = String(student.n);
    option.textContent = `${student.n}. ${student.name}${record.evaluated ? " ✓" : ""}${record.serverSyncedAt ? " ☁" : ""}`;
    els.studentSelect.appendChild(option);
  });
  if (Array.from(els.studentSelect.options).some((option) => Number(option.value) === currentStudentNumber)) {
    els.studentSelect.value = String(currentStudentNumber);
  } else if (els.studentSelect.options.length) {
    els.studentSelect.selectedIndex = 0;
  }
}

function loadStudent(number) {
  saveCurrentDraft(false);
  currentStudentNumber = Number(number);
  const record = getRecord(currentStudentNumber);
  suppressChange = true;
  els.activityInput.value = record.activity || "Sustentación de Prácticas Preprofesionales (FCT)";
  els.dateInput.value = record.date || todayISO();
  els.teacherComment.value = record.comment || "";
  renderRubric(record);
  renderQuickNotes(record);
  updateScore(record);
  updateStatusPill(record);
  refreshStudentOptions();
  suppressChange = false;
}

function renderRubric(record = getRecord()) {
  els.rubricList.innerHTML = "";
  RUBRIC.forEach((criterion) => {
    const card = document.createElement("article");
    card.className = "rubric-card";
    const current = Number(record.criteria?.[criterion.id] ?? criterion.options[0].value);
    card.innerHTML = `
      <div class="rubric-title">
        <h4>${escapeHtml(criterion.title)}</h4>
        <span>Máx. ${formatScore(criterion.max)} punto${criterion.max === 1 ? "" : "s"}</span>
      </div>
      <div class="option-list">
        ${criterion.options.map((option) => `
          <label class="option-row ${Number(option.value) === current ? "selected" : ""}">
            <input type="radio" name="criterion-${criterion.id}" value="${option.value}" ${Number(option.value) === current ? "checked" : ""}/>
            <span class="option-text">${escapeHtml(option.label)}</span>
            <span class="option-points">${formatScore(option.value)}</span>
          </label>`).join("")}
      </div>`;
    card.querySelectorAll("input").forEach((input) => {
      input.addEventListener("change", () => {
        card.querySelectorAll(".option-row").forEach((row) => row.classList.remove("selected"));
        input.closest(".option-row").classList.add("selected");
        updateScore(saveCurrentDraft(false));
      });
    });
    els.rubricList.appendChild(card);
  });
}

function renderQuickNotes(record = getRecord()) {
  const active = new Set(record.notes || []);
  els.quickNotes.innerHTML = "";
  QUICK_NOTES.forEach((note) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `note-chip${active.has(note) ? " active" : ""}`;
    button.dataset.note = note;
    button.textContent = note;
    button.addEventListener("click", () => {
      button.classList.toggle("active");
      saveCurrentDraft(false);
    });
    els.quickNotes.appendChild(button);
  });
}

function updateScore(record = getRecord()) {
  const total = scoreNumber(record);
  const percent = Math.round(total / 10 * 100);
  els.scoreValue.textContent = `${formatScore(total)} / 10`;
  els.scoreStatus.textContent = total >= 9 ? "Desempeño destacado" : total >= 7 ? "Desempeño satisfactorio" : total >= 5 ? "Requiere refuerzo" : "Requiere acompañamiento";
  els.scoreRing.textContent = `${percent}%`;
  els.scoreRing.style.background = `conic-gradient(var(--gold) ${Math.max(0, Math.min(100, percent)) * 3.6}deg, rgba(255,255,255,.18) 0deg)`;
}

function updateStatusPill(record = getRecord()) {
  els.studentStatus.classList.toggle("saved", !!record.evaluated);
  els.studentStatus.classList.toggle("pending", !record.evaluated);
  els.studentStatus.textContent = record.serverSyncedAt ? "En SERVER" : record.evaluated ? "Guardado" : "Pendiente";
}

function refreshStats() {
  const records = STUDENTS.map((student) => getRecord(student.n));
  const assessed = records.filter((record) => record.evaluated);
  const average = assessed.length ? assessed.reduce((sum, record) => sum + scoreNumber(record), 0) / assessed.length : 0;
  els.statAssessed.textContent = String(assessed.length);
  els.statPending.textContent = String(STUDENTS.length - assessed.length);
  els.statAverage.textContent = assessed.length ? `${formatScore(average)} / 10` : "—";
}

function markMaximum() {
  renderRubric({ ...getRecord(), criteria: defaultCriteria() });
  updateScore(saveCurrentDraft(false));
  showToast("Criterios marcados con puntaje máximo");
}

function clearNotes() {
  document.querySelectorAll(".note-chip.active").forEach((button) => button.classList.remove("active"));
  els.teacherComment.value = "";
  saveCurrentDraft(false);
  showToast("Observaciones limpiadas");
}

function resetCurrent() {
  if (!confirm("¿Restablecer la evaluación del estudiante actual?")) return;
  delete store[String(currentStudentNumber)];
  writeStore();
  const record = getRecord(currentStudentNumber);
  suppressChange = true;
  els.activityInput.value = record.activity;
  els.dateInput.value = todayISO();
  els.teacherComment.value = "";
  renderRubric(record);
  renderQuickNotes(record);
  updateScore(record);
  updateStatusPill(record);
  refreshStats();
  refreshStudentOptions();
  suppressChange = false;
  showToast("Evaluación restablecida");
}

function saveCurrentReport() {
  saveCurrentDraft(true);
  showToast("Evaluación guardada");
}

function getExportRows(onlySaved = false) {
  return STUDENTS
    .map((student) => {
      const record = getRecord(student.n);
      return {
        student,
        record,
        total: scoreNumber(record),
        status: record.evaluated ? "Evaluado" : "Pendiente"
      };
    })
    .filter((row) => onlySaved ? row.record.evaluated : true);
}

function criterionPayload(record) {
  return RUBRIC.map((criterion) => {
    const value = Number(record.criteria[criterion.id]);
    const option = selectedOption(criterion, value);
    return {
      id: criterion.id,
      title: criterion.title,
      max: criterion.max,
      value,
      descriptor: option.label
    };
  });
}

function buildServerRecord(row, batchId) {
  const { student, record, total, status } = row;
  const criteria = criterionPayload(record);
  const savedKey = record.savedAt || `${record.date}-${student.n}`;
  return {
    title: `${student.n}. ${student.name} - ${formatScore(total)} / 10`,
    localRecordKey: `${COURSE.id}-${student.n}-${savedKey}`,
    batchId,
    courseId: COURSE.id,
    courseLabel: COURSE.label,
    course: COURSE.course,
    specialty: COURSE.specialty,
    period: COURSE.period,
    institution: COURSE.institution,
    activity: record.activity,
    evaluationDate: record.date,
    studentNumber: student.n,
    studentName: student.name,
    status,
    scoreTotal: Math.round(total * 100) / 100,
    scorePercent: Math.round(total / 10 * 100),
    criteriaJson: JSON.stringify(criteria),
    notesJson: JSON.stringify(record.notes || []),
    notesText: (record.notes || []).join(" · "),
    comment: record.comment || "",
    savedAt: record.savedAt || null,
    submittedAt: new Date().toISOString(),
    source: "GitHub Pages Sustentacion rubric"
  };
}

async function postToSustentacionServer(payload) {
  /*
    Same connection style as Quiz: a hardcoded Wix _functions base URL.
    The body is sent as text/plain to avoid an OPTIONS preflight when previewing locally.
    The Wix backend helper accepts both JSON and plain-text JSON bodies.
  */
  return fetch(SUSTENTACION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(payload)
  });
}

async function submitScoresToServer() {
  saveCurrentDraft(false);
  const rows = getExportRows(true);
  if (!rows.length) {
    showToast("Guarda al menos una evaluación antes de enviar al SERVER");
    return;
  }

  const button = $("#submitServer");
  const barButton = $("#submitServerBar");
  const oldText = button.textContent;
  const oldBarText = barButton.textContent;
  const batchId = `${COURSE.id}-${new Date().toISOString()}`;
  const payload = {
    collection: "Sustentacion",
    course: COURSE,
    batchId,
    records: rows.map((row) => buildServerRecord(row, batchId))
  };

  try {
    button.disabled = true;
    barButton.disabled = true;
    button.textContent = "Enviando…";
    barButton.textContent = "…";
    setServerStatus("Enviando datos al CMS…", false);

    const response = await postToSustentacionServer(payload);

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `SERVER ${response.status}`);
    }

    const syncedAt = new Date().toISOString();
    rows.forEach(({ student }) => {
      const record = getRecord(student.n);
      record.serverSyncedAt = syncedAt;
      setRecord(student.n, record);
    });
    updateStatusPill(getRecord(currentStudentNumber));
    setServerStatus(`${rows.length} evaluación(es) enviadas al CMS Sustentacion.`, false);
    showToast("Calificaciones enviadas al SERVER");
  } catch (error) {
    console.error(error);
    const localHint = window.location.protocol === "file:" ? " Abre la página desde GitHub Pages o con un servidor local si el navegador bloquea file://." : "";
    setServerStatus(`No se pudo enviar al SERVER: ${error.message}.${localHint}`, true);
    showToast("No se pudo enviar al SERVER");
  } finally {
    button.disabled = false;
    barButton.disabled = false;
    button.textContent = oldText;
    barButton.textContent = oldBarText;
  }
}

function setServerStatus(message, isError) {
  if (!els.serverStatus) return;
  els.serverStatus.textContent = message;
  els.serverStatus.classList.toggle("error", !!isError);
}

function buildPrintableHtml(rows, title = "Reporte general de sustentación") {
  const assessed = rows.filter((row) => row.record.evaluated);
  const average = assessed.length ? assessed.reduce((sum, row) => sum + row.total, 0) / assessed.length : 0;
  const generalRows = rows.map(({ student, record, total, status }) => `
    <tr class="${status === "Pendiente" ? "pending" : ""}">
      <td>${student.n}</td>
      <td><strong>${escapeHtml(student.name)}</strong></td>
      <td>${escapeHtml(status)}</td>
      <td class="score">${status === "Evaluado" ? escapeHtml(formatScore(total)) : "—"}</td>
      <td>${status === "Evaluado" ? escapeHtml(record.notes.join(" · ")) : ""}</td>
      <td>${status === "Evaluado" ? escapeHtml(record.comment) : ""}</td>
    </tr>`).join("");

  const detailRows = assessed.map(({ student, record, total }) => `
    <section class="student-detail">
      <h3>${student.n}. ${escapeHtml(student.name)} <span>${escapeHtml(formatScore(total))} / 10</span></h3>
      <table>
        <thead><tr><th>Criterio</th><th>Descriptor asignado</th><th>Puntaje</th></tr></thead>
        <tbody>
          ${RUBRIC.map((criterion) => {
            const value = Number(record.criteria[criterion.id]);
            const option = selectedOption(criterion, value);
            return `<tr><td>${escapeHtml(criterion.title)}</td><td>${escapeHtml(option.label)}</td><td class="score">${escapeHtml(formatScore(value))} / ${escapeHtml(formatScore(criterion.max))}</td></tr>`;
          }).join("")}
        </tbody>
      </table>
    </section>`).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<base href="${PRINT_BASE_URL}">
<style>
body{font-family:Arial,sans-serif;margin:0;color:#172033;background:#f4f1e9}.wrap{max-width:1100px;margin:0 auto;padding:26px}.header{background:#14213d;color:#fff;padding:24px;border-radius:18px}.head-row{display:flex;align-items:center;gap:16px}.report-logo{width:118px;height:auto;background:#fff;border-radius:12px;padding:4px;object-fit:contain}.header h1{margin:0;font-size:28px;line-height:1.05}.header p{margin:8px 0 0;color:#f4e6c0;font-weight:700}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.summary div{background:#fff;border:1px solid #ddd6c7;border-radius:14px;padding:14px}.summary span{display:block;font-size:11px;color:#5c6678;text-transform:uppercase;letter-spacing:.08em;font-weight:bold}.summary strong{display:block;margin-top:6px;font-size:22px;color:#14213d}h2{color:#14213d;margin:22px 0 10px}table{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;margin-bottom:18px}th,td{border:1px solid #ded7ca;padding:8px;font-size:12px;vertical-align:top}th{background:#f4e6c0;color:#14213d;text-align:left}tr.pending{color:#777;background:#f8f8f8}.score{text-align:center;font-weight:bold;white-space:nowrap}.student-detail{break-inside:avoid;margin-top:16px}.student-detail h3{display:flex;justify-content:space-between;gap:12px;background:#fff;border:1px solid #ded7ca;border-radius:12px;padding:12px;color:#14213d}.toolbar{display:flex;gap:8px;margin:16px 0}button{border:0;border-radius:10px;padding:10px 14px;background:#14213d;color:#fff;font-weight:bold;cursor:pointer}@media print{body{background:#fff}.toolbar{display:none}.wrap{padding:0}.header{border-radius:0}.summary{grid-template-columns:repeat(4,1fr)}}
</style>
</head>
<body>
<div class="wrap">
<section class="header">
  <div class="head-row"><img class="report-logo" src="logo-ueplv.svg" alt="Logo UEPLV"><h1>${escapeHtml(title)}</h1></div>
  <p>${escapeHtml(COURSE.institution)} · ${escapeHtml(COURSE.label)} · ${escapeHtml(COURSE.specialty)} · Período ${escapeHtml(COURSE.period)}</p>
  <p>Generado: ${escapeHtml(formatDateTime(new Date()))}</p>
</section>
<div class="toolbar"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div>
<section class="summary">
  <div><span>Total</span><strong>${rows.length}</strong></div>
  <div><span>Evaluados</span><strong>${assessed.length}</strong></div>
  <div><span>Pendientes</span><strong>${rows.length - assessed.length}</strong></div>
  <div><span>Promedio</span><strong>${assessed.length ? `${escapeHtml(formatScore(average))} / 10` : "—"}</strong></div>
</section>
<h2>Consolidado general</h2>
<table><thead><tr><th>No.</th><th>Estudiante</th><th>Estado</th><th>Puntaje /10</th><th>Observaciones rápidas</th><th>Comentario</th></tr></thead><tbody>${generalRows}</tbody></table>
<h2>Detalle de rúbrica</h2>
${detailRows || "<p>No hay evaluaciones guardadas todavía.</p>"}
</div>
</body>
</html>`;
}

function exportClassPdf() {
  saveCurrentDraft(false);
  openPrintableReport(buildPrintableHtml(getExportRows(false), "Rúbrica de Sustentación de Práctica Preprofesional"));
  showToast("Reporte imprimible generado");
}

function openPrintableReport(html) {
  const popup = window.open("", "_blank");
  if (!popup) {
    downloadBlob(html, `rubrica-sustentacion-${dateForFilename()}.html`, "text/html;charset=utf-8");
    showToast("El navegador bloqueó la ventana; se descargó HTML");
    return;
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function dateForFilename() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function openHistory() {
  renderHistory();
  els.historyDialog.showModal();
}

function renderHistory() {
  const rows = getExportRows(true).sort((a, b) => Number(a.student.n) - Number(b.student.n));
  els.historyList.innerHTML = "";
  if (!rows.length) {
    els.historyList.innerHTML = `<div class="empty-state">No hay evaluaciones guardadas todavía.</div>`;
    return;
  }
  rows.forEach(({ student, record, total }) => {
    const item = document.createElement("article");
    item.className = "history-item";
    item.innerHTML = `
      <h3>${student.n}. ${escapeHtml(student.name)}</h3>
      <p>Puntaje: <strong>${escapeHtml(formatScore(total))} / 10</strong> · Fecha: ${escapeHtml(formatDate(record.date))}${record.serverSyncedAt ? " · SERVER" : ""}</p>
      <p>${escapeHtml(record.comment || record.notes.join(" · ") || "Sin comentario adicional")}</p>`;
    item.addEventListener("click", () => {
      els.historyDialog.close();
      loadStudent(student.n);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    els.historyList.appendChild(item);
  });
}

function clearHistory() {
  if (!confirm("¿Borrar todas las evaluaciones guardadas de este dispositivo?")) return;
  store = {};
  writeStore();
  loadStudent(STUDENTS[0].n);
  renderHistory();
  showToast("Registros borrados");
}

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1900);
}

function bindEvents() {
  els.studentSearch.addEventListener("input", refreshStudentOptions);
  els.studentSelect.addEventListener("change", () => loadStudent(Number(els.studentSelect.value)));
  els.activityInput.addEventListener("input", () => { if (!suppressChange) saveCurrentDraft(false); });
  els.dateInput.addEventListener("input", () => { if (!suppressChange) saveCurrentDraft(false); });
  els.teacherComment.addEventListener("input", () => { if (!suppressChange) saveCurrentDraft(false); });

  $("#previousStudent").addEventListener("click", () => {
    const index = STUDENTS.findIndex((student) => student.n === currentStudentNumber);
    loadStudent(STUDENTS[Math.max(0, index - 1)].n);
  });
  $("#nextStudent").addEventListener("click", () => {
    const index = STUDENTS.findIndex((student) => student.n === currentStudentNumber);
    loadStudent(STUDENTS[Math.min(STUDENTS.length - 1, index + 1)].n);
  });
  $("#resetCurrent").addEventListener("click", resetCurrent);
  $("#markExcellent").addEventListener("click", markMaximum);
  $("#clearNotes").addEventListener("click", clearNotes);
  $("#saveReport").addEventListener("click", saveCurrentReport);
  $("#submitServer").addEventListener("click", submitScoresToServer);
  $("#submitServerBar").addEventListener("click", submitScoresToServer);
  $("#exportClassPdf").addEventListener("click", exportClassPdf);
  $("#exportClassPdfBar").addEventListener("click", exportClassPdf);
  $("#openHistory").addEventListener("click", openHistory);
  $("#closeHistory").addEventListener("click", () => els.historyDialog.close());
  $("#clearHistory").addEventListener("click", clearHistory);
}

function init() {
  els.dateInput.value = todayISO();
  bindEvents();
  refreshStudentOptions();
  renderRubric(getRecord());
  renderQuickNotes(getRecord());
  updateScore(getRecord());
  updateStatusPill(getRecord());
  refreshStats();
}

init();
