import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const relative = path => new URL(path, import.meta.url);
const load = path => JSON.parse(readFileSync(relative(path), "utf8"));
const VERSION = "2026-11-23.1";
const normalize = value => value.normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'").trim().replace(/\s+/g, " ");
const manifestPath = relative("answer-keys/version.json");
const publish = process.argv.includes("--prepare");
const exams = [];
for (const level of ["a1", "a2", "b1"]) {
  for (const variation of ["a", "b"]) {
    const id = `${level}-practice-${variation}`;
    const exam = load(`content/exams/${id}.json`);
    assert.equal(exam.id, id);
    assert.equal(exam.level.toLowerCase(), level);
    assert.equal(exam.variation.toLowerCase(), variation);
    assert(Number.isFinite(exam.minutes) && exam.minutes > 0);
    const seen = new Set();
    const partIds = new Set();
    const sections = [];
    for (const part of exam.parts) {
      assert(!partIds.has(part.id)); partIds.add(part.id);
      assert(["reading", "listening"].includes(part.skill));
      assert(part.title && part.instructions && part.questions?.length);
      if (part.skill === "listening" && !publish) {
        assert(part.transcript && part.audio, `${id}/${part.id}: transcript and audio required`);
        assert(readFileSync(relative(part.audio)).length > 1000, `${part.audio}: empty audio`);
      }
      let section = sections.find(section => section.id === part.skill);
      if (!section) { section = { id: part.skill, items: [] }; sections.push(section); }
      for (const question of part.questions) {
        assert(!seen.has(question.id), `${id}: duplicate ${question.id}`); seen.add(question.id);
        assert(question.id && question.prompt && question.answer?.trim(), `${id}: question or key missing`);
        const answers = [...new Set([question.answer, ...(question.accepted || [])])];
        const options = question.options || part.options;
        if (options) {
          assert(options.length > 1 && new Set(options.map(normalize)).size === options.length, `${id}/${question.id}: duplicate options`);
          assert(options.includes(question.answer), `${id}/${question.id}: key absent from options`);
          assert.equal(options.filter(option => answers.map(normalize).includes(normalize(option))).length, 1);
        }
        section.items.push({ id: question.id, answers });
      }
    }
    assert.equal(sections.length, 2, `${id}: reading and listening both required`);
    const key = { examId: id, keyVersion: VERSION, sections };
    const path = `answer-keys/versions/${VERSION}/${id}.json`;
    if (publish) {
      mkdirSync(relative(`answer-keys/versions/${VERSION}/`), { recursive: true });
      try { writeFileSync(relative(path), JSON.stringify(key, null, 2) + "\n", { flag: "wx" }); }
      catch (error) { if (error.code !== "EEXIST") throw error; }
    }
    assert.deepEqual(load(path), key, `${id}: key differs from immutable release`);
    exams.push(exam);
    console.log(`${id}: ${seen.size} answer keys match`);
  }
}
for (let index = 0; index < exams.length; index += 2) {
  const [a, b] = exams.slice(index, index + 2);
  assert.equal(a.minutes, b.minutes);
  assert.deepEqual(a.parts.map(p => [p.skill, p.questions.length, p.questions.map(q => Boolean(q.options || p.options))]), b.parts.map(p => [p.skill, p.questions.length, p.questions.map(q => Boolean(q.options || p.options))]));
  const contentA = a.parts.flatMap(p => p.questions.map(q => [q.context || p.passage || p.transcript || "", q.prompt, q.answer].join(" ")));
  const contentB = b.parts.flatMap(p => p.questions.map(q => [q.context || p.passage || p.transcript || "", q.prompt, q.answer].join(" ")));
  const shared = contentA.filter(value => contentB.includes(value)).length;
  assert(shared < contentA.length / 2, `${a.level}: variation needs substantive new content`);
}
if (publish) {
  try { writeFileSync(manifestPath, JSON.stringify({ currentVersion: VERSION, availableVersions: [VERSION], examIds: exams.map(exam => exam.id) }, null, 2) + "\n", { flag: "wx" }); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
}
