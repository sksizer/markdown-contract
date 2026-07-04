---
type: task
schema_version: '5'
id: T-32OG
status: planning/draft
created: '2026-07-04'
related:
- T-W1CX-knip-baseline-dead-code-cleanup
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Add a per-workspace knip scope gate so a task can assert one workspace is clean

## Goal

knip's exit code is repo-coarse: it cannot scope-fail to a single workspace, so
a task cleaning up one workspace (e.g. `packages/core`) cannot mechanically
assert "my workspace is clean" — it has to eyeball the finding list and filter
out unrelated workspaces by hand. This task adds a per-workspace knip scope gate
so a scoped cleanup task can turn "this workspace is clean" into a green exit
instead of a manual read.

> From [[T-W1CX-knip-baseline-dead-code-cleanup]] (markdown-contract):
> knip's exit code is repo-coarse — it can't scope-fail to a single workspace,
> so confirming `packages/core` is clean during a scoped cleanup is a manual
> read of the finding list rather than a green exit (surfaced by [[T-W1CX]]).
> Add a `--workspace packages/core` gate or a `knip --reporter` filter so a
> single-workspace cleanup task can assert its scope mechanically instead of
> eyeballing.

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
