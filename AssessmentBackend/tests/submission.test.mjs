import assert from "node:assert/strict";
import { test } from "node:test";
import { createSubmitHandler } from "../src/http.mjs";

const examId = "a1-practice-a";
const keyVersion = "test.1";
const body = {
  attemptId: "33fd9c79-6256-4984-8ced-cb1bd99bc285",
  examId, keyVersion,
  studentName: "Fictional Student",
  group: "",
  durationSeconds: 122,
  answers: { r01: "Ａ", l01: "  NINE  thirty  " }
};
const keys = {
  [keyVersion]: {
    [examId]: {
      examId, keyVersion,
      sections: [
        { id: "reading", items: [{ id: "r01", answers: ["a"] }, { id: "r02", answers: ["c"] }] },
        { id: "listening", items: [{ id: "l01", answers: ["9:30", "nine thirty"] }] }
      ]
    }
  }
};
const origin = "https://ueplv.com";
const request = (payload, options = {}) => new Request("https://example.invalid/api/assessment/submit", {
  method: "POST",
  headers: { Origin: origin, "Content-Type": "application/json" },
  body: JSON.stringify(payload),
  ...options
});

function memoryStore() {
  const records = new Map();
  return {
    records,
    async insert(record) {
      if (records.has(record._id)) throw new Error("Duplicate");
      records.set(record._id, structuredClone(record));
    },
    async get(id) { return records.get(id) ?? null; }
  };
}

test("grades on server, uses the submitted release, and records exact question review", async () => {
  const store = memoryStore();
  const response = await createSubmitHandler(keys, store)(request({ ...body, score: 500 }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  const result = await response.json();
  assert.equal(result.score, 2);
  assert.equal(result.maxScore, 3);
  assert.equal(result.keyVersion, keyVersion);
  assert.equal(result.items[1].studentAnswer, "");
  assert.equal(result.items[1].correct, false);
  assert.deepEqual(result.items[2].correctAnswers, ["9:30", "nine thirty"]);
  assert.deepEqual(result.sections, [
    { id: "reading", score: 1, maxScore: 2 },
    { id: "listening", score: 1, maxScore: 1 }
  ]);
  assert.deepEqual(JSON.parse(store.records.get(body.attemptId).review), result);
});

test("parallel retries return the same immutable result; changed answers conflict", async () => {
  const store = memoryStore();
  const handler = createSubmitHandler(keys, store);
  const [first, second] = await Promise.all([handler(request(body)), handler(request({ ...body, durationSeconds: 140 }))]);
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.deepEqual(await first.json(), await second.json());
  assert.equal(store.records.size, 1);
  const changed = await handler(request({ ...body, answers: { r01: "b" } }));
  assert.equal(changed.status, 409);
  assert.equal(JSON.parse(store.records.get(body.attemptId).review).score, 2);
});

test("submission failure returns retryable response without acknowledgement", async () => {
  const store = memoryStore();
  const insert = store.insert;
  store.insert = async () => { throw new Error("Temporary storage failure"); };
  const handler = createSubmitHandler(keys, store);
  assert.equal((await handler(request(body))).status, 503);
  assert.equal(store.records.size, 0);
  store.insert = insert;
  assert.equal((await handler(request(body))).status, 200);
  assert.equal(store.records.size, 1);
});

test("rejects a foreign origin, unknown release, oversized content and invalid answer IDs", async () => {
  const store = memoryStore();
  const handler = createSubmitHandler(keys, store);
  assert.equal((await handler(request(body, { headers: { Origin: "https://unrelated.example" } }))).status, 403);
  assert.equal((await handler(request({ ...body, keyVersion: "unreleased" }))).status, 409);
  assert.equal((await handler(request({ ...body, answers: { unexpected: "x" } }))).status, 400);
  assert.equal((await handler(request({ ...body, answers: { r01: "x".repeat(50000) } }))).status, 413);
  const preflight = await handler(new Request("https://example.invalid/api/assessment/submit", {
    method: "OPTIONS", headers: { Origin: origin }
  }));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), origin);
  assert.equal(store.records.size, 0);
});
