# Contributing

## Development

```bash
git clone <repo>
cd skillcrate
npm install
npm test
node bin/skillcrate.js --help
```

## Principles

- Keep the CLI dependency-light.
- Prefer local files and deterministic output.
- Wrap the Skills CLI instead of forking it.
- Add a test for every policy or audit rule.
- Do not add telemetry.
- Do not add a network call unless it is essential and documented.

## Pull requests

1. Describe the user-visible change.
2. Add or update tests.
3. Update README or docs if behavior changes.
4. Keep the lockfile schema backward compatible, or add a migration.

## Commit messages

Use a short imperative subject:

```text
add policy glob matching
fix compose plan gate
docs: clarify Windows npx path
```
