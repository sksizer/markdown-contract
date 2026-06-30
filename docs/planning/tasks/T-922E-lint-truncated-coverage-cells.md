---
type: task
schema_version: '5'
id: T-922E
status: planning/draft
created: '2026-06-30'
related:
- T-CVPL-catalog-validation-planes
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Lint catalog `existing_coverage` cells for mid-string truncation

## Goal

The `docs/example-catalog.md` index table can ship `existing_coverage`
coverage-path cells truncated mid-string, which silently lose the intended
fixture path until someone re-derives it by hand. Add a catalog lint that flags
truncated / `…`-ending `existing_coverage` cells so the truncation is caught at
authoring time rather than during a later YAML-ization pass.

> From [[T-CVPL-catalog-validation-planes]] in
> https://github.com/sksizer/markdown-contract: The `docs/example-catalog.md`
> index table had coverage-path cells truncated mid-string in the source (rows
> 5, 7, 8) — completing them required grepping the fixtures dir for the intended
> sibling paths. A catalog lint that flags truncated / `…`-ending
> `existing_coverage` cells would catch this at authoring time.

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

<Things adjacent to this task that are deliberately NOT being addressed
here. Useful for keeping PR review focused and for future tasks to point
back to. Always required: if scope is obvious and nothing is excluded,
leave a single "- none" bullet so the explicit signal is "scope
considered, nothing to exclude.">

- none

## Dependencies

- none

## Discovery context

Spawned by /sdlc:spawn-task-pr on 2026-06-30 UTC from
[[T-CVPL-catalog-validation-planes]] in
https://github.com/sksizer/markdown-contract.
