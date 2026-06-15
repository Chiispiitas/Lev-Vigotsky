"use strict";
/* ---------------------------------------------- 
     Scene Pool Select Made by: David Santana 
----------------------------------------------  */

window.WhiteboardGameScenes = window.WhiteboardGameScenes || {};

/* ---------------------------------------------- 
     Add Button Listeners 
----------------------------------------------  */
/* ---------------------------------------------- 
     Bind Pool Scene 
----------------------------------------------  */
function bindPoolScene() {
     bindPool();
     bindMenuEffects();
     updateStats();
}

/* ---------------------------------------------- 
     Bind Menu Effects 
----------------------------------------------  */
function bindMenuEffects() {
  const poolScreen = $("#poolScreen");
  if (!poolScreen) return;

  let lastHoverSound = 0;

  poolScreen.addEventListener("pointerenter", event => {
    const target = event.target.closest(".arcade-btn:not(:disabled), .drop-zone, .setup-card");
    if (!target) return;
    const now = performance.now();
    if (now - lastHoverSound > 85) {
      playSound("click");
      lastHoverSound = now;
    }
  }, true);

  poolScreen.addEventListener("pointerdown", event => {
    const target = event.target.closest(".arcade-btn:not(:disabled), .drop-zone, .setup-card");
    if (!target) return;
    makeMenuBurst(event.clientX, event.clientY);
  });
}
/* ---------------------------------------------- 
     Make Menu Burst 
----------------------------------------------  */
function makeMenuBurst(clientX, clientY) {
  const poolScreen = $("#poolScreen");
  const stage = $("#stage");
  if (!poolScreen || !stage) return;

  const rect = stage.getBoundingClientRect();
  const scaleX = 1920 / rect.width;
  const scaleY = 1080 / rect.height;
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;

  for (let i = 0; i < 12; i++) {
    const particle = document.createElement("i");
    particle.className = "menu-pop-particle";
    const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.26;
    const distance = 54 + Math.random() * 54;
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    particle.style.setProperty("--rot", `${Math.random() * 520 - 260}deg`);
    particle.style.animationDelay = `${Math.random() * 0.045}s`;
    poolScreen.appendChild(particle);
    setTimeout(() => particle.remove(), 720);
  }
}
/* ---------------------------------------------- 
     Bind Pool 
----------------------------------------------  */
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
    state.questions = cloneQuestions(SAMPLE_QUESTIONS);
    setStatus(`Loaded included sample with ${state.questions.length} questions.`, "good");
    playSound("select");
    updateStats();
    openPoolEditor(false);
  });
  $("#newPoolBtn").addEventListener("click", () => {
    playSound("select");
    openPoolEditor(true);
  });
  $("#editPoolBtn").addEventListener("click", () => {
    playSound("click");
    openPoolEditor(false);
  });
  $("#exportPoolBtn").addEventListener("click", () => {
    playSound("enter");
    exportQuestionsToXlsx(state.questions);
  });
  $("#goTeamsBtn").addEventListener("click", () => {
    if (!state.questions.length) return;
    playSound("start");
    showScreen("baseModeSelect");
  });
}
/* ---------------------------------------------- 
     Load XLSX 
----------------------------------------------  */
async function loadXlsx(file) {
  try {
    setStatus("Reading XLSX file...", "");
    const rows = await readXlsxRows(await file.arrayBuffer());
    const questions = parseKahootRows(rows);
    if (!questions.length) throw new Error("No valid questions found.");
    state.questions = questions;
    setStatus(`Loaded ${questions.length} questions from ${file.name}.`, "good");
    playSound("select");
    openPoolEditor(false);
  } catch (err) {
    console.error(err);
    state.questions = [];
    setStatus(`Could not load file. ${err.message}`, "bad");
  }
  updateStats();
}
/* ---------------------------------------------- 
     Set Status 
----------------------------------------------  */
function setStatus(text, type) {
  const box = $("#fileStatus");
  box.textContent = text;
  box.classList.remove("good", "bad");
  if (type) box.classList.add(type);
}
/* ---------------------------------------------- 
     Update Stats 
----------------------------------------------  */
function updateStats() {
  const total = state.questions.length;
  const choice = state.questions.filter(q => q.type === "choice").length;
  const typed = state.questions.filter(q => q.type === "type").length;
  const nums = $("#poolStats").querySelectorAll("b");
  nums[0].textContent = total;
  nums[1].textContent = choice;
  nums[2].textContent = typed;
  $("#goTeamsBtn").disabled = total === 0;
  $("#editPoolBtn").disabled = total === 0;
  $("#exportPoolBtn").disabled = total === 0;
}
/* ---------------------------------------------- 
     Clone Questions 
----------------------------------------------  */
function cloneQuestions(questions) {
  return questions.map(q => ({
    question: q.question || "",
    answers: [...(q.answers || [])],
    timeLimit: Number(q.timeLimit) || 20,
    correctRaw: String(q.correctRaw ?? "1"),
    type: q.type || ((q.answers || []).length >= 2 ? "choice" : "type")
  }));
}
/* ---------------------------------------------- 
     Blank Question 
----------------------------------------------  */
function blankQuestion(type = "type") {
  return {
    question: "",
    answers: type === "choice" ? ["", "", "", ""] : ["", "", "", ""],
    timeLimit: 20,
    correctRaw: "1",
    type
  };
}
/* ---------------------------------------------- 
     Open Pool Editor 
----------------------------------------------  */
function openPoolEditor(newPool = false) {
  state.editorQuestions = newPool || !state.questions.length ? [blankQuestion("type")] : cloneQuestions(state.questions);
  renderPoolEditor();
  $("#poolEditorModal").classList.remove("hidden");
}
/* ---------------------------------------------- 
     Close Pool Editor 
----------------------------------------------  */
function closePoolEditor() {
  $("#poolEditorModal").classList.add("hidden");
}
/* ---------------------------------------------- 
     Bind Pool Editor Once 
----------------------------------------------  */
function bindPoolEditorOnce() {
  if (bindPoolEditorOnce.bound) return;
  bindPoolEditorOnce.bound = true;
  $("#closePoolEditorBtn").addEventListener("click", () => { playSound("back"); closePoolEditor(); });
  $("#addQuestionBtn").addEventListener("click", () => {
    playSound("click");
    collectEditorQuestions(false);
    state.editorQuestions.push(blankQuestion("type"));
    renderPoolEditor();
  });
  $("#clearPoolEditorBtn").addEventListener("click", () => {
    playSound("back");
    state.editorQuestions = [blankQuestion("type")];
    renderPoolEditor();
  });
  $("#savePoolEditorBtn").addEventListener("click", () => {
    playSound("enter");
    const questions = collectEditorQuestions(true);
    if (!questions) return;
    state.questions = questions;
    setStatus(`Pool ready with ${state.questions.length} questions.`, "good");
    updateStats();
    closePoolEditor();
  });
  $("#exportEditorBtn").addEventListener("click", () => {
    playSound("enter");
    const questions = collectEditorQuestions(true);
    if (!questions) return;
    state.editorQuestions = cloneQuestions(questions);
    exportQuestionsToXlsx(questions);
  });
  $("#poolEditorRows").addEventListener("input", () => refreshEditorRows());
  $("#poolEditorRows").addEventListener("change", () => refreshEditorRows());
  $("#poolEditorRows").addEventListener("click", (event) => {
    const del = event.target.closest(".delete-question-btn");
    if (!del) return;
    playSound("back");
    collectEditorQuestions(false);
    state.editorQuestions.splice(Number(del.dataset.index), 1);
    if (!state.editorQuestions.length) state.editorQuestions.push(blankQuestion("type"));
    renderPoolEditor();
  });
}
/* ---------------------------------------------- 
     Render Pool Editor 
----------------------------------------------  */
function renderPoolEditor() {
  bindPoolEditorOnce();
  const body = $("#poolEditorRows");
  body.innerHTML = "";
  state.editorQuestions.forEach((q, index) => {
    const answers = [...(q.answers || [])];
    while (answers.length < 4) answers.push("");
    const correctIndexes = getEditorCorrectIndexes(q, answers);
    const type = getEditorTypeIconHtml(answers.filter(Boolean).length);
    const tr = document.createElement("tr");
    tr.className = "pool-editor-row";
    tr.dataset.index = String(index);
    tr.innerHTML = `
      <td class="row-num">${index + 1}</td>
      <td><textarea class="edit-question" rows="2" placeholder="¿Cómo se dice ... en inglés?">${esc(q.question || "")}</textarea></td>
      ${[0, 1, 2, 3].map(answerIndex => renderEditorAnswerCell(answerIndex, answers[answerIndex], correctIndexes.includes(answerIndex))).join("")}
      <td><input class="edit-time" type="number" min="5" max="300" value="${Number(q.timeLimit) || 20}" /></td>
      <td class="edit-type">${type}</td>
      <td><button class="delete-question-btn" data-index="${index}">✕</button></td>
    `;
    body.appendChild(tr);
  });
  refreshEditorRows();
}
/* ---------------------------------------------- 
     Render Editor Answer Cell 
----------------------------------------------  */
function renderEditorAnswerCell(answerIndex, value, checked) {
  const disabled = !String(value || "").trim() ? "disabled" : "";
  const marked = checked && !disabled ? "checked" : "";
  return `
    <td>
      <div class="editor-answer-cell">
        <input class="edit-answer" data-answer="${answerIndex}" value="${esc(value)}" placeholder="${answerIndex == 0 ? "Answer 1" : "optional"}" />
        <label class="correct-check-wrap">
          <input class="edit-correct-check" type="checkbox" data-answer="${answerIndex}" ${marked} ${disabled} />
        </label>
      </div>
    </td>`;
}
/* ---------------------------------------------- 
     Get Editor Type Icon HTML 
----------------------------------------------  */
function getEditorTypeIconHtml(count) {
  if (count >= 2) {
    return `<span class="edit-type-icon choice" title="Choice question">🔘</span>`;
  }
  return `<span class="edit-type-icon typed" title="Typed answer">⌨️</span>`;
}

/* ---------------------------------------------- 
     Get Editor Correct Indexes 
----------------------------------------------  */
function getEditorCorrectIndexes(question, answers) {
  const raw = String(question.correctRaw || "1").trim();
  const tokens = raw.split(/[,;|/ ]+/).map(token => token.trim()).filter(Boolean);
  const indexes = [];

  tokens.forEach(token => {
    if (/^\d+$/.test(token)) {
      const index = Number(token) - 1;
      if (index >= 0 && index < answers.length && String(answers[index] || "").trim()) indexes.push(index);
    } else {
      const normalized = normalize(token);
      const index = answers.findIndex(answer => normalize(answer) === normalized);
      if (index >= 0 && String(answers[index] || "").trim()) indexes.push(index);
    }
  });

  if (!indexes.length) {
    const firstFilled = answers.findIndex(answer => String(answer || "").trim());
    if (firstFilled >= 0) indexes.push(firstFilled);
  }

  return [...new Set(indexes)];
}
/* ---------------------------------------------- 
     Refresh Editor Rows 
----------------------------------------------  */
function refreshEditorRows() {
  $$(".pool-editor-row").forEach(row => {
    const answerInputs = $$(".edit-answer", row);
    const checks = $$(".edit-correct-check", row);
    const count = answerInputs.filter(input => input.value.trim()).length;
    const typeCell = row.querySelector(".edit-type");

    checks.forEach(check => {
      const answerInput = row.querySelector(`.edit-answer[data-answer="${check.dataset.answer}"]`);
      const empty = !answerInput || !answerInput.value.trim();
      if (empty) check.checked = false;
      check.disabled = empty;
    });

    if (count > 0 && !checks.some(check => check.checked && !check.disabled)) {
      const firstAvailable = checks.find(check => !check.disabled);
      if (firstAvailable) firstAvailable.checked = true;
    }

    if (typeCell) typeCell.innerHTML = getEditorTypeIconHtml(count);
  });
}
/* ---------------------------------------------- 
     Collect Editor Questions 
----------------------------------------------  */
function collectEditorQuestions(validate) {
  const questions = [];
  $$(".pool-editor-row").forEach(row => {
    const question = row.querySelector(".edit-question").value.trim();
    const answerInputs = $$(".edit-answer", row);
    const answers = answerInputs.map(input => input.value.trim());
    const filledIndexes = answers.map((answer, index) => answer ? index : -1).filter(index => index >= 0);
    const cleanAnswers = filledIndexes.map(index => answers[index]);
    const timeLimit = Math.max(5, Math.min(300, Number(row.querySelector(".edit-time").value) || 20));
    const checkedIndexes = $$(".edit-correct-check", row)
      .filter(check => check.checked && !check.disabled && answers[Number(check.dataset.answer)])
      .map(check => Number(check.dataset.answer));
    const correctNumbers = checkedIndexes
      .map(index => filledIndexes.indexOf(index) + 1)
      .filter(number => number > 0);
    const correctRaw = (correctNumbers.length ? correctNumbers : [1]).join(",");
    if (!question && !cleanAnswers.length) return;
    questions.push({
      question,
      answers: cleanAnswers,
      timeLimit,
      correctRaw,
      type: cleanAnswers.length >= 2 ? "choice" : "type"
    });
  });

  if (validate) {
    if (!questions.length) {
      alert("Add at least one complete question.");
      return null;
    }
    const badIndex = questions.findIndex(q => !q.question || !q.answers.length);
    if (badIndex >= 0) {
      alert(`Question ${badIndex + 1} needs a prompt and at least one answer.`);
      return null;
    }
  }

  state.editorQuestions = cloneQuestions(questions.length ? questions : [blankQuestion("type")]);
  return questions;
}
/* ---------------------------------------------- 
     Editor Alert 
----------------------------------------------  */
function editorAlert(text) {
  if (text) alert(text);
}
/* ---------------------------------------------- 
     Export Questions To XLSX 
----------------------------------------------  */
function exportQuestionsToXlsx(questions) {
  const clean = (questions || []).filter(q => q.question && q.answers && q.answers.length);
  if (!clean.length) {
    editorAlert("There is no complete question to export.");
    return;
  }
  const xlsxBytes = createKahootXlsx(clean);
  const blob = new Blob([xlsxBytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "question_pool_kahoot_format.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
  console.log("Exported as Kahoot-format XLSX.");
}
/* ---------------------------------------------- 
     XML Escape 
----------------------------------------------  */
function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
/* ---------------------------------------------- 
     Text Cell 
----------------------------------------------  */
function textCell(ref, value) {
  return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
}
/* ---------------------------------------------- 
     Number Cell 
----------------------------------------------  */
function numberCell(ref, value) {
  const n = Number(value) || 0;
  return `<c r="${ref}"><v>${n}</v></c>`;
}
/* ---------------------------------------------- 
     Row XML 
----------------------------------------------  */
function rowXml(rowNumber, cells) {
  return `<row r="${rowNumber}">${cells.join("")}</row>`;
}
/* ---------------------------------------------- 
     Create Kahoot Sheet XML 
----------------------------------------------  */
function createKahootSheetXml(questions) {
  const rows = [];
  rows.push(rowXml(1, []));
  rows.push(rowXml(2, [textCell("B2", "Quiz template (download the file to use it)")]));
  rows.push(rowXml(3, [textCell("B3", "Add questions, at least two answer alternatives, time limit and choose correct answers (at least one). Have fun creating your awesome quiz!")]));
  rows.push(rowXml(4, [textCell("B4", "Remember: questions have a limit of 120 characters and answers can have 75 characters max. If several answers are correct, separate them with a comma.")]));
  rows.push(rowXml(5, [textCell("B5", "Type-answer questions for Board Quiz Arcade use only Answer 1.")]));
  rows.push(rowXml(6, [textCell("B6", "If you use Excel or Google Sheets, keep the file exported as .xlsx.")]));
  rows.push(rowXml(7, []));
  rows.push(rowXml(8, [
    textCell("A8", ""),
    textCell("B8", "Question - 120 max length"),
    textCell("C8", "Answer 1 - 75 max length"),
    textCell("D8", "Answer 2 - 75 max length"),
    textCell("E8", "Answer 3 - 75 max length"),
    textCell("F8", "Answer 4 - 75 max length"),
    textCell("G8", "Time limit"),
    textCell("H8", "Correct answer(s)")
  ]));

  questions.forEach((q, i) => {
    const r = i + 9;
    const answers = [...(q.answers || [])];
    while (answers.length < 4) answers.push("");
    rows.push(rowXml(r, [
      numberCell(`A${r}`, i + 1),
      textCell(`B${r}`, q.question || ""),
      textCell(`C${r}`, answers[0] || ""),
      textCell(`D${r}`, answers[1] || ""),
      textCell(`E${r}`, answers[2] || ""),
      textCell(`F${r}`, answers[3] || ""),
      numberCell(`G${r}`, q.timeLimit || 20),
      textCell(`H${r}`, q.correctRaw || "1")
    ]));
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<dimension ref="A1:H${Math.max(9, questions.length + 8)}"/>
<sheetViews><sheetView workbookViewId="0"/></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>
  <col min="1" max="1" width="8" customWidth="1"/>
  <col min="2" max="2" width="48" customWidth="1"/>
  <col min="3" max="6" width="24" customWidth="1"/>
  <col min="7" max="8" width="16" customWidth="1"/>
</cols>
<sheetData>${rows.join("")}</sheetData>
</worksheet>`;
}
/* ---------------------------------------------- 
     Create Kahoot XLSX 
----------------------------------------------  */
function createKahootXlsx(questions) {
  const now = new Date().toISOString();
  const files = [
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>` },
    { name: "docProps/core.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>Board Quiz Arcade Question Pool</dc:title>
<dc:creator>Board Quiz Arcade</dc:creator>
<cp:lastModifiedBy>Board Quiz Arcade</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>` },
    { name: "docProps/app.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>Board Quiz Arcade</Application>
</Properties>` },
    { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>` },
    { name: "xl/styles.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="1"><font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font></fonts>
<fills count="1"><fill><patternFill patternType="none"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>` },
    { name: "xl/worksheets/sheet1.xml", content: createKahootSheetXml(questions) }
  ];
  return makeZip(files);
}
/* ---------------------------------------------- 
     Make Zip 
----------------------------------------------  */
function makeZip(files) {
  const encoder = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;

  files.forEach(file => {
    const nameBytes = encoder.encode(file.name);
    const data = typeof file.content === "string" ? encoder.encode(file.content) : file.content;
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    parts.push(local, data);

    const c = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(c.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    c.set(nameBytes, 46);
    central.push(c);
    offset += local.length + data.length;
  });

  const centralOffset = offset;
  let centralSize = 0;
  central.forEach(c => { parts.push(c); centralSize += c.length; });

  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, centralOffset, true);
  ev.setUint16(20, 0, true);
  parts.push(end);

  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  parts.forEach(part => { out.set(part, p); p += part.length; });
  return out;
}
/* ---------------------------------------------- 
     C R C  T A B L E 
----------------------------------------------  */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
/* ---------------------------------------------- 
     CRC32 
----------------------------------------------  */
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
/* ---------------------------------------------- 
     Elements By Local Name 
----------------------------------------------  */
function elementsByLocalName(root, name) {
  return [...root.getElementsByTagName("*")].filter(el => el.localName === name || el.nodeName === name);
}
/* ---------------------------------------------- 
     Read XLSX Rows 
----------------------------------------------  */
async function readXlsxRows(arrayBuffer) {
  const zip = readZipDirectory(arrayBuffer);
  const workbookXml = await getZipText(zip, "xl/workbook.xml");
  const relsXml = await getZipText(zip, "xl/_rels/workbook.xml.rels").catch(() => "");
  const sheetPath = firstSheetPath(workbookXml, relsXml, zip) || "xl/worksheets/sheet1.xml";
  const shared = await readSharedStrings(zip);
  return parseWorksheet(await getZipText(zip, sheetPath), shared);
}
/* ---------------------------------------------- 
     Read Zip Directory 
----------------------------------------------  */
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
/* ---------------------------------------------- 
     Find Eocd 
----------------------------------------------  */
function findEocd(bytes) {
  const min = Math.max(0, bytes.length - 66000);
  for (let i = bytes.length - 22; i >= min; i--) {
    if (bytes[i] === 0x50 && bytes[i+1] === 0x4b && bytes[i+2] === 0x05 && bytes[i+3] === 0x06) return i;
  }
  return -1;
}
/* ---------------------------------------------- 
     Get Zip Text 
----------------------------------------------  */
async function getZipText(zip, path) {
  return new TextDecoder("utf-8").decode(await getZipBuffer(zip, cleanPath(path)));
}
/* ---------------------------------------------- 
     Get Zip Buffer 
----------------------------------------------  */
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
/* ---------------------------------------------- 
     Read Shared Strings 
----------------------------------------------  */
async function readSharedStrings(zip) {
  if (!zip.entries.has("xl/sharedStrings.xml")) return [];
  const doc = new DOMParser().parseFromString(await getZipText(zip, "xl/sharedStrings.xml"), "application/xml");
  return elementsByLocalName(doc, "si").map(si => elementsByLocalName(si, "t").map(t => t.textContent || "").join(""));
}
/* ---------------------------------------------- 
     First Sheet Path 
----------------------------------------------  */
function firstSheetPath(workbookXml, relsXml, zip) {
  try {
    const doc = new DOMParser().parseFromString(workbookXml, "application/xml");
    const sheet = elementsByLocalName(doc, "sheet")[0];
    if (!sheet) return null;
    const rid = sheet.getAttribute("r:id") || sheet.getAttribute("id");
    if (!rid || !relsXml) return zip.entries.has("xl/worksheets/sheet1.xml") ? "xl/worksheets/sheet1.xml" : null;
    const rels = new DOMParser().parseFromString(relsXml, "application/xml");
    const rel = elementsByLocalName(rels, "Relationship").find(r => r.getAttribute("Id") === rid);
    if (!rel) return null;
    let target = rel.getAttribute("Target") || "";
    target = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
    return cleanPath(target);
  } catch { return null; }
}
/* ---------------------------------------------- 
     Clean Path 
----------------------------------------------  */
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
/* ---------------------------------------------- 
     Parse Worksheet 
----------------------------------------------  */
function parseWorksheet(xml, shared) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const rows = [];
  elementsByLocalName(doc, "row").forEach((rowNode, rowIndex) => {
    const rowNumber = Number(rowNode.getAttribute("r") || rowIndex + 1) - 1;
    const row = rows[rowNumber] || [];
    elementsByLocalName(rowNode, "c").forEach(cell => {
      const ref = cell.getAttribute("r") || "";
      const col = lettersToCol(ref.replace(/[0-9]/g, ""));
      row[col] = cellValue(cell, shared);
    });
    rows[rowNumber] = row;
  });
  return rows;
}
/* ---------------------------------------------- 
     Cell Value 
----------------------------------------------  */
function cellValue(cell, shared) {
  const type = cell.getAttribute("t");
  if (type === "inlineStr") return elementsByLocalName(cell, "t").map(t => t.textContent || "").join("");
  const v = elementsByLocalName(cell, "v")[0];
  const raw = v ? v.textContent || "" : "";
  if (type === "s") return shared[Number(raw)] ?? "";
  if (type === "b") return raw === "1";
  if (raw === "") return "";
  const n = Number(raw);
  return Number.isFinite(n) ? n : raw;
}
/* ---------------------------------------------- 
     Letters To Col 
----------------------------------------------  */
function lettersToCol(letters) {
  let idx = 0;
  for (let i = 0; i < letters.length; i++) idx = idx * 26 + (letters.charCodeAt(i) - 64);
  return Math.max(0, idx - 1);
}
/* ---------------------------------------------- 
     Dense Normalize Row 
----------------------------------------------  */
function denseNormalizeRow(row) {
  const source = row || [];
  const length = Math.max(source.length || 0, 8);
  return Array.from({ length }, (_, index) => normalize(source[index] ?? ""));
}
/* ---------------------------------------------- 
     Parse Kahoot Rows 
----------------------------------------------  */
function parseKahootRows(rows) {
  const headerIndex = rows.findIndex(row => {
    const cells = denseNormalizeRow(row);
    return cells.some(c => c.includes("question")) && cells.some(c => c.includes("answer 1")) && cells.some(c => c.includes("correct"));
  });
  if (headerIndex < 0) throw new Error("Kahoot headers were not found.");

  const header = denseNormalizeRow(rows[headerIndex]);
  const qCol = header.findIndex(c => c.includes("question"));
  const answerCols = [1,2,3,4].map(n => header.findIndex(c => c.includes(`answer ${n}`)));
  const timeCol = header.findIndex(c => c.includes("time"));
  const correctCol = header.findIndex(c => c.includes("correct"));

  if (qCol < 0 || answerCols[0] < 0) throw new Error("The XLSX file is missing the Question or Answer 1 column.");

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

/* ---------------------------------------------- 
     Create Scene 
----------------------------------------------  */
/* ---------------------------------------------- 
     Pool Select 
----------------------------------------------  */
window.WhiteboardGameScenes.poolSelect = function(api) {
     return {
          id: "poolSelect",
          screenId: "poolScreen",
          aliases: ["pool", "poolScreen"],
          /* ---------------------------------------------- 
               Init 
          ----------------------------------------------  */
          init: function() {
               bindPoolScene();
          },
          /* ---------------------------------------------- 
               On Enter 
          ----------------------------------------------  */
          onEnter: function() {
               api.audio.stopBgm("round");
               api.audio.stopBgm("podium");
               api.audio.startBgm("title");
          }
     };
};
