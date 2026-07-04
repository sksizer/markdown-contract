---
type: task
schema_version: '5'
id: T-UFUX
status: planning/draft
created: '2026-07-04'
related:
- T-UDPO-extract-single-binary-example
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Clean up packages/core's 324 pre-existing biome warnings (or cap lint diagnostics output)

## Goal

`packages/core` carries 324 pre-existing biome warnings. Their colored output
(~1.04 MiB from `bunx moon run core:lint`) breaches the 1 MiB output-capture
buffer in downstream tooling (`sdlc quality run`'s `spawnSync` capture),
flapping the lint verb between PASS and FAIL right at the boundary. Clean the
warnings up, or cap emission (e.g. biome's `--max-diagnostics`), so lint
output stays well under capture limits and the quality gate stops flapping
from the repo side.

> `packages/core` carries 324 pre-existing biome warnings whose colored
> output is what breaches that buffer — a warning cleanup or a
> `--max-diagnostics` cap would defuse the flap from the repo side.
>
> — [[T-UDPO-extract-single-binary-example]] post-mortem

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

Spawned by /sdlc:spawn-task-pr on 2026-07-03 UTC from
[[T-UDPO-extract-single-binary-example]] in
<https://github.com/sksizer/markdown-contract>.
