import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { hashDirectory, nowIso, sha256 } from "./util.js";
import { LOCK_FILE } from "./config.js";

export function lockFile(cwd = process.cwd()) {
  return path.join(cwd, LOCK_FILE);
}

export function emptyLock() {
  return {
    version: 1,
    generatedAt: null,
    skills: [],
  };
}

export function readLock(cwd = process.cwd()) {
  const file = lockFile(cwd);
  if (!existsSync(file)) return emptyLock();
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  return {
    ...emptyLock(),
    ...parsed,
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
  };
}

export function writeLock(lock, cwd = process.cwd()) {
  const next = {
    ...lock,
    generatedAt: nowIso(),
    skills: [...lock.skills].sort((a, b) => a.name.localeCompare(b.name)),
  };
  writeFileSync(lockFile(cwd), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export function skillNameFromPackage(pkg) {
  const at = pkg.lastIndexOf("@");
  return at > 0 ? pkg.slice(at + 1) : pkg;
}

export function upsertSkill(lock, entry) {
  const skills = lock.skills.filter((skill) => skill.name !== entry.name);
  skills.push(entry);
  return { ...lock, skills };
}

export function removeSkill(lock, name) {
  return { ...lock, skills: lock.skills.filter((skill) => skill.name !== name) };
}

export function makeEntry({ name, packageName, scope, dir, version = null }) {
  return {
    name,
    package: packageName,
    scope,
    path: dir,
    version,
    sha256: dir ? hashDirectory(dir) : null,
    installedAt: nowIso(),
  };
}

export function verifyEntry(entry) {
  if (!entry.path || !existsSync(entry.path)) {
    return { ok: false, reason: "path-missing" };
  }
  const actual = hashDirectory(entry.path);
  if (entry.sha256 && actual !== entry.sha256) {
    return { ok: false, reason: "hash-mismatch", expected: entry.sha256, actual };
  }
  return { ok: true, actual };
}

export function lockDigest(lock) {
  return sha256(JSON.stringify(lock.skills));
}

