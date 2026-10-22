import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadConfig, loadPolicy } from "./config.js";
import { readLock } from "./lock.js";
import { readPlan } from "./plan.js";
import { hashDirectory, looksLikeMojibake, nowIso, shortHash } from "./util.js";

export function resolveProfile(config, name) {
  const profile = config?.profiles?.[name];
  if (!profile) {
    throw new Error(`profile not found: ${name}. Available: ${Object.keys(config?.profiles ?? {}).join(", ") || "(none)"}`);
  }
  return {
    name,
    description: profile.description ?? "",
    skills: Array.isArray(profile.skills) ? profile.skills : [],
  };
}

export function composeProfile({
  cwd = process.cwd(),
  profileName,
  out = null,
  force = false,
  skillsDir = null,
  bypassPlan = false,
} = {}) {
  const config = loadConfig(cwd);
  if (!config) throw new Error("skillcrate.yaml not found; run `skillcrate init` first");
  const profile = resolveProfile(config, profileName);
  if (profile.skills.length === 0) throw new Error(`profile ${profileName} has no skills`);

  const plan = readPlan(cwd);
  const policy = loadPolicy(cwd);
  const requirePlan = policy.requirePlan ?? true;
  if (requirePlan && !bypassPlan && !plan.ready) {
    throw new Error(
      `${path.basename(plan.file)} is missing or not READY; close the design tree first, or pass --force`,
    );
  }

  const lock = readLock(cwd);
  const sections = [];
  const used = [];
  for (const name of profile.skills) {
    const entry = lock.skills.find((skill) => skill.name === name);
    if (!entry) {
      throw new Error(`skill not pinned: ${name}. Run \`skillcrate add <package>\` first`);
    }
    const dir = skillsDir ? path.join(skillsDir, name) : entry.path;
    if (!dir || !existsSync(dir)) throw new Error(`skill directory missing for ${name}: ${dir}`);
    const actual = hashDirectory(dir);
    if (entry.sha256 && actual !== entry.sha256) {
      throw new Error(`hash mismatch for ${name}; reinstall or update the lock before composing`);
    }
    const skillFile = path.join(dir, "SKILL.md");
    if (!existsSync(skillFile)) throw new Error(`SKILL.md missing for ${name}`);
    const text = readFileSync(skillFile, "utf8").trim();
    if (looksLikeMojibake(text)) {
      throw new Error(`SKILL.md for ${name} looks like mojibake; reinstall or fix the skill encoding before composing`);
    }
    used.push({ name, package: entry.package, sha256: actual });
    sections.push(`## Skill: ${name}\n\n- source: ${entry.package}\n- hash: ${shortHash(actual)}\n\n${text}`);
  }

  const target = out
    ? path.resolve(cwd, out)
    : path.join(cwd, "dist", `${profileName}.md`);
  if (existsSync(target) && !force) {
    throw new Error(`${target} exists; pass --force to overwrite`);
  }
  mkdirSync(path.dirname(target), { recursive: true });

  const header = [
    "---",
    "skillcrate: 1",
    `profile: ${profileName}`,
    `generated: ${nowIso()}`,
    `plan: ${plan.ready ? "ready" : "bypassed"}`,
    "---",
    "",
    `# SkillCrate bundle: ${profileName}`,
    "",
    profile.description || "A composed skill bundle.",
    "",
  ].join("\n");

  const body = `${header}\n${sections.join("\n\n---\n\n")}\n`;
  writeFileSync(target, body, "utf8");
  return { target, profile: profileName, skills: used, bytes: Buffer.byteLength(body) };
}

export function exportSkillsIndex(cwd = process.cwd(), { out = "SKILLS.md" } = {}) {
  const config = loadConfig(cwd);
  const lock = readLock(cwd);
  const plan = readPlan(cwd);
  const lines = [
    "# Skill inventory",
    "",
    `Project: ${config?.name ?? "(none)"}`,
    `Generated: ${nowIso()}`,
    `Plan: ${plan.exists ? (plan.ready ? "READY" : "DRAFT") : "missing"}`,
    "",
    "| Skill | Source | Scope | Hash | Installed |",
    "|---|---|---|---|---|",
    ...lock.skills.map(
      (skill) =>
        `| ${skill.name} | ${skill.package} | ${skill.scope} | ${shortHash(skill.sha256)} | ${skill.installedAt ?? ""} |`,
    ),
    "",
    "## Reproduce",
    "",
    "```bash",
    "skillcrate doctor",
    "skillcrate audit --strict",
    "skillcrate compose <profile>",
    "```",
    "",
  ];
  const target = path.resolve(cwd, out);
  writeFileSync(target, lines.join("\n"), "utf8");
  return { target, count: lock.skills.length };
}
