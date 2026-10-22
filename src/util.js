import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const ANSI = /\u001b\[[0-9;]*m/g;

export function stripAnsi(value) {
  return String(value ?? "").replace(ANSI, "");
}

export function expandHome(value) {
  if (!value) return value;
  if (value === "~") return homedir();
  if (value.startsWith("~/") || value.startsWith("~\\")) {
    return path.join(homedir(), value.slice(2));
  }
  return value;
}

export function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

export function hashDirectory(dir) {
  const files = [];
  if (!existsSync(dir)) return null;
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) files.push(full);
    }
  };
  walk(dir);
  files.sort();
  const hash = createHash("sha256");
  for (const file of files) {
    const rel = path.relative(dir, file).replaceAll("\\", "/");
    hash.update(rel);
    hash.update("\0");
    hash.update(readFileSync(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function readText(file) {
  return readFileSync(file, "utf8");
}

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

export function shortHash(value, length = 10) {
  return value ? value.slice(0, length) : "—";
}

export function formatTable(rows, headers) {
  const all = [headers, ...rows].map((row) => row.map((cell) => String(cell ?? "")));
  const widths = all[0].map((_, i) => Math.max(...all.map((row) => row[i].length)));
  return all
    .map((row) => row.map((cell, i) => cell.padEnd(widths[i])).join("  ").trimEnd())
    .join("\n");
}

export function isDirectory(value) {
  try {
    return statSync(value).isDirectory();
  } catch {
    return false;
  }
}

export function relativeToCwd(value, cwd = process.cwd()) {
  const rel = path.relative(cwd, value);
  return rel && !rel.startsWith("..") ? rel : value;
}

export function nowIso() {
  return new Date().toISOString();
}

export const color = {
  enabled: process.stdout.isTTY && !process.env.NO_COLOR,
  wrap(code, value) {
    if (!color.enabled) return String(value);
    return `\u001b[${code}m${value}\u001b[0m`;
  },
  bold(value) {
    return color.wrap("1", value);
  },
  dim(value) {
    return color.wrap("2", value);
  },
  red(value) {
    return color.wrap("31", value);
  },
  green(value) {
    return color.wrap("32", value);
  },
  yellow(value) {
    return color.wrap("33", value);
  },
  cyan(value) {
    return color.wrap("36", value);
  },
};

export function fail(message, code = 1) {
  const error = new Error(message);
  error.exitCode = code;
  throw error;
}
