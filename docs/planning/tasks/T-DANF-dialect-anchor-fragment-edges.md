---
type: task
schema_version: '5'
id: T-DANF
status: open/ready
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
readiness_verified_at: '2026-06-30T05:29:43Z'
last_reviewed: '2026-06-30'
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
