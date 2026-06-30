---
type: task
schema_version: "5"
id: T-CDIA
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
  - dialect
need_human_review: false
impact: medium
complexity: small
autonomy: supervised
last_reviewed: 2026-06-30
readiness_verified_at: 2026-06-30T06:23:42Z
prs:
  - https://github.com/sksizer/markdown-contract/pull/96
---
# Finalize the Dialect catalog category as verified YAML (`dialect`)

## Goal

Turn the **11 shipped** examples in the `dialect` category of
`docs/example-catalog.md` (`DIALECT-01`..`11`) into `docs/catalog/dialect.yaml` —
structured, schema-keyed data with each anchor / wikilink / vault-ref sketch
verified against the real dialect + projection surface. This category has the
most open coverage gaps, so the coverage verdicts and their follow-up links
(T-DANF, T-DREF) must be exact.

## Today

| Location | Role today |
|---|---|
| `docs/example-catalog.md` | Holds the `dialect` section (`DIALECT-01`..`11`) as a prose index table + sketches, including the `add →` follow-up links to T-DANF / T-DREF. |
| `src/core/dialect/` | The anchors + wikilinks dialect surface the examples exercise; verified against. |
| `src/core/projection.test.ts` | The projection round-trip the dialect examples rely on. |

## Proposed

`docs/catalog/dialect.yaml`: 11 verified entries, each with the full
example-entry schema, accurate `coverage_status` (6 covered / 2 partial / 3
uncovered) and `recommend_test` follow-up links.

## Approach

1. Extract `DIALECT-01`..`11` from `docs/example-catalog.md` into
   `docs/catalog/dialect.yaml`, one entry per example keyed by the example-entry
   schema.
2. Run each `artifact` against the real dialect / projection API and reconcile
   the shown values (`byAnchor`, `SectionView.anchors`, `VaultRef.*`).
3. Re-confirm each `coverage_status` / `existing_coverage` link against
   `src/core/dialect/` and `src/core/projection.test.ts`; keep the
   `recommend_test` links to [[T-DANF-dialect-anchor-fragment-edges]] (DIALECT-02,
   05) and [[T-DREF-dialect-referential-integrity]] (DIALECT-10, 11) exact.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `docs/catalog/dialect.yaml` | new | structured, verified entries for the `dialect` category |
| `docs/example-catalog.md` | modify | reconcile any corrections inline |

## Acceptance criteria

- [ ] AC-1: `docs/catalog/dialect.yaml` exists with 11 entries.
- [ ] AC-2: Every entry in `docs/catalog/dialect.yaml` carries all 12 example-entry schema fields (`id`, `name`, `demonstrates`, `rank`, `builds_on`, `artifact_kind`, `artifact`, `surfaces`, `needs_test`, `coverage_status`, `existing_coverage`, `recommend_test`).
- [ ] AC-3: Every `artifact` in `docs/catalog/dialect.yaml` reproduces the real dialect / projection behavior shown.
- [ ] AC-4: `coverage_status` in `docs/catalog/dialect.yaml` matches the corpus (6 covered, 2 partial, 3 uncovered); the `recommend_test` links point at `[[T-DANF-dialect-anchor-fragment-edges]]` and `[[T-DREF-dialect-referential-integrity]]`.

## Out of scope

- The other seven categories (their own child tasks).
- Writing the dialect tests themselves ([[T-DANF-dialect-anchor-fragment-edges]],
  [[T-DREF-dialect-referential-integrity]]).
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
