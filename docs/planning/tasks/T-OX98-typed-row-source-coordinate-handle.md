---
type: task
schema_version: '5'
id: T-OX98
status: planning/draft
created: '2026-07-03'
related:
- T-SCPP-cell-position-preservation
- T-SCDF-structured-cells-dogfood
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Give model rows a typed source-coordinate handle so inlineSpans resolves by identity

## Goal

`Doc.inlineSpans(rowObj, name)` today resolves the holding table by matching row
CONTENT rather than object identity, because model row objects are plain
`Record<string, string>` with no back-link to their projection node (and must
stay clean for other fixtures' deep-equality). It works and is self-contained,
but it is an asymmetry versus `TableView.cellPos`, which already has the table
in hand. This task introduces a typed-row handle that carries its source
coordinates, so `inlineSpans` can resolve by identity and the content-match
heuristic can be removed. Surfaced by `[[T-SCPP-cell-position-preservation]]`.

> `Doc.inlineSpans(rowObj, name)` resolves the holding table by matching row
> CONTENT rather than object identity, because model row objects are plain
> `Record<string,string>` with no back-link to their projection node (and must
> stay clean for other fixtures' deep-equality). It works and is self-contained,
> but is an asymmetry vs `TableView.cellPos`, which has the table in hand. A
> future typed-row handle carrying its source coordinates would remove the
> content-match heuristic.
> — from `[[T-SCPP-cell-position-preservation]]`

## Today

_TBD — receiver to fill before promoting from planning/draft._

## Proposed

_TBD — receiver to fill before promoting from planning/draft._

## Approach

_TBD — receiver to fill before promoting from planning/draft._

## Files to touch

_TBD — receiver to fill before promoting from planning/draft._

## Acceptance criteria

_TBD — receiver to fill before promoting from planning/draft._

## Out of scope

- none

## Dependencies

- none

## Discovery context

Spawned by /sdlc:spawn-task-pr on 2026-07-03 UTC from [[T-SCPP-cell-position-preservation]] in git@github.com:sksizer/markdown-contract.git.

### Dedup search (spawn-from-post-mortem)

Bullet: `Doc.inlineSpans(row, col)` content-matches against the RAW row, but a transformed row's `Location` is an object, so passing the typed row returns `[]`; the fixture had to re-form the raw cell string from the typed value (a `rawLocation()` helper) to content-match, while `cellPos` (reference-matched on the `TableView`) accepts the typed row directly. This asymmetry is exactly what use case 2 (`scan-placeholders` masking) would hit downstream. — `inlineSpans` should accept the same row reference `cellPos` does (reference-match, not content-match) so a consumer with typed rows can read spans without reconstructing raw cell text; captured as a follow-up.
Keywords searched: reference-matched, scan-placeholders, content-matches, reference-match, reconstructing, content-match, inlinespans, transformed
Excluded: T-SCDF-structured-cells-dogfood
Top candidates (score / status / headline):
  - 17 / closed/done / T-SCPP-cell-position-preservation — Preserve per-cell `col` and inline-code byte spans on the projection (axis C1)
  - 7 / planning/draft / T-OX98-typed-row-source-coordinate-handle — Give model rows a typed source-coordinate handle so inlineSpans resolves by identity
  - 3 / closed/done / T-SCFX-structured-cells-fixture-scaffold — Scaffold the structured-cells fixtures and enable gates (`cell-typed` / `list-typed` / `cell-pos`)
  - 3 / open/ready / T-SCPA-paragraph-transform-adr — Decide the paragraph-transform generalization (design-only ADR + scoped follow-ons)
  - 1 / closed/done / T-FMSP-frontmatter-split-primitive — Frontmatter/body split — a pure splitter retained on the `parse()` result
Decision: LINKED-EXISTING T-OX98-typed-row-source-coordinate-handle
Rationale: Overrode the script's SPAWNED default. The top keyword-score candidate (T-SCPP, 17, closed/done) is a different, already-closed task; candidate #2 T-OX98 (score 7, planning/draft) is a near-exact semantic duplicate — same `inlineSpans` content-match vs `cellPos` reference-match asymmetry, same typed-row-handle fix — and was itself spawned from T-SCPP. Linked to T-OX98 rather than spawn a duplicate follow-up.
