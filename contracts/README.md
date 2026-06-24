# Dogfood contracts — this project's own planning docs

`markdown-contract` validating `markdown-contract`'s own SDLC planning docs
(`docs/planning/**`), authored entirely in the declarative YAML format.

## Run it

```bash
npm run lint:docs
# = npm run build && markdown-contract validate docs/planning
```

`markdown-contract.yaml` (repo root) is a default config name, so a bare
`markdown-contract validate docs/planning` from the repo root discovers it
automatically. Scoping the run to `docs/planning` keeps it fast and off the
intentionally-malformed test fixtures and the freeform `provenance/` notes.

## What's covered

One contract per SDLC doc type, bound by id-prefixed filename:

| Contract | Matches | Required sections (body) |
|---|---|---|
| `capability.contract.yaml` | `C-*.md` | Summary · Statement · What it provides · Inputs · Outputs · Hook points · Underlying implementation · Notes |
| `decision.contract.yaml` | `D-*.md` | Summary · Context · Decision · Why · Consequences · References |
| `driver.contract.yaml` | `DR-*.md` | Statement · Who/what it affects · Evidence · Toward resolution |
| `milestone.contract.yaml` | `M-*.md` | Success criteria (bodies vary by lifecycle, so kept loose) |
| `product.contract.yaml` | `PR-*.md` | Summary · What it is · Boundary · Drivers & goals · Status · References |
| `task.contract.yaml` | `T-*.md` | Goal · Today · Proposed · Approach · Files to touch · Acceptance criteria · Out of scope · Dependencies |

Each contract also checks frontmatter: the `type` constant, the id pattern, a
non-empty `title` (except tasks, which carry no title), a `phase/state` `status`,
and an ISO-`date` `created`. Frontmatter is **non-strict** — the rich SDLC
frontmatter (`schema_version`, `kind`, `related`, `tags`, …) passes through — and
bodies use `order: none` + `allowUnknown: true`, so extra/optional sections (e.g.
`CLI usage`, `Open questions`) are fine; the contracts assert the *required* spine.

As of writing this validates **33 docs** (7 capabilities, 8 decisions, 5 drivers,
2 milestones, 2 products, 9 tasks) with **no findings**. `docs/planning/vision.md`
is intentionally unmatched (a freeform singleton).
