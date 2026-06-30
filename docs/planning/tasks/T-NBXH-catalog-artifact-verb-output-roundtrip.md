---
type: task
schema_version: '5'
id: T-NBXH
status: planning/draft
created: '2026-06-30'
related:
- T-CINF-catalog-inference-init
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Add a CI round-trip diffing each catalog artifact block against real verb output

## Goal

The catalog's `artifact` sketches in `docs/example-catalog.md` (and the
finalized `docs/catalog/*.yaml`) can silently drift from what the real verbs
actually emit. The `inference-init` finalization
([[T-CINF-catalog-inference-init]]) found four such drifts that only surfaced
because the YAML-ization manually re-ran `init` against the fixtures. Add a CI
round-trip that runs each catalog `artifact` block's verb and diffs the captured
output against the recorded artifact, so prose and YAML can't silently re-drift
from real behavior after merge.

> From [[T-CINF-catalog-inference-init]]: The prose inference-init sketches in
> example-catalog.md had drifted from real init output in four places; the
> YAML-ization caught and fixed each. Add a CI round-trip that runs each catalog
> artifact block's verb and diffs captured output against the recorded artifact,
> so prose and YAML can't silently re-drift from real behavior after merge.
> Complements T-D5QD (YAML<->markdown text parity), which explicitly leaves
> verb-output validation out of scope.

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

Spawned by /sdlc:spawn-task-pr on 2026-06-30 UTC from
[[T-CINF-catalog-inference-init]] in https://github.com/sksizer/markdown-contract.
