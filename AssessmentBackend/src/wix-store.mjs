import { auth } from "@wix/essentials";
import { items } from "@wix/data";

const collectionId = "PracticeAttempts";
const insert = auth.elevate(items.insert);
const get = auth.elevate(items.get);

export const store = {
  insert: record => insert(collectionId, record),
  get: attemptId => get(collectionId, attemptId, { consistentRead: true })
};

export async function checkCms() {
  // This fixed ID cannot match a student attempt. The SDK resolves a missing
  // item to null only after authorizing the private collection read.
  await get(collectionId, "health-probe", { consistentRead: true });
  return true;
}
