# SkillCrate

**A local-first supply chain for agent skills.**

`find-skills` helps you discover a skill. `grill-me` helps you sharpen a plan.
**SkillCrate manages the whole lifecycle: discover → pin → audit → compose → verify → ship.**

It is a small CLI and local dashboard for teams and individuals who use the open agent-skills ecosystem and want more than "install and hope".

```text
search        find candidates, with install counts
add           install via the Skills CLI, then pin source + content hash
lock          reproducible skillcrate.lock.json
audit         static risk scan + source policy
plan          a grill-me style design gate before composing
compose       build one Markdown bundle from a profile of pinned skills
export        generate a reviewable SKILLS.md inventory
doctor        check Node, Git, Skills CLI, lock integrity, and plan state
ui            local dashboard with no telemetry
```

---

## Why

The skills ecosystem is growing faster than the tooling around it.

- Search results are not a trust signal.
- `SKILL.md` files can contain shell commands, network calls, or hard-coded secrets.
- "It works on my machine" is normal when skills are installed globally without a lock.
- Teams need an inventory, a policy, and a repeatable way to compose skills into a workflow.
- A plan should be challenged **before** code is written.

SkillCrate does not replace the Skills CLI. It wraps it, records what happened, and makes the result reviewable.

---

## Install

Requires **Node.js 20+** and Git on `PATH`.

```bash
git clone <your-repo-url> skillcrate
cd skillcrate
npm install
npm link
```

Then:

```bash
skillcrate --version
skillcrate doctor
```

You can also run it without linking:

```bash
node bin/skillcrate.js --help
```

> Windows: if PowerShell blocks `.ps1` shims, use `npx.cmd` / `npm.cmd`; SkillCrate detects the full `npx.cmd` path automatically.

---

## Quickstart

```bash
mkdir my-project && cd my-project
skillcrate init my-project
```

This creates:

```text
skillcrate.yaml       project + profiles
policy.yaml           allowed sources, max risk, plan gate
PLAN.md               design tree (starts as DRAFT)
.gitignore
```

Search and pin:

```bash
skillcrate search "excel automation"
skillcrate add claude-office-skills/skills@excel-automation -g
skillcrate list
```

Audit:

```bash
skillcrate audit
```

Close the plan, then compose:

```bash
# edit PLAN.md: fill the design tree, set Status: READY
skillcrate plan --check
skillcrate compose excel
```

Open the dashboard:

```bash
skillcrate ui
# http://127.0.0.1:4777
```

---

## Commands

| Command | What it does |
|---|---|
| `init [name]` | Create `skillcrate.yaml`, `policy.yaml`, `PLAN.md`, `.gitignore`. |
| `search <query>` | Search the Skills CLI, parse results, show install counts. |
| `add <owner/repo@skill>` | Install with the Skills CLI and pin source, scope, path, hash. |
| `remove <skill>` | Remove from the Skills CLI and from the lock. |
| `list` | Show pinned skills and whether their content still matches. |
| `audit [--strict]` | Scan `SKILL.md`, enforce source policy, print findings. |
| `plan [--check]` | Create or check the design-gate file. |
| `compose <profile>` | Build a Markdown bundle from pinned skills. |
| `export` | Write `SKILLS.md` for review. |
| `doctor` | Check Node, Git, Skills CLI, config, lock, files, and plan. |
| `ui` | Serve a local dashboard at `127.0.0.1:4777`. |

Useful flags:

```bash
--global / --project     installation scope
--json                   machine-readable output
--strict                 non-zero exit when audit fails
--force                  overwrite output, or bypass the plan gate
--cwd <dir>              operate on another project
```

---

## Lockfile

`skillcrate.lock.json` is deliberately boring and reviewable:

```json
{
  "version": 1,
  "generatedAt": "2026-10-23T00:00:00.000Z",
  "skills": [
    {
      "name": "grill-me",
      "package": "mattpocock/skills@grill-me",
      "scope": "global",
      "path": "C:\\Users\\you\\.agents\\skills\\grill-me",
      "sha256": "…",
      "installedAt": "2026-10-23T00:00:00.000Z"
    }
  ]
}
```

The hash covers every file in the skill directory (excluding `.git` and `node_modules`).
If the directory changes, `list` marks it `stale` and `compose` refuses to build.

---

## Policy

`policy.yaml` is intentionally simple:

```yaml
version: 1
allowedSources:
  - "vercel-labs/*"
  - "mattpocock/*"
  - "claude-office-skills/*"
  - "anthropics/*"
  - "microsoft/*"
deniedSources: []
maxRisk: medium
requirePlan: true
```

- `allowedSources` uses owner globs.
- `maxRisk` is `low`, `medium`, or `high`.
- `requirePlan` blocks `compose` until `PLAN.md` says `Status: READY`.
- An empty `allowedSources` means "open policy".

Audit checks for:

- pipe-to-shell downloads
- destructive deletes
- encoded PowerShell
- private keys
- hard-coded secrets
- dynamic `eval`
- child-process execution
- base64 decoding
- network endpoints
- source-policy violations

It is a **static signal**, not a sandbox. Read the skill before you install it.

---

## Profiles and compose

```yaml
profiles:
  discovery:
    description: Find and evaluate new skills
    skills:
      - find-skills

  plan:
    description: Plan before writing code
    skills:
      - grill-me

  excel:
    description: Plan, process, and review Excel work
    skills:
      - grill-me
      - excel-automation
```

```bash
skillcrate compose excel
# → dist/excel.md
```

The bundle contains the metadata and full `SKILL.md` body of each pinned skill.
It is designed to be pasted into an agent session, checked into a repo, or attached to a runbook.

`--force` overwrites the output **and** bypasses the plan gate. Use it for drafts, not for releases.

---

## Plan gate

`PLAN.md` is a lightweight design tree:

```markdown
Status: READY

## Design tree
- [x] Goal
- [x] Users
- [x] Inputs
- [x] Outputs
- [x] Constraints
- [x] Acceptance
```

The gate is deliberately annoying: `compose` fails on `Status: DRAFT`.
That is the point. A bundle is an executable decision, not a folder of links.

---

## Dashboard

`skillcrate ui` starts a local-only server and renders:

- project name and scope
- pinned skills + content hashes
- plan state
- profiles
- next commands

No telemetry, no external assets, no auth. It binds to `127.0.0.1` by default.

---

## Example

See [`examples/plan-first`](examples/plan-first):

```bash
cd examples/plan-first
skillcrate doctor
skillcrate audit
skillcrate compose plan
skillcrate compose review
```

The example includes a completed `PLAN.md`; run the two `add` commands first so `compose` has a lock to build from.
It pins `find-skills` and `grill-me` themselves, which makes the supply chain easy to inspect.

---

## Comparison

| Capability | find-skills | grill-me | SkillCrate |
|---|---:|---:|---:|
| Discover skills | ✓ |  | ✓ |
| Quality questions |  | ✓ | ✓ (`plan`) |
| Pin source + hash |  |  | ✓ |
| Audit `SKILL.md` |  |  | ✓ |
| Source policy |  |  | ✓ |
| Compose skill bundles |  |  | ✓ |
| Team inventory |  |  | ✓ |
| CI check |  |  | ✓ |
| Local dashboard |  |  | ✓ |

SkillCrate is complementary: it can install and pin `find-skills` and `grill-me` themselves.

---

## Security model

SkillCrate is a **review tool**, not a security boundary.

- It does not sandbox skill execution.
- It cannot prove a skill is safe.
- It does not upload your files.
- It does not call an LLM.
- It reads local `SKILL.md` files and writes local bundles.

Always review a skill before installing it, especially if it asks for credentials or network access.

---

## Development

```bash
npm install
npm test
node bin/skillcrate.js --help
```

Tests use the built-in Node test runner and temporary directories. No network is required.

CI runs on Node 20, 22, and 24 on Ubuntu and Windows.

---

## Roadmap

- [ ] Registry adapters beyond the Skills CLI (private catalogs, Git tags)
- [ ] Signed lockfiles and attestations
- [ ] `skillcrate diff` between two lockfiles
- [ ] Profile-level eval tasks
- [ ] VS Code / Cursor extension
- [ ] Policy packs for teams

---

## License

MIT. See [LICENSE](LICENSE).
