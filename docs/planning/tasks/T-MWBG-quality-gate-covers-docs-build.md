---
type: task
schema_version: '5'
id: T-MWBG
status: planning/draft
created: '2026-07-02'
related:
- T-SHEL-docs-landing-and-ia
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Cover `docs:build` in the project's quality-check gate

## Goal

This repo's `quality_checks:` gate in `sdlc.yaml` covers only `core:` verbs, so
doc-site checks fall outside it. Spawned from [[T-SHEL-docs-landing-and-ia]] in
https://github.com/sksizer/markdown-contract, where `docs:build` — the
load-bearing check for doc-site tasks — had to be run by hand because the gate
never invoked it. Close that gap so doc-site tasks are covered by the same
quality gate as everything else.

> The project's `quality_checks:` in `sdlc.yaml` cover only `core:` verbs, so
> `docs:build` — the load-bearing check for doc-site tasks like T-SHEL — sat
> outside the quality gate and had to be run manually. Add a `docs:build` verb
> (or a docs-scoped quality profile) to `quality_checks:` so the gate covers
> doc-site tasks.
>
> — [[T-SHEL-docs-landing-and-ia]]

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

Spawned by /sdlc:spawn-task-pr on 2026-07-02 UTC from [[T-SHEL-docs-landing-and-ia]] in https://github.com/sksizer/markdown-contract.
