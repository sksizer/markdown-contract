---
type: task
schema_version: '5'
id: T-1AEK
status: planning/draft
created: '2026-06-30'
related:
- T-4CUI-web-ui-vault-detail-findings
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Storybook stories glob covers pages/** in the web-ui prototype scaffold

## Goal

The `apps/daemon-web-prototype` Storybook `stories` glob covers only `components/**`, so a
page-level story under `pages/` requires editing the shared
`apps/daemon-web-prototype/.storybook/main.ts` — a shared-file touch that screen-level
tasks don't anticipate in their "Files to touch". The fix is to glob `pages/**`
up front in the prototype scaffold (or to note the required glob edit in
screen-task specs) so page-level stories load without a shared-file change.
Surfaced by the post-mortem of [[T-4CUI-web-ui-vault-detail-findings]].

> From [[T-4CUI-web-ui-vault-detail-findings]]:
>
> Storybook's `stories` glob covered only `components/**`, so a page-level story
> under `pages/` required editing the shared `.storybook/main.ts` — a shared-file
> touch the task's "Files to touch" didn't anticipate. Worth either globbing
> `pages/**` up front in the prototype scaffold or noting the glob edit in
> screen-task specs.

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

Spawned by /sdlc:spawn-task-pr on 2026-06-30 UTC from
[[T-4CUI-web-ui-vault-detail-findings]] in
https://github.com/sksizer/markdown-contract.
