---
type: task
schema_version: '5'
id: T-NMNY
status: planning/draft
created: '2026-07-03'
related:
- T-SCRB-typed-row-read-back
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Make worktree-scoped quality-gate runs bypass moon's stale cache

## Goal

On the first quality-gate run in the T-SCRB worktree, moon served a stale cached
`core:test` result — the main-checkout run with the wrong skip count — so the
gate was scored against cache rather than against the worktree's actual tree
until the cache was invalidated. Configure worktree-scoped gate runs (the
quality-check commands task-work invokes) to force-invalidate or bypass moon's
cache so the gate never passes or fails on a stale cached result carried over
from another checkout. Spawned as a Local follow-up from
[[T-SCRB-typed-row-read-back]] in https://github.com/sksizer/markdown-contract.

> moon served a stale cached `core:test` (main path, wrong skip count) on the first gate run, gating against cache rather than the worktree until cache invalidation — worktree-scoped gate runs should force-invalidate or bypass moon's cache to avoid gating on stale results.
>
> — [[T-SCRB-typed-row-read-back]]

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

Spawned by /sdlc:spawn-task-pr on 2026-07-03 UTC from
[[T-SCRB-typed-row-read-back]] in https://github.com/sksizer/markdown-contract.
