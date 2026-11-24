import { createHash } from "node:crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GROUPS = new Set(["", "science", "technical"]);

export class AttemptError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const normalizeAnswer = value => value.normalize("NFKC").trim().toLowerCase()
  .replace(/[‘’]/g, "'").replace(/\s+/g, " ");

function readAttempt(body, keys) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AttemptError(400, "Supply a practice attempt.");
  }
  const { attemptId, examId, keyVersion, studentName, answers, durationSeconds, group = "" } = body;
  if (typeof attemptId !== "string" || !UUID.test(attemptId)) {
    throw new AttemptError(400, "The attempt ID is invalid.");
  }
  if (typeof examId !== "string" || typeof keyVersion !== "string" ||
      !Object.hasOwn(keys, keyVersion) || !Object.hasOwn(keys[keyVersion], examId)) {
    throw new AttemptError(409, "This practice release is unavailable. Open the practice page again.");
  }
  if (typeof studentName !== "string" || studentName.length > 100 ||
      /[\p{Cc}\p{Cf}]/u.test(studentName) || !/\p{L}/u.test(studentName)) {
    throw new AttemptError(400, "Enter your name.");
  }
  if (!GROUPS.has(group)) throw new AttemptError(400, "Choose a valid group.");
  if (!Number.isInteger(durationSeconds) || durationSeconds < 0 || durationSeconds > 86400) {
    throw new AttemptError(400, "The recorded duration is invalid.");
  }
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    throw new AttemptError(400, "Supply your answers.");
  }

  const key = keys[keyVersion][examId];
  const ids = new Set(key.sections.flatMap(section => section.items.map(item => item.id)));
  for (const [id, value] of Object.entries(answers)) {
    if (!ids.has(id) || typeof value !== "string" || value.length > 250) {
      throw new AttemptError(400, "The attempt contains an invalid answer.");
    }
  }
  if (key.availableFrom && (group !== (key.group || "science") || [...ids].some(id => !Object.hasOwn(answers, id) || !answers[id].trim()))) {
    throw new AttemptError(400, "Answer every homework question before submitting.");
  }

  return {
    attemptId: attemptId.toLowerCase(),
    examId,
    keyVersion,
    studentName: studentName.trim().replace(/\s+/g, " "),
    group,
    durationSeconds,
    key,
    answers: Object.fromEntries([...ids].map(id => [id, (answers[id] ?? "").trim()]))
  };
}

export function gradeAttempt(attempt, submittedAt) {
  const items = [];
  const sections = attempt.key.sections.map(section => {
    let score = 0;
    for (const item of section.items) {
      const studentAnswer = attempt.answers[item.id];
      const normalized = normalizeAnswer(studentAnswer);
      const correct = Boolean(normalized) && item.answers.some(answer => normalizeAnswer(answer) === normalized);
      if (correct) score++;
      items.push({
        id: item.id,
        section: section.id,
        studentAnswer,
        correctAnswers: item.answers,
        correct,
        score: correct ? 1 : 0,
        maxScore: 1
      });
    }
    return { id: section.id, score, maxScore: section.items.length };
  });

  return {
    attemptId: attempt.attemptId,
    examId: attempt.examId,
    keyVersion: attempt.keyVersion,
    score: sections.reduce((total, section) => total + section.score, 0),
    maxScore: items.length,
    sections,
    items,
    submittedAt
  };
}

export async function submitAttempt(body, keys, store, now = () => new Date(), validateName = attempt => attempt.studentName) {
  const attempt = readAttempt(body, keys);
  const fingerprint = createHash("sha256").update(JSON.stringify([
    attempt.examId, attempt.keyVersion, attempt.studentName, attempt.group, attempt.answers
  ])).digest("hex");
  const timestamp = now();
  const result = gradeAttempt(attempt, timestamp.toISOString());
  const record = {
    _id: attempt.attemptId,
    title: attempt.studentName,
    examId: attempt.examId,
    keyVersion: attempt.keyVersion,
    group: attempt.group,
    score: result.score,
    maxScore: result.maxScore,
    durationSeconds: attempt.durationSeconds,
    submittedAt: timestamp,
    requestDigest: fingerprint,
    review: JSON.stringify(result)
  };

  try {
    if (attempt.key.availableFrom && (timestamp < new Date(attempt.key.availableFrom) || timestamp > new Date(attempt.key.dueAt))) {
      throw new AttemptError(410, "This homework is outside its submission window.");
    }
    record.title = validateName(attempt);
    await store.insert(record);
    return result;
  } catch (insertError) {
    // A lost response and a parallel retry are both safe. Wix insert never
    // replaces an existing ID. A consistent read resolves the committed result.
    const existing = await store.get(attempt.attemptId);
    if (!existing) throw insertError;
    if (existing.requestDigest !== fingerprint) {
      throw new AttemptError(409, "This attempt was already saved with different answers.");
    }
    return JSON.parse(existing.review);
  }
}
