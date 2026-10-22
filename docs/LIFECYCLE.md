# Lifecycle

SkillCrate models a skill as a dependency, not a download.

## 1. Discover

```bash
skillcrate search "excel automation"
```

Look at install count, owner, repository, and the linked `SKILL.md`.
Search is a starting point, not an approval.

## 2. Pin

```bash
skillcrate add claude-office-skills/skills@excel-automation -g
```

The Skills CLI installs it. SkillCrate records:

- package and skill name
- global or project scope
- install path
- SHA-256 over the skill directory
- install timestamp

Commit `skillcrate.lock.json`.

## 3. Audit

```bash
skillcrate audit --strict
```

Findings are grouped by high / medium / low.
Source policy is applied at the same time.

A low-risk finding is not automatically fine. It is a prompt to read the line.

## 4. Plan

```bash
skillcrate plan
# edit PLAN.md
skillcrate plan --check
```

The plan gate is intentionally binary: `DRAFT` blocks compose; `READY` allows it.
`--force` exists for drafts, not for releases.

## 5. Compose

```bash
skillcrate compose excel
```

The output is a deterministic Markdown bundle:

- profile metadata
- plan status
- each skill's source and hash
- each `SKILL.md` body

If a hash does not match, compose stops.

## 6. Verify

```bash
skillcrate doctor
skillcrate export
```

`doctor` checks the environment and lock.
`export` writes `SKILLS.md`, a reviewable inventory for humans.

## 7. Update

There is no silent auto-update.

1. Re-run `skillcrate add` for the new version.
2. Review the new `SKILL.md`.
3. Re-run `skillcrate audit`.
4. Re-compose.
5. Commit the lock and bundle changes together.

## 8. Remove

```bash
skillcrate remove excel-automation -g
```

This removes the skill through the Skills CLI and updates the lock.

## Team review checklist

- [ ] Source is on the allowlist.
- [ ] Install count is acceptable.
- [ ] `SKILL.md` was read, not just scanned.
- [ ] Plan says `READY`.
- [ ] Audit passes under the project policy.
- [ ] Lock and bundle are in the same PR.
- [ ] A rollback path exists.
