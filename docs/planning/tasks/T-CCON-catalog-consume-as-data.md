---
type: task
schema_version: '5'
id: T-CCON
status: in-progress
created: '2026-06-30'
related:
- '[[M-0007-example-use-case-catalog]]'
parent_key: '[[T-CTLG-example-catalog-finalize]]'
depends_on: []
tags:
- docs
- examples
- catalog
- consumption
need_human_review: false
impact: medium
complexity: small
autonomy: supervised
last_reviewed: '2026-06-30'
readiness_verified_at: '2026-06-30T12:06:12Z'
---
# Finalize the Consume-as-Typed-Data catalog category as verified YAML (`consume-as-data`)

## Goal

Turn the **11 shipped** examples in the `consume-as-data` category of
`docs/example-catalog.md` (`CONSUME-AS-DATA-01`..`11`) into
`docs/catalog/consume-as-data.yaml` — structured, schema-keyed data with each
read-model sketch verified against the real consumption object model.

## Today

| Location | Role today |
|---|---|
| `docs/example-catalog.md` | Holds the `consume-as-data` section (`CONSUME-AS-DATA-01`..`11`) as a prose index table + sketches. |
| `src/core/model.test.ts` | The typed read-model (`Doc`, `SectionView`, `byAnchor`, …) the examples exercise; verified against. |
| `tests/fixtures/consumption/` | The consumption fixtures the coverage verdicts cite. |

## Proposed

`docs/catalog/consume-as-data.yaml`: 11 verified entries, each with the full
example-entry schema and a sketch reproducing the real read-model behavior.

## Approach

1. Extract `CONSUME-AS-DATA-01`..`11` from `docs/example-catalog.md` into
   `docs/catalog/consume-as-data.yaml`, one entry per example keyed by the
   example-entry schema.
2. Run each `artifact` against the real consumption object model and reconcile
   the shown values / types.
3. Re-confirm each `coverage_status` / `existing_coverage` link against
   `src/core/model.test.ts`, `src/core/projection.test.ts`, and
   `tests/fixtures/consumption/`.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `docs/catalog/consume-as-data.yaml` | new | structured, verified entries for the `consume-as-data` category |
| `docs/example-catalog.md` | modify | reconcile any corrections inline |

## Acceptance criteria

- [ ] AC-1: `docs/catalog/consume-as-data.yaml` exists with 11 entries.
- [ ] AC-2: Every entry in `docs/catalog/consume-as-data.yaml` carries all 12 example-entry schema fields (`id`, `name`, `demonstrates`, `rank`, `builds_on`, `artifact_kind`, `artifact`, `surfaces`, `needs_test`, `coverage_status`, `existing_coverage`, `recommend_test`).
- [ ] AC-3: Every `artifact` in `docs/catalog/consume-as-data.yaml` reproduces the real read-model behavior shown.
- [ ] AC-4: Every `existing_coverage` link in `docs/catalog/consume-as-data.yaml` resolves to a current test or fixture under `src/core/` or `tests/fixtures/consumption/`.

## Out of scope

- The other seven categories (their own child tasks).
- Writing new tests.
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
