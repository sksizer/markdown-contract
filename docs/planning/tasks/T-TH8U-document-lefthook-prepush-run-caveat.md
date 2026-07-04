---
type: task
schema_version: '5'
id: T-TH8U
status: planning/draft
created: '2026-07-04'
related:
- T-QX1Q-gate-covers-declaration-emit
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Note the lefthook pre-push manual-run caveat (needs --all-files without unpushed commits)

## Goal

This repo's lefthook pre-push gate needs a documented caveat about manual dry-runs,
originating from [[T-QX1Q-gate-covers-declaration-emit]] in
`git@github.com:sksizer/markdown-contract.git`. When someone tries to demonstrate a
pre-push gate failure by hand, `bunx lefthook run pre-push` silently skips its gates on
a branch that has no upstream / no unpushed commits, which is easy to misread as a
passing gate. Recording the caveat in the hook comment and/or the git-hooks docs keeps a
future manual run from drawing the wrong conclusion.

> _From [[T-QX1Q-gate-covers-declaration-emit]]:_
>
> `bunx lefthook run pre-push` skips its gates with 'no matching push files' on a branch
> that has no upstream / no unpushed commits, so demonstrating a pre-push gate failure
> manually requires `--all-files` (or a real `git push`). The gate fires correctly on an
> actual push; only the manual dry-run is affected. Note this manual-run caveat in the
> hook's comment in lefthook.yml and/or the README git-hooks docs so a future run does
> not misread a skipped manual invocation as a passing gate.

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
[[T-QX1Q-gate-covers-declaration-emit]] in `git@github.com:sksizer/markdown-contract.git`.
