import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadConfig } from "./config.js";
import { readLock, verifyEntry } from "./lock.js";
import { readPlan } from "./plan.js";
import { skillsVersion } from "./skills.js";
import { color } from "./util.js";

export function doctor({ cwd = process.cwd(), offline = false } = {}) {
  const checks = [];
  const add = (name, status, detail) => checks.push({ name, status, detail });

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  add("node", nodeMajor >= 20 ? "ok" : "fail", `v${process.versions.node}${nodeMajor < 20 ? " (need >=20)" : ""}`);

  const config = loadConfig(cwd);
  const git = spawnSync("git", ["--version"], { encoding: "utf8", windowsHide: true });
  add("git", git.status === 0 ? "ok" : "warn", git.status === 0 ? git.stdout.trim() : "git not on PATH");

  add("config", config ? "ok" : "fail", config ? path.relative(cwd, config.configFile) || "skillcrate.yaml" : "skillcrate.yaml not found");

  const lock = readLock(cwd);
  add("lockfile", lock.skills.length > 0 ? "ok" : "warn", `${lock.skills.length} pinned skill(s)`);

  let missing = 0;
  let mismatched = 0;
  for (const skill of lock.skills) {
    const result = verifyEntry(skill);
    if (!result.ok && result.reason === "path-missing") missing += 1;
    if (!result.ok && result.reason === "hash-mismatch") mismatched += 1;
  }
  add("skill-files", missing === 0 && mismatched === 0 ? "ok" : "fail", `${missing} missing, ${mismatched} hash mismatch`);

  const plan = readPlan(cwd);
  add("plan", plan.ready ? "ok" : "warn", plan.exists ? (plan.ready ? "READY" : "DRAFT") : "PLAN.md missing");

  if (!offline) {
    const version = skillsVersion();
    add("skills-cli", version ? "ok" : "warn", version ? `v${version}` : "npx skills not available");
  } else {
    add("skills-cli", "skip", "offline");
  }

  return { checks, ok: checks.every((check) => check.status !== "fail"), config, lock, plan };
}

export function printDoctor(report) {
  for (const check of report.checks) {
    const marker = check.status === "ok" ? color.green("✓") : check.status === "warn" ? color.yellow("!") : check.status === "skip" ? color.dim("·") : color.red("✗");
    console.log(`${marker} ${check.name.padEnd(12)} ${check.detail}`);
  }
  console.log("");
  console.log(report.ok ? color.green("doctor: ok") : color.red("doctor: failed"));
}
