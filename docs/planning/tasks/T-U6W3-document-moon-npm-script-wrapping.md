---
type: task
schema_version: '5'
id: T-U6W3
status: planning/draft
created: '2026-06-28'
related:
- T-MOON-adopt-moon-monorepo
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Document that moon tasks must wrap npm scripts under moon's runtime-only node toolchain

## Goal

Capture the moon-task authoring convention surfaced while adopting moon in
[[T-MOON-adopt-moon-monorepo]] (in https://github.com/sksizer/markdown-contract):
moon v2's runtime-only node toolchain does not expose `node_modules/.bin` on
PATH, so moon tasks must wrap npm scripts rather than invoke bin-resolved tools
directly. Writing it down keeps future moon task definitions from silently
failing with command-not-found.

> moon v2's runtime-only node toolchain does not add node_modules/.bin to PATH,
> so moon tasks must wrap npm scripts (e.g. npm run build) rather than invoke
> tsc/vitest directly, or they fail with command-not-found. Document this
> wrap-npm-scripts convention in the project's moon/Develop docs so future moon
> task definitions follow it.
>
> — originating note from [[T-MOON-adopt-moon-monorepo]]

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

Spawned by /sdlc:spawn-task-pr on 2026-06-28 UTC from [[T-MOON-adopt-moon-monorepo]] in https://github.com/sksizer/markdown-contract.
