---
type: task
schema_version: '5'
id: T-CDIA
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
- dialect
need_human_review: false
impact: medium
complexity: small
autonomy: supervised
last_reviewed: '2026-06-30'
readiness_verified_at: '2026-06-30T06:23:42Z'
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

- AC-1: auto — `docs/catalog/dialect.yaml` parsed: `examples` length 11, ids exactly `DIALECT-01`..`DIALECT-11`, top-level `category: dialect`.
- AC-2: auto — every entry carries all 12 example-entry fields (`id`, `name`, `demonstrates`, `rank`, `builds_on`, `artifact_kind`, `artifact`, `surfaces`, `needs_test`, `coverage_status`, `existing_coverage`, `recommend_test`); checked programmatically over the parsed YAML.
- AC-3: agent-manual — a scratch script importing `extractVaultRefs` from `src/core/dialect/wikilinks.ts` reproduced the catalog `→` outputs exactly for DIALECT-03..06 (target/alias/fragment-with-leading-`^`/raw all verbatim); DIALECT-01/02 (`byAnchor`/`SectionView.anchors`) and DIALECT-09 (`structure/anchor-missing`) confirmed against `tests/fixtures/consumption/07-byanchor-declared-vs-dynamic.ts`, `tests/fixtures/consumption/04-sectionview-content.ts`, and `tests/fixtures/validation/09b-anchor-missing.ts`; DIALECT-10/11 docRule API names confirmed as real exports/methods. A second scratch check confirmed each `artifact` matches its `example-catalog.md` fenced block byte-for-byte.
- AC-4: auto — coverage counts are 6 covered / 2 partial / 3 uncovered (covered {01,03,04,06,07,09}, partial {02,05}, uncovered {08,10,11}); `recommend_test` → `[[T-DANF-dialect-anchor-fragment-edges]]` on 02/05 and `[[T-DREF-dialect-referential-integrity]]` on 10/11, `null` elsewhere; all cited `existing_coverage` paths confirmed present on disk.

### What worked

- The scratch-script verification reproduced `extractVaultRefs` outputs byte-for-byte, so AC-3 was machine-checkable rather than eyeballed.
- The existing test corpus already covered the anchor / `byAnchor` / `anchor-missing` behaviors, so no new fixtures were needed; `npm run test` + `npm run typecheck` stayed `OK 2/2` — a docs-only YAML add had zero effect on the suite.
- No `docs/`-globbing parity test exists in vitest (it only globs `src/**/*.test.ts` and `tests/**/*.test.ts`), so the new file slotted in cleanly.

### Friction and automation gaps

- The dialect sketches `import { extractVaultRefs } from "markdown-contract"` (DIALECT-03/07/08/10/11) reference a real, correct-behaving function that has no importable public path — it is re-exported only by `src/core/dialect/index.ts`, not the public barrel `src/index.ts`, and `package.json` exposes only the `.` and `./declarative` subpaths — export `extractVaultRefs` and the `VaultRef` type from the package root so the dialect sketches become literally copy-pasteable.
- Nothing keeps a `docs/catalog/*.yaml` artifact in sync with its `docs/example-catalog.md` source; byte-equality was verified here with a throwaway script — add a corpus parity test that asserts each catalog YAML `artifact` matches its example-catalog.md sketch, once more categories land.
