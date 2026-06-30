---
type: task
schema_version: "5"
id: T-CEMB
status: in-progress
created: 2026-06-30
related:
  - "[[M-0007-example-use-case-catalog]]"
parent_key: "[[T-CTLG-example-catalog-finalize]]"
depends_on: []
tags:
  - docs
  - examples
  - catalog
  - runner
  - ci
need_human_review: false
impact: medium
complexity: medium
autonomy: supervised
last_reviewed: 2026-06-30
readiness_verified_at: 2026-06-30T18:04:56Z
prs:
  - https://github.com/sksizer/markdown-contract/pull/130
---
# Finalize the Embed-and-Automate catalog category as verified YAML (`embed-and-ci`)

## Goal

Turn the **11 shipped** examples in the `embed-and-ci` category of
`docs/example-catalog.md` (`EMBED-AND-CI-01`..`11`) into
`docs/catalog/embed-and-ci.yaml` — structured, schema-keyed data with each runner
/ CI sketch verified against the real `runCorpus` library surface.

## Today

| Location | Role today |
|---|---|
| `docs/example-catalog.md` | Holds the `embed-and-ci` section (`EMBED-AND-CI-01`..`11`) as a prose index table + sketches. |
| `src/runner/` | The runner library (`runCorpus`, aggregation, exit codes) the examples embed; verified against. |
| `src/cli/` | The CLI gating examples wrap the runner with. |

## Proposed

`docs/catalog/embed-and-ci.yaml`: 11 verified entries, each with the full
example-entry schema and a sketch reproducing the real runner / exit-code
behavior.

## Approach

1. Extract `EMBED-AND-CI-01`..`11` from `docs/example-catalog.md` into
   `docs/catalog/embed-and-ci.yaml`, one entry per example keyed by the
   example-entry schema.
2. Run each `artifact` against the real runner library / CLI and reconcile the
   aggregated findings and exit codes shown.
3. Re-confirm each `coverage_status` / `existing_coverage` link against
   `src/runner/` and `src/cli/`; keep the `EMBED-AND-CI-03` follow-up link to
   [[T-ROUT-runcorpus-first-match-routing]] exact.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `docs/catalog/embed-and-ci.yaml` | new | structured, verified entries for the `embed-and-ci` category |
| `docs/example-catalog.md` | modify | reconcile any corrections inline |

## Acceptance criteria

- [ ] AC-1: `docs/catalog/embed-and-ci.yaml` exists with 11 entries.
- [ ] AC-2: Every entry in `docs/catalog/embed-and-ci.yaml` carries all 12 example-entry schema fields (`id`, `name`, `demonstrates`, `rank`, `builds_on`, `artifact_kind`, `artifact`, `surfaces`, `needs_test`, `coverage_status`, `existing_coverage`, `recommend_test`).
- [ ] AC-3: Every `artifact` in `docs/catalog/embed-and-ci.yaml` reproduces the real runner / exit-code behavior shown.
- [ ] AC-4: Every `existing_coverage` link in `docs/catalog/embed-and-ci.yaml` resolves to a current test under `src/runner/` or `src/cli/`; the `EMBED-AND-CI-03` `recommend_test` points at `[[T-ROUT-runcorpus-first-match-routing]]`.

## Out of scope

- The other seven categories (their own child tasks).
- Writing the runner test itself ([[T-ROUT-runcorpus-first-match-routing]]).
- Building the site — [[T-SITE-bootstrap-docs-website]] (M-0006).

## Dependencies

Child of [[T-CTLG-example-catalog-finalize]]; consumes `docs/example-catalog.md`.

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

_TBD — filled at Step 8._

### What worked

_TBD — filled at Step 8._

### Friction and automation gaps

_TBD — filled at Step 8._
