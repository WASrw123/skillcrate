import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  makeEntry,
  readLock,
  removeSkill,
  upsertSkill,
  verifyEntry,
  writeLock,
} from "../src/lock.js";

test("lock roundtrip and integrity", () => {
  const root = mkdtempSync(path.join(tmpdir(), "skillcrate-lock-"));
  const skillDir = path.join(root, "alpha");
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(path.join(skillDir, "SKILL.md"), "# Alpha\n", "utf8");

  const entry = makeEntry({
    name: "alpha",
    packageName: "demo/skills@alpha",
    scope: "global",
    dir: skillDir,
  });
  assert.equal(verifyEntry(entry).ok, true);
  assert.equal(entry.sha256.length, 64);

  const lock = writeLock(upsertSkill(readLock(root), entry), root);
  assert.equal(lock.skills.length, 1);
  assert.equal(readLock(root).skills[0].name, "alpha");

  writeFileSync(path.join(skillDir, "SKILL.md"), "# Alpha changed\n", "utf8");
  assert.equal(verifyEntry(entry).ok, false);

  const removed = removeSkill(lock, "alpha");
  assert.equal(removed.skills.length, 0);
  rmSync(root, { recursive: true, force: true });
});
