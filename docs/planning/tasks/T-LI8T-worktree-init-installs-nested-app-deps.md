---
type: task
schema_version: '5'
id: T-LI8T
status: planning/draft
created: '2026-06-30'
related:
- T-4CUI-web-ui-vault-detail-findings
tags: []
need_human_review: false
impact: medium
complexity: small
---
# worktree_init installs the nested prototype/web-ui app deps

## Goal

This project's `worktree_init: ["npm install"]` recipe installs only the root
project's deps, so a fresh task worktree is missing the nested `prototype/web-ui`
Nuxt app's `node_modules` — web-UI implementers have to `npm install` inside
`prototype/web-ui` by hand before typecheck or Storybook will run. The fix is to
extend the worktree-init recipe (or add a task note for web-UI tasks) so the
nested app's deps are installed when a worktree is bootstrapped. Surfaced by the
post-mortem of [[T-4CUI-web-ui-vault-detail-findings]].

> From [[T-4CUI-web-ui-vault-detail-findings]]:
>
> `worktree_init: ["npm install"]` installs only the root project's deps; the
> nested `prototype/web-ui` Nuxt app's deps were absent, so the implementer had
> to `npm install` inside `prototype/web-ui` before typecheck/Storybook. For
> web-UI tasks the worktree-init recipe (or a task note) should also install the
> nested app's deps.

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
