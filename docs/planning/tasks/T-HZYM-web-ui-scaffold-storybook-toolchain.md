---
type: task
schema_version: '5'
id: T-HZYM
status: planning/draft
created: '2026-06-30'
related:
- T-ZLND-web-ui-prototype-app
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Pin Storybook-for-Nuxt framework + Vite/plugin-vue compat in the M-0009 web-UI scaffold task template

## Goal

A follow-up spawned from [[T-ZLND-web-ui-prototype-app]] in
`git@github.com:sksizer/markdown-contract.git`. The web-UI prototype scaffold
rediscovered Storybook-for-Nuxt toolchain wiring that the M-0009 surface tasks
will each hit again unless the framework pin and a Vite/plugin-vue compatibility
note are captured in a reusable scaffold task template.

> The web-UI prototype scaffold hit unspecified Storybook-for-Nuxt
> framework/version compatibility: @storybook-vue/nuxt proved fragile for
> non-interactive (CI/build) verification, so the build fell back to
> @storybook/vue3-vite 8.6, which under the resolved Vite 7 additionally needed
> a manual @vitejs/plugin-vue injection in viteFinal, a `nuxt prepare`
> pre-script, and a scoped `.npmrc` legacy-peer-deps=true. Add a web-UI scaffold
> task template for the M-0009 surface tasks that pins the Storybook framework +
> a Vite/plugin-vue compatibility note so each surface task doesn't rediscover
> the same toolchain wiring.
>
> — [[T-ZLND-web-ui-prototype-app]]

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
[[T-ZLND-web-ui-prototype-app]] in `git@github.com:sksizer/markdown-contract.git`.
