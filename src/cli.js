#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditDir, printAudit } from "./audit.js";
import { composeProfile, exportSkillsIndex } from "./compose.js";
import { loadConfig, loadPolicy, resolveScope, writeDefaultProject } from "./config.js";
import { doctor, printDoctor } from "./doctor.js";
import { makeEntry, readLock, removeSkill as removeLocked, upsertSkill, verifyEntry, writeLock } from "./lock.js";
import { planPath, readPlan, writePlan } from "./plan.js";
import {
  installSkill,
  removeSkill as removeInstalled,
  search,
} from "./skills.js";
import { color, formatTable, shortHash } from "./util.js";
import { startUi } from "./ui.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(here, "..", "package.json"), "utf8"));

function parse(argv) {
  const positionals = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const [rawKey, inline] = arg.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (rawKey === "help" || rawKey === "version") {
      flags[key] = true;
      continue;
    }
    const takesValue = ["owner", "out", "port", "skillsDir", "cwd", "name", "limit"];
    if (inline !== undefined) flags[key] = inline;
    else if (takesValue.includes(key) && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      flags[key] = argv[++i];
    } else flags[key] = true;
  }
  return { positionals, flags };
}

const HELP = `skillcrate ${pkg.version} — local-first supply chain for agent skills

Usage:
  skillcrate init [name]
  skillcrate search <query> [--owner <owner>] [--limit <n>] [--json]
  skillcrate add <owner/repo@skill> [--global|--project] [--json]
  skillcrate remove <skill> [--global|--project]
  skillcrate list [--json]
  skillcrate audit [--strict] [--json] [--skill <name>]
  skillcrate plan [--check] [--force]
  skillcrate compose <profile> [--out <file>] [--force] [--json]
  skillcrate export [--out SKILLS.md] [--json]
  skillcrate doctor [--json] [--offline]
  skillcrate ui [--port 4777]

Global:
  --cwd <dir>   Work in another project directory
  --help        Show this help
  --version     Print version

Examples:
  skillcrate init excel-ops
  skillcrate search "excel automation"
  skillcrate add claude-office-skills/skills@excel-automation -g
  skillcrate audit --strict
  skillcrate compose excel
`;

function projectCwd(flags) {
  return path.resolve(flags.cwd ?? process.cwd());
}

function json(value) {
  console.log(JSON.stringify(value, null, 2));
}

function requireConfig(cwd) {
  const config = loadConfig(cwd);
  if (!config) throw new Error("skillcrate.yaml not found; run `skillcrate init` first");
  return config;
}

function paintPath(value) {
  return color.cyan(value);
}

export async function main(argv = process.argv.slice(2)) {
  const { positionals, flags } = parse(argv);
  if (flags.version) {
    console.log(pkg.version);
    return;
  }
  if (flags.help || positionals.length === 0) {
    console.log(HELP);
    return;
  }

  const command = positionals.shift();
  const cwd = projectCwd(flags);

  switch (command) {
    case "init": {
      const name = positionals[0] ?? path.basename(cwd);
      const result = writeDefaultProject(cwd, name);
      writePlan(cwd, name);
      console.log(`${color.green("✓")} initialized ${name}`);
      console.log(`  ${paintPath(result.configFile)}`);
      console.log(`  ${paintPath(result.policyFile)}`);
      console.log(`  ${paintPath(planPath(cwd))}`);
      console.log(color.dim("\nNext: edit PLAN.md, then `skillcrate add <package>`."));
      return;
    }

    case "search": {
      const query = positionals.join(" ").trim();
      if (!query) throw new Error("search needs a query");
      const results = search(query, { owner: flags.owner, limit: Number(flags.limit ?? 10), cwd });
      if (flags.json) {
        json({ query, results });
        return;
      }
      if (results.length === 0) {
        console.log(`No skills found for "${query}". Try a broader term or --owner.`);
        return;
      }
      console.log(formatTable(
        results.map((row) => [row.package, row.installs]),
        ["skill", "installs"],
      ));
      console.log(color.dim("\nInstall with: skillcrate add <skill>"));
      return;
    }

    case "add": {
      const pkgName = positionals[0];
      if (!pkgName || !pkgName.includes("@")) throw new Error("add needs owner/repo@skill");
      const config = requireConfig(cwd);
      const scope = resolveScope(config, flags);
      const result = installSkill(pkgName, { scope, cwd });
      const lock = readLock(cwd);
      const entry = makeEntry({
        name: result.name,
        packageName: pkgName,
        scope,
        dir: result.exists ? result.dir : null,
      });
      const next = writeLock(upsertSkill(lock, entry), cwd);
      if (flags.json) {
        json({ installed: entry, lock: next });
        return;
      }
      console.log(`${color.green("✓")} pinned ${entry.name} (${entry.scope})`);
      console.log(`  ${entry.path ?? "installed, but directory not found"}`);
      if (entry.sha256) console.log(`  sha256 ${shortHash(entry.sha256)}`);
      if (!result.exists) console.log(color.yellow("  ! could not locate the skill directory; check `skillcrate doctor`"));
      return;
    }

    case "remove": {
      const name = positionals[0];
      if (!name) throw new Error("remove needs a skill name");
      const config = requireConfig(cwd);
      const scope = resolveScope(config, flags);
      removeInstalled(name, { scope, cwd });
      const next = writeLock(removeLocked(readLock(cwd), name), cwd);
      console.log(`${color.green("✓")} removed ${name} (${scope}) and updated lock (${next.skills.length} left)`);
      return;
    }

    case "list": {
      const lock = readLock(cwd);
      if (flags.json) {
        json(lock);
        return;
      }
      if (lock.skills.length === 0) {
        console.log("No pinned skills. Run `skillcrate add <owner/repo@skill>`.");
        return;
      }
      console.log(formatTable(
        lock.skills.map((skill) => [
          skill.name,
          skill.package,
          skill.scope,
          shortHash(skill.sha256),
          verifyEntry(skill).ok ? "ok" : "stale",
        ]),
        ["skill", "source", "scope", "hash", "state"],
      ));
      return;
    }

    case "audit": {
      requireConfig(cwd);
      const policy = loadPolicy(cwd);
      const lock = readLock(cwd);
      if (lock.skills.length === 0) throw new Error("no pinned skills to audit");
      const selected = flags.skill ? lock.skills.filter((skill) => skill.name === flags.skill) : lock.skills;
      if (selected.length === 0) throw new Error(`skill not pinned: ${flags.skill}`);
      const reports = [];
      for (const skill of selected) {
        const source = skill.package?.split("@")[0] ?? null;
        try {
          const report = auditDir(skill.path, { source, policy });
          reports.push({ ...report, name: skill.name, package: skill.package });
        } catch (error) {
          reports.push({
            name: skill.name,
            package: skill.package,
            error: error.message,
            ok: false,
            risk: "high",
            findings: [],
          });
        }
      }
      if (flags.json) {
        json({ policy, reports });
      } else {
        for (const report of reports) {
          console.log(`\n${color.bold(report.name)}  ${color.dim(report.package ?? "")}`);
          if (report.error) {
            console.log(color.red(`  ✗ ${report.error}`));
          } else {
            printAudit(report);
          }
        }
        const failed = reports.filter((report) => !report.ok).length;
        const strictFailure = Boolean(flags.strict) && reports.some((report) => (report.findings?.length ?? 0) > 0);
        const summary = failed > 0
          ? `audit: ${failed} skill(s) need attention`
          : strictFailure
            ? "audit: findings present (strict)"
            : "audit: ok";
        console.log(`\n${failed === 0 && !strictFailure ? color.green(summary) : color.red(summary)}`);
      }
      if (reports.some((report) => !report.ok) || (flags.strict && reports.some((report) => (report.findings?.length ?? 0) > 0))) process.exitCode = 1;
      return;
    }

    case "plan": {
      if (flags.check) {
        const plan = readPlan(cwd);
        if (!plan.exists) throw new Error("PLAN.md not found");
        console.log(`${plan.ready ? color.green("READY") : color.yellow("DRAFT")}  ${plan.file}`);
        if (!plan.ready) process.exitCode = 1;
        return;
      }
      const config = loadConfig(cwd);
      const file = writePlan(cwd, config?.name ?? "my-project", { force: Boolean(flags.force) });
      console.log(`${color.green("✓")} wrote ${file}`);
      console.log(color.dim("Close the tree, then set `Status: READY`."));
      return;
    }

    case "compose": {
      const profile = positionals[0];
      if (!profile) throw new Error("compose needs a profile name");
      const result = composeProfile({
        cwd,
        profileName: profile,
        out: flags.out,
        force: Boolean(flags.force),
        skillsDir: flags.skillsDir,
        bypassPlan: Boolean(flags.force),
      });
      if (flags.json) {
        json(result);
        return;
      }
      console.log(`${color.green("✓")} composed ${result.profile} -> ${result.target}`);
      console.log(`  ${result.skills.length} skill(s), ${result.bytes} bytes`);
      return;
    }

    case "export": {
      const result = exportSkillsIndex(cwd, { out: flags.out ?? "SKILLS.md" });
      if (flags.json) {
        json(result);
        return;
      }
      console.log(`${color.green("✓")} wrote ${result.target} (${result.count} skills)`);
      return;
    }

    case "doctor": {
      const report = doctor({ cwd, offline: Boolean(flags.offline) });
      if (flags.json) {
        json(report);
      } else {
        printDoctor(report);
      }
      if (!report.ok) process.exitCode = 1;
      return;
    }

    case "ui": {
      startUi({ cwd, port: Number(flags.port ?? 4777) });
      return;
    }

    case "version": {
      console.log(pkg.version);
      return;
    }

    default:
      throw new Error(`unknown command: ${command}\n\n${HELP}`);
  }
}
