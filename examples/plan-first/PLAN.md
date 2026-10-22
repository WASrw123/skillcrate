# Plan: plan-first

Status: READY

## Goal

Choose one real task, find a skill for it, stress-test the plan, then compose only the skills that survived the review.

## Users and scenario

A developer on Windows who wants to add one capability to an agent workflow without installing a pile of unvetted skills.

## Design tree

- [x] Goal: one task, one bundle
- [x] Users: one developer, local machine
- [x] Inputs: a task description and a search query
- [x] Outputs: a reviewable bundle + inventory
- [x] Constraints: no secret data, no auto-execution
- [x] Acceptance: bundle contains only pinned, audited skills
- [x] Failure handling: missing Git or hash mismatch blocks compose
- [x] Ownership: the developer

## Decisions

| Decision | Choice | Evidence | Owner | Date |
|---|---|---|---|---|
| Discovery | find-skills | search + install | developer | 2026-10-23 |
| Plan review | grill-me / grilling | design tree | developer | 2026-10-23 |
| Scope | global | cross-project use | developer | 2026-10-23 |
| Gate | require READY plan | no code before decisions | developer | 2026-10-23 |

## Risks and unknowns

- a skill may look popular but contain risky commands
- global installs can drift from the lock
- a plan can be marked READY too early

## Acceptance

- [x] `compose review` succeeds
- [x] `audit --strict` passes
- [x] the bundle can be reviewed as plain Markdown

## Sign-off

The design tree is closed. Compose may run.
