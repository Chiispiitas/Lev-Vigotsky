const el = id => document.getElementById(id);
const config = window.UEPLV_SITE_CONFIG;
const cache = new Map();
let rows = [];
let detailRequest = 0;
if (config.CMS_URL) {
  el("openCms").href = config.CMS_URL;
  el("openCms").hidden = false;
}

export function parseCsv(source) {
  const csv = source.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < csv.length; index++) {
    const char = csv[index];
    if (char === '"') {
      if (quoted && csv[index + 1] === '"') { field += '"'; index++; }
      else quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(field); field = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && csv[index + 1] === "\n") index++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += char;
  }
  if (quoted) throw new Error("The CSV contains an incomplete row.");
  if (field || row.length) rows.push([...row, field]);
  const headers = rows.shift()?.map(name => name.toLowerCase().replace(/[^a-z0-9]/g, "")) || [];
  return rows.filter(cells => cells.some(Boolean)).map(cells => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

el("resultsFile").onchange = async () => {
  const file = el("resultsFile").files[0];
  if (!file) return;
  try {
    const content = await file.text();
    const parsed = file.name.toLowerCase().endsWith(".json") ? JSON.parse(content) : parseCsv(content);
    const records = Array.isArray(parsed) ? parsed : parsed.items;
    rows = records.map(record => {
      const row = Object.fromEntries(Object.entries(record.data || record).map(([key, value]) => [key.toLowerCase().replace(/[^a-z0-9]/g, ""), value]));
      const raw = row.review || row.questionreview || row.reviewjson || row.questionlevelreview;
      let review;
      try { review = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { /* Show summary when detail cannot be read. */ }
      return {
        name: row.title || row.studentname || row.student || "",
        examId: row.examid || row.practiceexam || review?.examId || "",
        group: row.group || review?.group || "",
        score: row.score ?? review?.score,
        maxScore: row.maxscore ?? review?.maxScore,
        submittedAt: row.submittedat || row.submitted || review?.submittedAt || "",
        review
      };
    }).filter(row => /^(a1|a2|b1)-practice-[ab]$/.test(row.examId));
    el("examSelect").replaceChildren(new Option("All exams", ""));
    for (const id of [...new Set(rows.map(row => row.examId))].sort()) el("examSelect").add(new Option(id, id));
    el("resultsStatus").textContent = rows.length === 1 ? "1 attempt imported."
      : rows.length ? `${rows.length} attempts imported.` : "This file contains no UEPLV practice attempts.";
    el("teacherResults").hidden = !rows.length;
    render();
  } catch {
    rows = [];
    el("teacherResults").hidden = true;
    el("teacherDetails").hidden = true;
    el("resultsStatus").textContent = "Could not read the file. Use a CSV or JSON export of the practice attempts.";
  }
};
for (const id of ["examSelect", "classIdInput", "studentInput"]) el(id).addEventListener("input", render);

function render() {
  detailRequest++;
  el("teacherDetails").hidden = true;
  const body = el("resultsBody");
  body.replaceChildren();
  const filter = el("studentInput").value.trim().toLowerCase();
  for (const row of rows) {
    if (el("examSelect").value && row.examId !== el("examSelect").value) continue;
    if (el("classIdInput").value && row.group !== el("classIdInput").value) continue;
    if (!String(row.name).toLowerCase().includes(filter)) continue;
    const tr = document.createElement("tr");
    for (const value of [row.name, row.examId, row.group || "—", `${row.score ?? "—"} / ${row.maxScore ?? "—"}`, row.submittedAt]) tr.insertCell().textContent = value;
    const button = document.createElement("button");
    button.className = "button outline";
    button.type = "button";
    button.textContent = "View answers";
    button.disabled = !Array.isArray(row.review?.items);
    button.onclick = () => showDetails(row).catch(() => { el("resultsStatus").textContent = "Could not open the answers."; });
    tr.insertCell().append(button);
    body.append(tr);
  }
}
function append(root, tag, text) {
  const child = document.createElement(tag);
  child.textContent = text;
  root.append(child);
  return child;
}
async function showDetails(row) {
  const request = ++detailRequest;
  if (!cache.has(row.examId)) {
    const res = await fetch(`content/exams/${row.examId}.json`);
    if (!res.ok) throw new Error("Could not load exam");
    cache.set(row.examId, await res.json());
  }
  if (request !== detailRequest) return;
  const questions = cache.get(row.examId).parts.flatMap(part => part.questions);
  const root = el("detailsContent");
  root.replaceChildren();
  append(root, "h2", row.name);
  append(root, "p", `${row.examId} · ${row.score} / ${row.maxScore} · Key ${row.review.keyVersion}`);
  for (const section of row.review.sections || []) append(root, "p", `${section.id} · ${section.score} / ${section.maxScore}`);
  for (const item of row.review.items) {
    const details = append(root, "details", "");
    const index = questions.findIndex(q => q.id === item.id);
    append(details, "summary", `${index < 0 ? item.id : index + 1}. ${questions[index]?.prompt || ""} · ${item.correct ? "Correct" : "Incorrect"}`);
    append(details, "p", `Student answer: ${item.studentAnswer || "—"}`);
    append(details, "p", `Accepted answers: ${(item.correctAnswers || []).join(" / ")}`);
  }
  el("teacherDetails").hidden = false;
  el("teacherDetails").scrollIntoView({ block: "start" });
}
