# Plan-first example

A minimal project that pins two skills and composes them into a reviewable bundle.

```bash
cd examples/plan-first

skillcrate add vercel-labs/skills@find-skills -g
skillcrate add mattpocock/skills@grill-me -g

skillcrate list
skillcrate audit
skillcrate plan --check

skillcrate compose plan
skillcrate compose review
```

Outputs:

```text
dist/plan.md
dist/review.md
```

`plan` contains only `grill-me`.
`review` combines `find-skills` and `grill-me`.

The point is not the two skills. The point is the gate:

```text
find → pin → audit → plan → compose
```

`compose` will refuse if `PLAN.md` is still `DRAFT`.
