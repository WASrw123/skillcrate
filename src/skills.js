import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { expandHome, stripAnsi } from "./util.js";

let cachedNpx = null;

export function npxCommand() {
  if (process.env.SKILLCRATE_NPX) return process.env.SKILLCRATE_NPX;
  if (cachedNpx) return cachedNpx;
  if (process.platform !== "win32") {
    cachedNpx = "npx";
    return cachedNpx;
  }
  const found = spawnSync("where.exe", ["npx.cmd"], { encoding: "utf8", windowsHide: true });
  const first = (found.stdout ?? "").split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  cachedNpx = first || "npx.cmd";
  return cachedNpx;
}

function quoteArg(value) {
  const text = String(value);
  if (process.platform === "win32") {
    return `"${text.replaceAll('"', '\\"')}"`;
  }
  return `'${text.replaceAll("'", "'\\''")}'`;
}

export function runSkills(args, { cwd = process.cwd(), timeout = 180_000 } = {}) {
  const command = [npxCommand(), "--yes", "skills@latest", ...args]
    .map(quoteArg)
    .join(" ");
  const result = spawnSync(
    command,
    {
      cwd,
      encoding: "utf8",
      timeout,
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
      shell: true,
      windowsHide: true,
    },
  );
  const stdout = stripAnsi(result.stdout ?? "");
  const stderr = stripAnsi(result.stderr ?? "");
  return {
    status: result.status ?? (result.error ? 1 : 0),
    stdout,
    stderr,
    error: result.error,
    ok: (result.status ?? 0) === 0,
  };
}

export function parseSearchOutput(output) {
  const rows = [];
  const seen = new Set();
  const re = /([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+)\s+([\d.,]+[KMB]?)\s+installs/gi;
  for (const match of output.matchAll(re)) {
    if (seen.has(match[1])) continue;
    seen.add(match[1]);
    rows.push({ package: match[1], installs: match[2], source: match[1].split("@")[0] });
  }
  return rows;
}

export function search(query, { owner = null, limit = 10, cwd = process.cwd() } = {}) {
  const args = ["find", query];
  if (owner) args.push("--owner", owner);
  const result = runSkills(args, { cwd });
  if (!result.ok) {
    throw new Error(`skills find failed: ${result.stderr || result.stdout || "unknown error"}`);
  }
  return parseSearchOutput(result.stdout).slice(0, limit);
}

export function skillNameFromPackage(pkg) {
  const at = pkg.lastIndexOf("@");
  return at > 0 ? pkg.slice(at + 1) : pkg;
}

export function installedSkillDir(name, { scope = "global", cwd = process.cwd(), skillsDir = null } = {}) {
  const base = skillsDir
    ? path.resolve(expandHome(skillsDir))
    : scope === "project"
      ? path.join(cwd, ".agents", "skills")
      : path.resolve(expandHome("~/.agents/skills"));
  return path.join(base, name);
}

export function listInstalledSkills({ scope = "global", cwd = process.cwd(), skillsDir = null } = {}) {
  const base = skillsDir
    ? path.resolve(expandHome(skillsDir))
    : scope === "project"
      ? path.join(cwd, ".agents", "skills")
      : path.resolve(expandHome("~/.agents/skills"));
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ name: entry.name, path: path.join(base, entry.name) }));
}

export function installSkill(pkg, { scope = "global", cwd = process.cwd(), skillsDir = null } = {}) {
  const args = ["add", pkg];
  if (scope === "global") args.push("-g");
  args.push("-y");
  const result = runSkills(args, { cwd });
  if (!result.ok) {
    throw new Error(`skills add failed: ${result.stderr || result.stdout || "unknown error"}`);
  }
  const name = skillNameFromPackage(pkg);
  const dir = installedSkillDir(name, { scope, cwd, skillsDir });
  return { name, dir, output: result.stdout, exists: existsSync(dir) };
}

export function removeSkill(name, { scope = "global", cwd = process.cwd() } = {}) {
  const args = ["remove", name];
  if (scope === "global") args.push("-g");
  args.push("-y");
  const result = runSkills(args, { cwd });
  if (!result.ok) {
    throw new Error(`skills remove failed: ${result.stderr || result.stdout || "unknown error"}`);
  }
  return result;
}

export function skillsVersion() {
  const result = runSkills(["--version"], { timeout: 60_000 });
  if (!result.ok) return null;
  const match = result.stdout.match(/\b(\d+\.\d+\.\d+)\b/);
  return match?.[1] ?? null;
}
