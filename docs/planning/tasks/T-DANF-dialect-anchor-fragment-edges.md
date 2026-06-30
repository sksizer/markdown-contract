---
type: task
schema_version: '5'
id: T-DANF
status: in-progress
created: '2026-06-28'
related:
- '[[M-0007-example-use-case-catalog]]'
depends_on: []
tags:
- test
- dialect
- anchors
need_human_review: false
impact: low
complexity: small
autonomy: supervised
last_reviewed: '2026-06-30'
readiness_verified_at: '2026-06-30T06:22:46Z'
---
# Dialect edge cases: section-id `byAnchor` negative and `#^anchor` fragment value

## Goal

Pin two thin dialect assertions that catalog examples rely on but no test currently covers, so the documented behavior is regression-guarded. Promoted from backlog B-DANF, surfaced by catalog examples `DIALECT-02` and `DIALECT-05` in [[M-0007-example-use-case-catalog]].

## Today

Two gaps in the dialect/projection unit tests:

1. `byAnchor(section-level-id) === undefined` — section ids live on `SectionView.anchors`, not in the block-level `byAnchor` index; the negative is not pinned.
2. The `#^anchor` fragment form parsing to `VaultRef.fragment === '^id'` — the projection round-trip uses it but only checks `target` / `kind`, not the fragment value.

## Proposed

Add the two missing assertions to the existing dialect/projection peer tests: one asserting a section-level id is absent from `byAnchor` (and present on `SectionView.anchors`), and one asserting a `#^anchor` wikilink parses to `VaultRef.fragment === '^id'`.

## Approach

Extend `src/core/dialect/*.test.ts` and `src/core/projection.test.ts` with the two cases; no engine change — these pin existing behavior.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/core/dialect/wikilinks.test.ts` | modify | assert a `#^anchor` wikilink parses to `VaultRef.fragment === '^id'` |
| `src/core/projection.test.ts` | modify | assert a section-level id is absent from `byAnchor` (present on `SectionView.anchors`) |

## Acceptance criteria

- [ ] A test asserts `byAnchor(<section-level-id>)` is `undefined` and the same id is reachable via `SectionView.anchors`.
- [ ] A test asserts a `#^anchor` wikilink parses to `VaultRef.fragment === '^id'` (fragment value, not just `target`/`kind`).
- [ ] `npm run typecheck` and `npm test` stay green.

## Out of scope

- Any change to dialect/projection behavior — this is coverage only.
- New first-class referential-integrity features ([[T-DREF-dialect-referential-integrity]]).

## Dependencies

- None. Pins behavior already shipped under the dialect/projection engine. Promoted from the B-DANF backlog note.

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

- AC-1 (section-level id absent from `byAnchor`, present on `SectionView.anchors`): auto — new `model.test.ts` case builds a doc via `read()` with a section-level `^section-id` and asserts `notes.byAnchor("section-id")` is `undefined` while `notes.anchors` contains it. Verified by `npx vitest run src/core/model.test.ts`.
- AC-2 (`#^anchor` wikilink → `VaultRef.fragment === '^id'`): auto — new `wikilinks.test.ts` case asserts `extractVaultRefs("[[Note#^block-id]]")` yields `fragment: "^block-id"` (caret retained). Verified by `npx vitest run src/core/dialect/wikilinks.test.ts`.
- AC-3 (`npm run typecheck` and `npm run test` stay green): auto — `sdlc quality run` reported `OK 2/2` (baseline-gated, no new drift).

### What worked

- The deterministic readiness gate (`gap-report`) confirmed 0 gaps up front, so Step 5 was a clean pass-then-flip with no spec back-and-forth.
- The baseline-gated quality gate cleanly separated this branch's coverage from the parallel in-flight engine churn — `OK 2/2` with no triage of pre-existing findings.

### Friction and automation gaps

- The task's `## Files to touch` named `src/core/projection.test.ts` for the `byAnchor` negative, but `byAnchor` and `SectionView.anchors` are model-layer members built via `read()` and are not reachable from `projection.test.ts`'s `parse()` tree — the assertion landed in `src/core/model.test.ts` instead. The readiness gate only checks that cited paths *exist*, not that the asserted symbol is reachable from that file's layer — a layer-mismatch check (does the cited test file import/reach the symbol the AC names?) would have caught the projection-vs-model confusion at definition time rather than implementation time. → [[T-OZ6A-readiness-gate-checks-symbol-reachability]]

### Spawned follow-up tasks

- [[T-OZ6A-readiness-gate-checks-symbol-reachability]] (https://github.com/sksizer/dev/pull/517) — readiness gate gains a layer-mismatch check so a cited test file must reach the symbol its AC names; spawned (Upstream-plugin / sdlc-meta).
