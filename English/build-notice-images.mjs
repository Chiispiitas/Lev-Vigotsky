import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const fromHere = path => new URL(path, import.meta.url);
const target = fromHere("images/part-one/");
const check = process.argv.includes("--check");
const escape = text => text.replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

// The drawings set the scene. They do not depict the answers to the questions.
const ink = {
  film: '<path fill="tone" d="M8 24L45 22l2 24-38 1z"/><path fill="cream" d="M8 24l-3-9L42 7l3 10z"/><path d="m13 14 7 6m5-8 7 6m4-9 7 6m-27 17 23-1"/>',
  shop: '<path fill="cream" d="M10 21l33 1 1 26H10z"/><path fill="tone" d="m6 23 7-13 26 1 9 13q-4 7-9 1-5 6-10 0-5 6-10 0-9 4-13-2Z"/><path d="M16 46V34h11v12m6-13 7 1v6h-7z"/>',
  book: '<path fill="cream" d="M5 14q12-6 22 3 11-9 22-5l-2 29q-11-2-20 3-10-6-22-4z"/><path d="m27 17-1 27M12 22q6-1 10 2m-10 5 9 3m11-8 9-3m-9 10 9-3"/>',
  art: '<path fill="cream" d="M39 39q-8 5-10 11Q8 49 7 31 5 17 18 9q14-9 26 4 8 10-1 13-16 0-10 7z"/><path fill="tone" d="M16 18a3 3 0 1 1 6 0 3 3 0 1 1-6 0Zm-3 11a3 3 0 1 1 6 0 3 3 0 1 1-6 0Zm15-15a3 3 0 1 1 6 0 3 3 0 1 1-6 0Z"/><path fill="tone" d="m33 46 12-19 4 3-11 20z"/>',
  party: '<path fill="cream" d="M5 10q21 14 43 2M10 14l1 15 12-9m5 3 8 13 5-16"/><path fill="tone" d="m10 14 1 15 12-9m5 3 8 13 5-16"/><path d="m11 44 4 3m8-9 3 4m18 1 3 3"/>',
  hotel: '<path fill="cream" d="m11 11 30-1 1 39-31-1z"/><path fill="tone" d="m17 17 6 1v6h-6zm12 0 6 1v6h-6zm-12 11 6 1v6h-6zm12 0 6 1v6h-6zm-7 13 9-1v8h-9z"/><path d="m6 49 42 1"/>',
  bus: '<path fill="tone" d="M5 15q15-5 36-2 5 1 7 12l-1 14-42-1z"/><path fill="cream" d="M10 17h28l5 11-33 1z"/><path d="m20 17-1 11m10-11 1 10"/><circle fill="cream" cx="14" cy="39" r="5"/><circle fill="cream" cx="39" cy="39" r="5"/>',
  theater: '<path fill="cream" d="m7 13 39-2 1 35-39 1z"/><path fill="tone" d="m7 14 16-1q-3 14-14 19l-1 14zm39-2-16 1q2 12 16 19v14z"/><path d="m13 46 27-1m-23-6 20-1"/>',
  sports: '<path fill="tone" d="m8 24 6-1 1-9h6l1 10 10-1 1-9h7l1 9 6 1v9l-6 1v9h-7l-2-9-11 1v8h-7l-1-9-6-1z"/>',
  hills: '<path fill="tone" d="M3 44 16 18l9 13 11-21 15 34z"/><path fill="cream" d="m31 20 5-10 6 13-7-2-3 1m-22 7 6-11 8 11-8-4z"/><path d="m7 48 40 1"/>',
  dance: '<path fill="tone" d="M7 31q7 0 12-17l8 3-1 19 18-1q6 1 5 8-10 7-41 2z"/><path d="m9 42 34-1M22 21l-7 2m6 4-8 2"/>',
  lake: '<path fill="tone" d="M4 38q9-6 20 1 11-8 26-3l-2 12-44 1Z"/><path d="m7 32-1-17m1 11 5-5m33 8 3-15M18 45q8-4 17 0m1-10q7-4 12-2"/>',
  room: '<path fill="tone" d="M11 9l31 1-1 39H10z"/><path fill="cream" d="m17 14 19 2-1 32H17z"/><path d="m29 34 3-1m-9-12 7 1m-7 5h7M5 49l43 1"/>',
  message: '<path fill="cream" d="M6 13q19-3 41 1l1 22q-10 3-26 2l-10 8 1-8-8-2z"/><path d="m13 21 26-1m-26 8 20 1"/>'
};
const designs = {
  "a1-practice-a": ["film", "shop", "message", "room"],
  "a1-practice-b": ["art", "party", "message", "book"],
  "a2-practice-a": ["hotel", "message", "theater", "message"],
  "a2-practice-b": ["hotel", "message", "bus", "message"],
  "b1-practice-a": ["sports", "message", "hills", "message", "book"],
  "b1-practice-b": ["dance", "message", "lake", "message", "room"]
};
const colors = ["#d89363", "#ac97b6", "#81ad9a", "#dca953", "#8aaa72"];
const width = 400;
const height = 258;

// Conservative Arial width budget, with wider letters counted separately.
function lineWidth(text) {
  return [...text].reduce((sum, char) =>
    sum + (/[ilI.,'’!:; ]/.test(char) ? .31 : /[mwMW@]/.test(char) ? .87 : /[A-Z—]/.test(char) ? .73 : .57), 0);
}

function wrap(text, maxWidth, size) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const candidate = line ? line + " " + word : word;
    if (line && lineWidth(candidate) * size > maxWidth) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  return [...lines, line];
}

function picture(source, motif, tone) {
  const message = motif === "message";
  const [, heading, body] = message ? source.match(/^(Hi [^,]+), (.+)$/) : source.match(/^([^\n]+)\n(.+)$/);
  const title = heading + (message ? "," : "");
  const titleSize = Math.min(22, Math.floor(280 / lineWidth(title)));
  const lines = wrap(body, 334, 23);
  assert.ok(lines.length <= 6, source);
  const frame = message
    ? '<path fill="tone" d="M7 24Q5 8 24 7l351 1q18 0 18 19l-1 206q0 18-17 18l-351-1Q7 249 8 232Z"/><path fill="#fffaf0" d="M20 28Q19 17 31 17l337 1q13 0 12 13l-1 195q1 12-11 12l-336-1q-12 0-12-13Z"/><path fill="tone" d="M21 62l358-1M178 243l44-1"/>'
    : '<path fill="cream" d="M10 13L390 8l1 241-383 2Z"/><path fill="tone" d="m15 18 369-4 1 54-370 1Z"/><path fill="none" d="m15 242 369 1"/><circle cx="20" cy="234" r="2" fill="tone"/><circle cx="380" cy="234" r="2" fill="tone"/>';
  const top = message ? 46 : 50;
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 400 258">\n' +
    '<g stroke="#282824" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">' + frame +
    '<g transform="translate(327 16) scale(.83)" fill="none">' + ink[motif] + '</g></g>\n' +
    '<g fill="#202220" font-family="Arial,sans-serif"><text x="32" y="' + top + '" font-size="' + titleSize + '" font-weight="700">' + escape(title) + '</text>\n' +
    lines.map((line, i) => '<text x="32" y="' + (96 + i * 26) + '" font-size="23">' + escape(line) + '</text>').join("\n") +
    '</g></svg>\n'
  ).replaceAll('fill="tone"', 'fill="' + tone + '"').replaceAll('fill="cream"', 'fill="#fbefd5"');
}

let count = 0;
if (!check) mkdirSync(target, { recursive: true });
for (const [id, motifs] of Object.entries(designs)) {
  const exam = JSON.parse(readFileSync(fromHere("content/exams/" + id + ".json"), "utf8"));
  const part = exam.parts.find(item => item.id === "r1");
  assert.equal(part.questions.length, motifs.length);
  for (const [index, question] of part.questions.entries()) {
    const image = picture(question.context, motifs[index], colors[(index + count) % colors.length]);
    const file = new URL(id + "-" + question.id + ".svg", target);
    if (check) assert.equal(readFileSync(file, "utf8").replace(/\r\n/g, "\n"), image, "Outdated notice image: " + file.pathname);
    else writeFileSync(file, image);
    count++;
  }
}
console.log((check ? "Verified " : "Built ") + count + " illustrated Part 1 notices.");
