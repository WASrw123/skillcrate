import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import YAML from "yaml";
import { composeProfile } from "../src/compose.js";
import { makeEntry, writeLock } from "../src/lock.js";

test("compose builds a bundle from pinned skills", () => {
  const root = mkdtempSync(path.join(tmpdir(), "skillcrate-compose-"));
  const skillDir = path.join(root, "skills", "alpha");
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(path.join(skillDir, "SKILL.md"), "# Alpha\n\nDo the alpha thing.\n", "utf8");
  writeFileSync(
    path.join(root, "skillcrate.yaml"),
    YAML.stringify({
      version: 1,
      name: "demo",
      profiles: { test: { description: "Test profile", skills: ["alpha"] } },
    }),
    "utf8",
  );
  writeFileSync(
    path.join(root, "policy.yaml"),
    YAML.stringify({ version: 1, requirePlan: false }),
    "utf8",
  );
  const entry = makeEntry({
    name: "alpha",
    packageName: "demo/skills@alpha",
    scope: "global",
    dir: skillDir,
  });
  writeLock({ version: 1, generatedAt: null, skills: [entry] }, root);

  const result = composeProfile({
    cwd: root,
    profileName: "test",
    out: "dist/test.md",
    skillsDir: path.join(root, "skills"),
    force: true,
  });
  const body = readFileSync(result.target, "utf8");
  assert.match(body, /## Skill: alpha/);
  assert.match(body, /Do the alpha thing/);
  assert.equal(result.skills.length, 1);
  rmSync(root, { recursive: true, force: true });
});

test("compose refuses a DRAFT plan when policy requires one", () => {
  const root = mkdtempSync(path.join(tmpdir(), "skillcrate-plan-"));
  const skillDir = path.join(root, "skills", "alpha");
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(path.join(skillDir, "SKILL.md"), "# Alpha\n", "utf8");
  writeFileSync(
    path.join(root, "skillcrate.yaml"),
    YAML.stringify({ version: 1, name: "demo", profiles: { test: { skills: ["alpha"] } } }),
    "utf8",
  );
  writeFileSync(path.join(root, "policy.yaml"), YAML.stringify({ requirePlan: true }), "utf8");
  writeFileSync(path.join(root, "PLAN.md"), "# Plan\n\nStatus: DRAFT\n", "utf8");
  const entry = makeEntry({
    name: "alpha",
    packageName: "demo/skills@alpha",
    scope: "global",
    dir: skillDir,
  });
  writeLock({ version: 1, generatedAt: null, skills: [entry] }, root);

  assert.throws(
    () => composeProfile({ cwd: root, profileName: "test", out: "dist/test.md", skillsDir: path.join(root, "skills") }),
    /not READY/,
  );
  rmSync(root, { recursive: true, force: true });
});
