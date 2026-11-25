import { auth } from "@wix/essentials";
import { items } from "@wix/data";

const collectionId = "PracticeAttempts";
const insert = auth.elevate(items.insert);
const get = auth.elevate(items.get);
const query = auth.elevate(items.query);

export const store = {
  insert: record => insert(collectionId, record),
  get: attemptId => get(collectionId, attemptId, { consistentRead: true }),
  async *homeworkAttempts(examId) {
    const limit = 100;
    for (let offset = 0; ; offset += limit) {
      const page = await query(collectionId, { filter: { examId }, paging: { limit, offset }, sort: [{ fieldName: "_id", order: "ASC" }] },
        { consistentRead: true, fields: ["title", "requestDigest"] });
      yield* page.items;
      if (page.items.length < limit) return;
    }
  }
};

export async function checkCms() {
  // This fixed ID cannot match a student attempt. The SDK resolves a missing
  // item to null only after authorizing the private collection read.
  await get(collectionId, "health-probe", { consistentRead: true });
  return true;
}
