---
type: task
schema_version: '5'
id: T-IB37
status: planning/draft
created: '2026-07-04'
related:
- T-SCDF-structured-cells-dogfood
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Correct D-0015 worked-example regex to the flattened cell grammar (cell text is flattened before the cell schema runs)

## Goal

A gap surfaced by [[T-SCDF-structured-cells-dogfood]] in
`git@github.com:sksizer/markdown-contract.git`: the `table({ cells })`
projection flattens inline-code backticks out of cell text *before* the cell
schema runs, so D-0015's canonical *backticked* `LOCATION_RE` worked example
matches nothing against the shipped projection. This task corrects the
design-doc worked example (and/or documents the flatten-before-cell-schema
ordering at the `table({ cells })` API) so the next author does not copy a
regex that cannot match.

> The table({ cells }) projection flattens inline-code backticks out of cell
> text before the cell schema runs, so D-0015's canonical backticked
> LOCATION_RE in provenance/d0015/proposed-shape.md matches nothing — the
> worked-example regex is wrong against the shipped projection. Fix: correct
> the proposed-shape worked example to the flattened grammar, and/or document
> the flatten-before-cell-schema ordering at the table({ cells }) API, so the
> next author does not copy a regex that cannot match.
> — from [[T-SCDF-structured-cells-dogfood]]

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

Spawned by /sdlc:spawn-task-pr on 2026-07-04 UTC from [[T-SCDF-structured-cells-dogfood]] in git@github.com:sksizer/markdown-contract.git.
