---
type: task
schema_version: '5'
id: T-ENNF
status: planning/draft
created: '2026-06-30'
related:
- T-D7X1-web-ui-mock-api-shapes
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Gate apps/daemon-web-prototype with a typecheck quality verb wired into sdlc.yaml

## Goal

This repo's formal quality gate (`npm run test` / `npm run typecheck`) does not
cover `apps/daemon-web-prototype/`, so the prototype's TypeScript ships ungated. Closing
that gap — surfaced by [[T-D7X1-web-ui-mock-api-shapes]] in
`git@github.com:sksizer/markdown-contract.git` — means adding a prototype-scoped
typecheck verb wired into `sdlc.yaml` so the gate typechecks the prototype
automatically rather than relying on an ad-hoc isolated tsconfig.

> Root quality (npm run test / npm run typecheck) does not cover apps/daemon-web-prototype/ — the root tsconfig.json includes only src/tests, so the prototype's TS is ungated by the formal quality gate; verification needed an ad-hoc isolated tsconfig. Add a prototype-scoped quality verb (a vue-tsc / nuxt prepare moon task) wired into sdlc.yaml so the prototype is typechecked automatically by the gate next time.
>
> — [[T-D7X1-web-ui-mock-api-shapes]]

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

Spawned by /sdlc:spawn-task-pr on 2026-06-30 UTC from [[T-D7X1-web-ui-mock-api-shapes]] in git@github.com:sksizer/markdown-contract.git.
