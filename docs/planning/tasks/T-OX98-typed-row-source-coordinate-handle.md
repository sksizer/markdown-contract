---
type: task
schema_version: '5'
id: T-OX98
status: planning/draft
created: '2026-07-03'
related:
- T-SCPP-cell-position-preservation
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
