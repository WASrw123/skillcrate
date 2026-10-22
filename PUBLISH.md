# Publish

The repository is already committed on `main`.

## Current state

```bash
git status
git log --oneline -1
```

## Option A — GitHub CLI

```bash
gh auth login
gh repo create skillcrate --public --source=. --remote=origin --push
```

If the repository already exists:

```bash
git remote add origin https://github.com/WASrw123/skillcrate.git
git push -u origin main
```

## Option B — create the empty repository in the browser

1. Open <https://github.com/new>.
2. Name: `skillcrate`.
3. Visibility: public (or private, if preferred).
4. Do **not** initialize with a README, license, or `.gitignore`.
5. Create the repository.
6. Run:

```bash
cd E:\skillcrate
git remote add origin https://github.com/WASrw123/skillcrate.git
git push -u origin main
```

When Git Credential Manager opens, sign in to GitHub.

## After push

- Confirm the `CI` workflow runs on the Actions tab.
- Add a repository description:
  `Local-first supply chain for agent skills: discover, pin, audit, compose.`
- Add topics:
  `agent-skills`, `skills`, `cli`, `supply-chain`, `lockfile`, `audit`, `ai-agents`.
- Create a `v0.1.0` release from the first commit.

## Notes

- `node_modules/` is ignored.
- `dist/` is ignored; bundles are build artifacts.
- `skillcrate.lock.json` in a user project **should** be committed.
- The current Git credential on this machine returned HTTP 401 during preparation, so a fresh login is required.
