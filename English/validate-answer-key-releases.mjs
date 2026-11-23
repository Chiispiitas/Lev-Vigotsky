import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
const dir = new URL("answer-keys/", import.meta.url);
const read = file => JSON.parse(readFileSync(new URL(file, dir), "utf8"));
const release = read("version.json");
assert(release.availableVersions.includes(release.currentVersion));
assert.equal(release.availableVersions.length, new Set(release.availableVersions).size);
const config = readFileSync(new URL("config.js", import.meta.url), "utf8");
assert(config.includes(`VERSION: "${release.currentVersion}"`));
for (const version of release.availableVersions) {
  assert(/^[a-z\d.-]+$/i.test(version));
  const files = readdirSync(new URL(`versions/${version}/`, dir));
  if (version === release.currentVersion) assert.deepEqual(files.sort(), release.examIds.map(id => `${id}.json`).sort());
  for (const file of files) {
    const key = read(`versions/${version}/${file}`);
    assert.equal(key.keyVersion, version);
    assert.equal(file, `${key.examId}.json`);
  }
}
if (process.env.EXAM_BASE_REF) {
  const changes = execFileSync("git", ["diff", "--name-status", process.env.EXAM_BASE_REF, "--", "English/answer-keys/versions"], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  assert(changes.every(line => line.startsWith("A\t")), "Previously released keys must stay immutable");
}
console.log(`Answer-key release ${release.currentVersion} verified`);
