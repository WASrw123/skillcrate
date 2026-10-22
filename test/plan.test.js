import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { readPlan, writePlan } from "../src/plan.js";

test("plan starts as DRAFT and becomes READY when signed off", () => {
  const root = mkdtempSync(path.join(tmpdir(), "skillcrate-planfile-"));
  writePlan(root, "demo");
  assert.equal(readPlan(root).ready, false);
  const file = path.join(root, "PLAN.md");
  const text = readPlan(root).text.replace("Status: DRAFT", "Status: READY");
  writeFileSync(file, text, "utf8");
  assert.equal(readPlan(root).ready, true);
  assert.throws(() => writePlan(root, "demo"), /already exists/);
  rmSync(root, { recursive: true, force: true });
});
