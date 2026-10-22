import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { expandHome } from "./util.js";

export const CONFIG_FILE = "skillcrate.yaml";
export const POLICY_FILE = "policy.yaml";
export const LOCK_FILE = "skillcrate.lock.json";

export function defaultConfig(name = "my-skillcrate") {
  return {
    version: 1,
    name,
    defaults: {
      scope: "global",
      skillsDir: "~/.agents/skills",
    },
    profiles: {
      default: {
        description: "Base skill set for this project",
        skills: [],
      },
    },
  };
}

export function defaultPolicy() {
  return {
    version: 1,
    allowedSources: [
      "vercel-labs/*",
      "mattpocock/*",
      "claude-office-skills/*",
      "anthropics/*",
      "microsoft/*",
    ],
    deniedSources: [],
    maxRisk: "medium",
    requirePlan: true,
  };
}

export function findProjectRoot(start = process.cwd()) {
  let current = path.resolve(start);
  for (;;) {
    if (existsSync(path.join(current, CONFIG_FILE))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function loadConfig(cwd = process.cwd()) {
  const root = findProjectRoot(cwd);
  if (!root) return null;
  const file = path.join(root, CONFIG_FILE);
  const parsed = YAML.parse(readFileSync(file, "utf8")) ?? {};
  return {
    ...defaultConfig(parsed.name),
    ...parsed,
    defaults: { ...defaultConfig().defaults, ...(parsed.defaults ?? {}) },
    profiles: parsed.profiles ?? defaultConfig().profiles,
    root,
    configFile: file,
  };
}

export function loadPolicy(cwd = process.cwd()) {
  const root = findProjectRoot(cwd);
  if (!root) return defaultPolicy();
  const file = path.join(root, POLICY_FILE);
  if (!existsSync(file)) return defaultPolicy();
  const parsed = YAML.parse(readFileSync(file, "utf8")) ?? {};
  return {
    ...defaultPolicy(),
    ...parsed,
    allowedSources: parsed.allowedSources ?? defaultPolicy().allowedSources,
    deniedSources: parsed.deniedSources ?? defaultPolicy().deniedSources,
  };
}

export function resolveScope(config, flags = {}) {
  return flags.project ? "project" : flags.global ? "global" : config?.defaults?.scope ?? "global";
}

export function resolveSkillsDir(config, scope, cwd = process.cwd()) {
  if (scope === "project") return path.join(cwd, ".agents", "skills");
  return path.resolve(expandHome(config?.defaults?.skillsDir ?? "~/.agents/skills"));
}

export function writeDefaultProject(cwd, name) {
  const configFile = path.join(cwd, CONFIG_FILE);
  const policyFile = path.join(cwd, POLICY_FILE);
  if (existsSync(configFile) || existsSync(policyFile)) {
    throw new Error("skillcrate.yaml or policy.yaml already exists");
  }
  const config = defaultConfig(name);
  writeFileSync(configFile, YAML.stringify(config), "utf8");
  writeFileSync(policyFile, YAML.stringify(defaultPolicy()), "utf8");
  const gitignore = path.join(cwd, ".gitignore");
  if (!existsSync(gitignore)) {
    writeFileSync(
      gitignore,
      ["node_modules/", "dist/", "*.log", ".env", ".env.*", ""].join("\n"),
      "utf8",
    );
  }
  return { configFile, policyFile };
}
