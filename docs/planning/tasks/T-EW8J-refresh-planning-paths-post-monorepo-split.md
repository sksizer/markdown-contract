---
type: task
schema_version: '5'
id: T-EW8J
status: planning/draft
created: '2026-07-02'
related:
- T-SCFX-structured-cells-fixture-scaffold
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Refresh stale packages/core paths across the docs/planning task corpus in one pass

## Goal

The `packages/core/` monorepo relocation left pre-existing task files under
`docs/planning/` citing stale `src/…` and `tests/…` paths plus the old
`npm run typecheck` command. Today each task only gets corrected ad hoc at
pickup via the relevance check, which costs extra commit/push rounds against a
moving `origin/main`. This task closes that gap with a single repo-wide sweep
that refreshes the whole corpus at once. Spawned as a Local follow-up from
[[T-SCFX-structured-cells-fixture-scaffold]] in
https://github.com/sksizer/markdown-contract.

> The packages/core/ monorepo relocation (T-WKSP) left pre-existing task files
> under docs/planning/ citing old `src/…` and `tests/…` paths plus the old
> `npm run typecheck` command; each task only gets corrected ad hoc at pickup
> via the relevance check, costing extra commit/push rounds against a moving
> origin/main. Do a one-shot repo-wide sweep of docs/planning/ that rewrites
> relocated paths (and the moved typecheck/quality commands) to their
> packages/core/ + moon equivalents, refreshing the whole corpus at once
> instead of per-task at pickup.
>
> — [[T-SCFX-structured-cells-fixture-scaffold]]

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

Spawned by /sdlc:spawn-task-pr on 2026-07-02 UTC from
[[T-SCFX-structured-cells-fixture-scaffold]] in
https://github.com/sksizer/markdown-contract.
