# Architecture

SkillCrate is a thin, local-first layer around the Skills CLI.

```text
┌─────────────────────────────────────────────────────────────┐
│                         CLI / UI                            │
│  init  search  add  audit  plan  compose  export  doctor    │
└─────────────┬───────────────────────────────┬───────────────┘
              │                               │
              ▼                               ▼
┌──────────────────────────┐      ┌───────────────────────────┐
│      Config / policy     │      │        Lockfile           │
│  skillcrate.yaml         │      │  skillcrate.lock.json     │
│  policy.yaml             │      │  source + path + sha256   │
└─────────────┬────────────┘      └─────────────┬─────────────┘
              │                                 │
              ▼                                 ▼
┌──────────────────────────┐      ┌───────────────────────────┐
│       Skills CLI         │      │      Local skill dirs     │
│  npx skills find/add     │─────▶│  ~/.agents/skills/<name>  │
└──────────────────────────┘      └─────────────┬─────────────┘
                                                │
                                                ▼
                                  ┌───────────────────────────┐
                                  │   Audit + compose engine  │
                                  │  SKILL.md scan, bundles   │
                                  └───────────────────────────┘
```

## Design decisions

### 1. Wrap, do not fork, the Skills CLI

`skills` already handles discovery and installation. SkillCrate calls it with explicit arguments and records the result. This avoids a second marketplace and keeps compatibility with the existing ecosystem.

### 2. Hash content, not package names

A package name can point to different content over time. The lock records a SHA-256 over the installed skill directory. `list` and `compose` can therefore detect drift.

### 3. Policy is code-adjacent, not a service

`policy.yaml` is committed with the project. Reviews happen in a pull request, not in a vendor dashboard.

### 4. Plan before compose

A bundle is an executable decision. `PLAN.md` is a small design tree; `compose` refuses to run until it is `READY`. This is a deliberate speed bump.

### 5. Local dashboard, no telemetry

The UI reads the same files as the CLI and binds to `127.0.0.1`. There is no account, no upload, and no external asset.

## Data flow

1. `search` calls `npx skills find` and parses the result.
2. `add` calls `npx skills add`, resolves the installed directory, hashes it, and writes the lock.
3. `audit` reads each pinned `SKILL.md`, applies static rules and source policy.
4. `compose` checks the plan, verifies every hash, and concatenates the pinned skills into one Markdown bundle.
5. `doctor` checks the environment and the lock without mutating anything.

## Failure modes

| Failure | Behavior |
|---|---|
| Skills CLI missing | `doctor` warns; `search`/`add` fail with a clear error. |
| Git missing | Skills CLI cannot clone some repos; install Git and retry. |
| Hash mismatch | `compose` refuses; reinstall or deliberately update the lock. |
| Plan DRAFT | `compose` refuses unless `--force`. |
| Audit high risk | `audit --strict` exits non-zero; CI fails. |
| UI port in use | Server exits with the OS error; choose `--port`. |

## Non-goals

- Running skills
- Sandboxing agents
- Replacing the Skills CLI
- Hosting a public registry
- Calling an LLM
