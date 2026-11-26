import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const candidates = [
  new URL("../../English/answer-keys/versions/", import.meta.url),
  new URL("../canonical/answer-keys/versions/", import.meta.url)
];
let root;
for (const candidate of candidates) {
  try {
    await readdir(candidate);
    root = fileURLToPath(candidate);
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!root) throw new Error("The immutable practice answer-key folders are missing.");

const versions = {};
const privateRoot = fileURLToPath(new URL("../private-keys/", import.meta.url));
const privateReleases = await readdir(privateRoot, { withFileTypes: true }).catch(error => {
  if (error.code !== "ENOENT") throw error;
  return [];
});
const releaseFolders = [
  ...(await readdir(root, { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => [root, entry.name]),
  ...privateReleases.filter(entry => entry.isDirectory()).map(entry => [privateRoot, entry.name])
];
for (const [parent, version] of releaseFolders) {
  const versionDir = join(parent, version);
  const keys = {};
  for (const file of (await readdir(versionDir)).filter(name => name.endsWith(".json")).sort()) {
    const key = JSON.parse(await readFile(join(versionDir, file), "utf8"));
    if (key.keyVersion !== version || key.examId !== file.slice(0, -5) ||
        !/^[a-z0-9-]+$/.test(key.examId) || !Array.isArray(key.sections) || !key.sections.length) {
      throw new Error("Invalid key " + file);
    }
    const ids = new Set();
    const sectionIds = new Set();
    for (const section of key.sections) {
      if (!["reading", "listening"].includes(section.id) || sectionIds.has(section.id) ||
          !Array.isArray(section.items) || !section.items.length) throw new Error("Invalid section in " + file);
      sectionIds.add(section.id);
      for (const item of section.items) {
        if (typeof item.id !== "string" || !item.id || ids.has(item.id) || !Array.isArray(item.answers) ||
            !item.answers.length || item.answers.some(answer => typeof answer !== "string" || !answer.trim())) {
          throw new Error("Invalid question key in " + file + ": " + item.id);
        }
        ids.add(item.id);
      }
    }
    keys[key.examId] = key;
  }
  if (Object.keys(keys).length) {
    if (Object.hasOwn(versions, version)) throw new Error("Duplicate answer-key release " + version);
    versions[version] = keys;
  }
}
if (!Object.keys(versions).length) throw new Error("No valid practice keys found.");

const out = new URL("../src/generated/", import.meta.url);
await mkdir(out, { recursive: true });
await writeFile(new URL("keys.json", out), JSON.stringify(versions, null, 2) + "\n");
console.log("Practice keys bundled:", Object.entries(versions).map(([version, keys]) =>
  version + " (" + Object.keys(keys).length + " sets)").join(", "));
