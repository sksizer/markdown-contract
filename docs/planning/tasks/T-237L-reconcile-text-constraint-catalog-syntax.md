---
type: task
schema_version: '5'
id: T-237L
status: planning/draft
created: '2026-06-30'
related:
- T-CDYL-catalog-declarative-yaml
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Reconcile the planned DECLARATIVE-YAML-14..20 text-constraint sketches against the shipped text.ts engine

## Goal

The text-constraint loader is already implemented in this repo, yet the
`DECLARATIVE-YAML-14..20` catalog examples are still framed as `status: planned`
with sketched syntax that diverges from the shipped engine. This task reconciles
those sketches against the real text-constraint surface and decides which planned
entries can be promoted to shipped/verified.

> The text-constraint loader (`src/declarative/text.ts` + fixtures 22..25) is in
> fact already implemented, but `DECLARATIVE-YAML-14..20` in `example-catalog.md` /
> `docs/catalog/declarative-yaml.yaml` are framed as PLANNED with sketched syntax
> that diverges from the shipped engine (e.g. entry 18's `requires: [{max: 0}]`
> 'forbids dual' is explicitly rejected by `text.ts`, which routes absence to
> `forbids`). Reconcile the sketched syntax against the shipped text-constraint
> surface and decide which planned entries can be promoted to shipped/verified.
>
> — [[T-CDYL-catalog-declarative-yaml]] in https://github.com/sksizer/markdown-contract

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

Spawned by /sdlc:spawn-task-pr on 2026-06-30 UTC from [[T-CDYL-catalog-declarative-yaml]] in https://github.com/sksizer/markdown-contract.
