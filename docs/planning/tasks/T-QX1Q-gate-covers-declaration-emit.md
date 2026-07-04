---
type: task
schema_version: '5'
id: T-QX1Q
status: planning/draft
created: '2026-07-04'
related:
- T-W1CX-knip-baseline-dead-code-cleanup
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Make the quality gate catch .d.ts declaration-emit regressions that tsc --noEmit misses

## Goal

The quality gate's typecheck verb runs `tsc --noEmit`, so it validates types
but never exercises `.d.ts` declaration emit. That leaves a blind spot: a change
can keep `tsc --noEmit` green while breaking the declaration build that ships in
the published package. This task closes that gap by adding a declaration-emit /
full-build check to the quality gate so this class of regression fails
mechanically rather than depending on the implementer remembering to run a real
build.

> From [[T-W1CX-knip-baseline-dead-code-cleanup]] (markdown-contract):
> De-exporting a type still referenced in an exported function's signature can
> break `.d.ts` declaration emit while `tsc --noEmit` typecheck stays green, so
> the gate's typecheck verb alone misses it (surfaced by [[T-W1CX]]'s knip
> cleanup; both cases were verified only via a manual `core:build`). Add a
> declaration-emit / full-build check to the quality gate so this class of
> regression fails mechanically instead of relying on the implementer
> remembering to run a real build.

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

_TBD — receiver to fill before promoting from planning/draft._

## Dependencies

_TBD — receiver to fill before promoting from planning/draft._

## Discovery context

Spawned by /sdlc:spawn-task-pr on 2026-07-04 UTC from
[[T-W1CX-knip-baseline-dead-code-cleanup]] in
git@github.com:sksizer/markdown-contract.git.
