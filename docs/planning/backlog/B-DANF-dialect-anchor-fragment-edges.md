---
type: backlog
schema_version: '1'
id: B-DANF
last_reviewed: '2026-06-28'
tags:
- test
- dialect
- anchors
---
# Dialect edge cases: section-id byAnchor negative and #^anchor fragment value

Two thin assertions missing from the dialect unit tests:

1. `byAnchor(section-level-id) === undefined` — section ids live on `SectionView.anchors`,
   not in the block-level `byAnchor` index; the negative is not pinned.
2. The `#^anchor` fragment form parsing to `VaultRef.fragment === '^id'` — the projection
   round-trip uses it but only checks `target` / `kind`, not the fragment value.

Surfaced by catalog examples `DIALECT-02` (anchor a section, read it from `.anchors`) and
`DIALECT-05` (read heading and anchor fragments) in [[M-0007-example-use-case-catalog]].
Priority: low — small, targeted assertions in the existing
`src/core/dialect/*.test.ts` / `src/core/projection.test.ts`.
