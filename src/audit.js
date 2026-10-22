import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { color } from "./util.js";

const PATTERNS = [
  {
    id: "pipe-to-shell",
    severity: "high",
    label: "Pipes a download into a shell",
    re: /\b(curl|wget)\b[^\n|]{0,200}\|\s*(bash|sh|zsh|pwsh|powershell)\b/i,
  },
  {
    id: "destructive-delete",
    severity: "high",
    label: "Contains a destructive delete command",
    re: /\b(rm\s+-rf|del\s+\/[sq]|Remove-Item\b[^\n]*-Recurse)\b/i,
  },
  {
    id: "encoded-powershell",
    severity: "high",
    label: "Runs encoded PowerShell",
    re: /powershell(?:\.exe)?[^\n]{0,80}\s-(?:enc|encodedcommand)\b/i,
  },
  {
    id: "private-key",
    severity: "high",
    label: "Contains a private key block",
    re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    id: "hardcoded-secret",
    severity: "high",
    label: "Looks like a hard-coded secret",
    re: /\b(api[_-]?key|secret|password|access[_-]?token)\b\s*[:=]\s*["'][^"']{8,}["']/i,
  },
  {
    id: "eval",
    severity: "medium",
    label: "Uses dynamic eval",
    re: /\beval\s*\(/i,
  },
  {
    id: "child-process",
    severity: "medium",
    label: "Can spawn local processes",
    re: /\b(child_process|execSync|spawnSync|execFileSync)\b/,
  },
  {
    id: "base64-decode",
    severity: "medium",
    label: "Decodes base64 content at runtime",
    re: /\b(base64\s+-d|atob\s*\()/i,
  },
  {
    id: "network-access",
    severity: "low",
    label: "References a network endpoint",
    re: /\bhttps?:\/\/[^\s)]+/i,
  },
  {
    id: "encoding-mojibake",
    severity: "medium",
    label: "Contains probable mojibake; the skill file may be double-encoded",
    re: /\uFFFD|鈺|â€|Ã[\u0080-\u00BF]/,
  },
];

const SEVERITY_RANK = { low: 1, medium: 2, high: 3 };
const RISK_LABEL = { 1: "low", 2: "medium", 3: "high" };

export function riskFromFindings(findings) {
  const rank = Math.max(0, ...findings.map((finding) => SEVERITY_RANK[finding.severity] ?? 0));
  return RISK_LABEL[rank] ?? "low";
}

export function severityCounts(findings) {
  return {
    high: findings.filter((finding) => finding.severity === "high").length,
    medium: findings.filter((finding) => finding.severity === "medium").length,
    low: findings.filter((finding) => finding.severity === "low").length,
  };
}

export function sourceAllowed(source, policy) {
  if (!source) return { allowed: true, reason: "no-source" };
  const denied = (policy.deniedSources ?? []).some((pattern) => matches(pattern, source));
  if (denied) return { allowed: false, reason: "denied" };
  const allowed = policy.allowedSources ?? [];
  if (allowed.length === 0) return { allowed: true, reason: "open-policy" };
  return {
    allowed: allowed.some((pattern) => matches(pattern, source)),
    reason: "not-allowed",
  };
}

function matches(pattern, value) {
  if (pattern === "*") return true;
  if (pattern.endsWith("/*")) {
    const owner = pattern.slice(0, -2);
    return value === owner || value.startsWith(`${owner}/`);
  }
  return pattern === value;
}

export function scanText(text) {
  const findings = [];
  const lines = String(text).split(/\r?\n/);
  for (const pattern of PATTERNS) {
    for (let index = 0; index < lines.length; index += 1) {
      if (pattern.re.test(lines[index])) {
        findings.push({
          id: pattern.id,
          severity: pattern.severity,
          label: pattern.label,
          line: index + 1,
          excerpt: lines[index].trim().slice(0, 160),
        });
        break;
      }
    }
  }
  return findings;
}

export function auditDir(dir, { source = null, policy = {} } = {}) {
  const skillFile = path.join(dir, "SKILL.md");
  if (!existsSync(skillFile)) {
    throw new Error(`SKILL.md not found in ${dir}`);
  }
  const findings = scanText(readFileSync(skillFile, "utf8"));
  const sourceCheck = sourceAllowed(source, policy);
  if (!sourceCheck.allowed) {
    findings.push({
      id: "source-not-allowed",
      severity: "medium",
      label: `Source is not allowed by policy (${source})`,
      line: 0,
      excerpt: source,
    });
  }
  const risk = riskFromFindings(findings);
  const counts = severityCounts(findings);
  const maxRisk = policy.maxRisk ?? "medium";
  const ok = SEVERITY_RANK[risk] <= SEVERITY_RANK[maxRisk] && sourceCheck.allowed;
  return {
    dir,
    source,
    risk,
    counts,
    findings,
    sourceAllowed: sourceCheck.allowed,
    maxRisk,
    ok,
  };
}

export function printAudit(report) {
  const tone = report.ok ? color.green : color.red;
  console.log(`${tone("●")} ${report.source ?? "unknown"}  ${report.risk.toUpperCase()} risk  (${report.findings.length} findings)`);
  if (report.findings.length === 0) {
    console.log(color.green("  ✓ no risky patterns detected"));
    return;
  }
  for (const finding of report.findings) {
    const marker = finding.severity === "high" ? "✗" : finding.severity === "medium" ? "!" : "·";
    const paint = finding.severity === "high" ? color.red : finding.severity === "medium" ? color.yellow : color.dim;
    console.log(`  ${paint(marker)} ${finding.severity.padEnd(6)} ${finding.id}: ${finding.label}`);
    if (finding.line) console.log(color.dim(`      line ${finding.line}: ${finding.excerpt}`));
  }
}
