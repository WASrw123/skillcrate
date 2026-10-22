import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const PLAN_FILE = "PLAN.md";

export function planPath(cwd = process.cwd()) {
  return path.join(cwd, PLAN_FILE);
}

export function planTemplate(name = "my-project") {
  return `# Plan: ${name}

Status: DRAFT

## Goal

What changes for the user when this works?

## Users and scenario

Who uses it, in what situation, how often?

## Design tree

- [ ] Goal
- [ ] Users
- [ ] Inputs
- [ ] Outputs
- [ ] Constraints
- [ ] Acceptance
- [ ] Failure handling
- [ ] Ownership

## Decisions

| Decision | Choice | Evidence | Owner | Date |
|---|---|---|---|---|
|  |  |  |  |  |

## Risks and unknowns

- 

## Acceptance

- [ ] A measurable success condition
- [ ] A failure condition
- [ ] A rollback path

## Sign-off

When the tree is closed, change \`Status: DRAFT\` to \`Status: READY\`.
`;
}

export function writePlan(cwd, name, { force = false } = {}) {
  const file = planPath(cwd);
  if (existsSync(file) && !force) {
    throw new Error(`${PLAN_FILE} already exists; use --force to overwrite`);
  }
  writeFileSync(file, planTemplate(name), "utf8");
  return file;
}

export function readPlan(cwd = process.cwd()) {
  const file = planPath(cwd);
  if (!existsSync(file)) return { exists: false, ready: false, text: "", file };
  const text = readFileSync(file, "utf8");
  return {
    exists: true,
    ready: /^Status:\s*READY\s*$/im.test(text),
    text,
    file,
  };
}
