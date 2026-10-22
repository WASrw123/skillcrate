# Security

SkillCrate is a review and packaging tool. It is not a sandbox.

## What it does

- Reads local `SKILL.md` files.
- Applies static patterns and source policy.
- Hashes installed skill directories.
- Writes local bundles and a local inventory.
- Starts a local HTTP dashboard on `127.0.0.1`.

## What it does not do

- Execute skills.
- Upload files.
- Call an LLM.
- Prove that a skill is safe.
- Replace human review.

## Reporting a vulnerability

Open a private security advisory on GitHub, or email the maintainers listed in the repository profile. Do not open a public issue with exploit details.

Include:

- affected version
- minimal reproduction
- impact
- suggested fix, if known

## Supply-chain hygiene

- Pin a commit or release of SkillCrate in CI.
- Commit `skillcrate.lock.json`.
- Treat `SKILL.md` as executable content.
- Use project scope for experiments.
- Do not put secrets in a skill or in a plan.
