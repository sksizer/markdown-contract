---
type: task
schema_version: '5'
id: T-HPWU
status: planning/draft
created: '2026-07-04'
related:
- T-QX1Q-gate-covers-declaration-emit
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Document the cross-module condition for reproducing .d.ts declaration-emit regressions

## Goal

The quality gate's `core:build` step guards a real `.d.ts` declaration-emit
regression class (TS4023 / TS4058), but the condition that actually reproduces
that class is subtle and currently undocumented: it triggers only through a
*cross-module* inferred reference (the knip unused-export shape), not the naive
same-module "de-export a type used in an exported signature" recipe — a
same-module non-exported type still emits into the `.d.ts`, so the naive recipe
never fails the build. Because that reproduction condition is unwritten, future
task-spec authors and anyone debugging a declaration-emit error will reach for
the same-module recipe, watch it pass, and burn cycles concluding the guard is
inert. This task records the correct cross-module condition next to the
build/typecheck gate docs so the guard's rationale and reproduction are found
where they're needed.

> From [[T-QX1Q-gate-covers-declaration-emit]] (git@github.com:sksizer/markdown-contract.git):
> The declaration-emit regression class (TS4023/TS4058) that the quality gate's `core:build` guards only reproduces via a cross-module inferred reference (the knip unused-export shape) — a same-module non-exported type still emits into the .d.ts, so the naive 'de-export a type used in an exported signature' recipe does NOT reproduce it. Document this cross-module reproduction condition near the build/typecheck gate docs (e.g. a README build note, or a comment by packages/core/tsconfig.build.json) so future task-spec authors and anyone debugging declaration-emit errors cite the correct condition and don't burn cycles on the naive same-module version.

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

- none

## Discovery context

Spawned by /sdlc:spawn-task-pr on 2026-07-04 UTC from [[T-QX1Q-gate-covers-declaration-emit]] in git@github.com:sksizer/markdown-contract.git.
