---
type: task
schema_version: "5"
id: T-CRWS
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
  - real-world
need_human_review: false
impact: medium
complexity: medium
autonomy: supervised
last_reviewed: 2026-06-30
readiness_verified_at: 2026-06-30T17:38:43Z
prs:
  - https://github.com/sksizer/markdown-contract/pull/128
---
# Finalize the Real-World-Schemas catalog category as verified YAML (`real-world-schemas`)

## Goal

Turn the **15 shipped** examples in the `real-world-schemas` category of
`docs/example-catalog.md` (`REAL-WORLD-SCHEMAS-01`..`15`) into
`docs/catalog/real-world-schemas.yaml` — the capstone category of end-to-end
document-template and cross-document governance examples — each verified against
the real engine, plus the **1 planned** example (`REAL-WORLD-SCHEMAS-16`) carried
as `status: planned`.

## Today

| Location | Role today |
|---|---|
| `docs/example-catalog.md` | Holds the `real-world-schemas` section (`REAL-WORLD-SCHEMAS-01`..`16`; 16 planned) as a prose index table + sketches. |
| `src/runner/` | The `runCorpus` + `docRule` cross-document surface the capstone examples exercise; verified against. |
| `tests/fixtures/` | The corpus the coverage verdicts cite (validation + consumption + corpus fixtures). |

## Proposed

`docs/catalog/real-world-schemas.yaml`: 15 verified shipped entries plus 1
planned entry, each with the full example-entry schema.

## Approach

1. Extract `REAL-WORLD-SCHEMAS-01`..`16` from `docs/example-catalog.md` into
   `docs/catalog/real-world-schemas.yaml`, one entry per example keyed by the
   example-entry schema.
2. Run each shipped `artifact` against the real engine (`runCorpus`, `docRule`,
   typed frontmatter) and reconcile the aggregated findings / exit codes.
3. Mark `REAL-WORLD-SCHEMAS-16` `status: planned` (link C-0009 / D-0011) and
   exclude it from coverage.
4. Re-confirm each shipped `coverage_status` / `existing_coverage` link; keep the
   `recommend_test` links to [[T-DRAG-docrule-runcorpus-aggregation]]
   (REAL-WORLD-SCHEMAS-12, 13) and [[T-ROUT-runcorpus-first-match-routing]]
   (REAL-WORLD-SCHEMAS-11) exact.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `docs/catalog/real-world-schemas.yaml` | new | 15 verified + 1 planned entries for the `real-world-schemas` category |
| `docs/example-catalog.md` | modify | reconcile any corrections inline |

## Acceptance criteria

- [ ] AC-1: `docs/catalog/real-world-schemas.yaml` exists with 16 entries (15
  shipped + 1 planned).
- [ ] AC-2: Every entry in `docs/catalog/real-world-schemas.yaml` carries all 12 example-entry schema fields (`id`, `name`, `demonstrates`, `rank`, `builds_on`, `artifact_kind`, `artifact`, `surfaces`, `needs_test`, `coverage_status`, `existing_coverage`, `recommend_test`).
- [ ] AC-3: Every shipped `artifact` in `docs/catalog/real-world-schemas.yaml` reproduces the real engine findings / exit codes.
- [ ] AC-4: `REAL-WORLD-SCHEMAS-16` carries `status: planned`; the
  `recommend_test` links point at T-DRAG / T-ROUT.

## Out of scope

- The other seven categories (their own child tasks).
- Writing the runner / docRule tests themselves
  ([[T-ROUT-runcorpus-first-match-routing]], [[T-DRAG-docrule-runcorpus-aggregation]]).
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
