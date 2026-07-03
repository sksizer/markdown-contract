---
type: task
schema_version: '5'
id: T-ASSW
status: planning/draft
created: '2026-07-02'
related:
- T-DAEM-daemon-and-json-api
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Add web:typecheck / web:test to sdlc.yaml quality_checks so apps/web is gated

## Goal

The project's `quality_checks:` in `sdlc.yaml` cover only `core:*`, so
`apps/web`'s `typecheck` / `test` verbs are not part of the task-work quality
gate; when `[[T-DAEM-daemon-and-json-api]]` landed real `apps/web` code the
implementer had to run `bun test` + `web:typecheck` by hand. This task adds
`web:typecheck` / `web:test` to the `quality_checks:` list so the gate covers
`apps/web` now that it carries real code.

> The project's `quality_checks:` cover only `core:*`, so `apps/web`'s
> `typecheck`/`test` were not gated — the implementer ran `bun test` +
> `web:typecheck` by hand. Now that `apps/web` carries real code, `sdlc.yaml`
> should add `web:typecheck` / `web:test` to the gate.
> — from `[[T-DAEM-daemon-and-json-api]]`

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

Spawned by /sdlc:spawn-task-pr on 2026-07-02 UTC from [[T-DAEM-daemon-and-json-api]] in git@github.com:sksizer/markdown-contract.git.
