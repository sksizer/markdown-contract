---
type: task
schema_version: '5'
id: T-ZLND
status: open/ready
created: '2026-06-30'
related:
- '[[M-0009-local-web-ui-vault-dashboard]]'
- '[[C-0010-single-binary-and-vault-dashboard]]'
- '[[D-0012-distribution-single-exec-and-web-ui]]'
depends_on: []
tags:
- web-ui
- prototype
- nuxt
- storybook
need_human_review: false
impact: high
complexity: medium
autonomy: supervised
readiness_verified_at: '2026-06-30T12:34:35Z'
---
# Prototype: standalone web-UI app + Storybook harness on mock data

## Goal

Stand up the **standalone prototype app and the Storybook harness** that every
other M-0009 surface task builds inside. It is deliberately a **separate app from
the single-binary / daemon work** ([[M-0008-single-exec-distribution]],
[[T-SPAE-spa-embed-spike]]): no Nitro, no `runner` wiring, mock data only — its
job is to let us hammer out the UI, not ship it. **Storybook is the harness** for
prototyping and comparing multiple variants of components and screens.

## Today

| Location | Role today |
|---|---|
| `src/runner/corpus.ts` | `runCorpus` — the engine call the *real* UI will later route through; the prototype only mirrors its output shape, never imports it |
| `moon.yml` | root moon config; the binary build lives here — the prototype stays out of it |

The `prototype/` tree does not exist yet — this task creates it (see Files to touch).

## Proposed

A self-contained `prototype/web-ui/` Nuxt SPA (`ssr: false`) with **Storybook
integrated as the primary prototyping surface**, a mock-data layer, and a
documented **variant convention** (multiple stories per component/screen for
side-by-side comparison). Runs via a `dev` script (assembled app shell) and a
`storybook` script (the harness). It imports nothing from `src/`, depends on no
Nitro/daemon/binary, and follows component conventions that let the components
graft into the real `apps/web` SPA later (per [[D-0012-distribution-single-exec-and-web-ui]]).

## Approach

1. Scaffold `prototype/web-ui/` as its own package (own `package.json`) — Nuxt
   SPA (`ssr: false`) + Vue 3 — explicitly **not** wired into the binary build.
2. Add Storybook (Nuxt/Vue 3 integration) as the harness: stories glob, and a
   mock-data decorator/provider so stories render off fixtures ([[T-D7X1-web-ui-mock-api-shapes]]).
3. Establish the **variant convention** — how a component/screen ships ≥2 named
   story variants so the review gate ([[T-UTKU-web-ui-prototype-review]]) can compare them.
4. Wire a thin app shell (router + layout) so assembled screens are also viewable
   outside Storybook.
5. Document run commands and the "this is a standalone prototype, not the binary"
   boundary in a short README.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `prototype/web-ui/` | new | standalone Nuxt SPA prototype package — its package.json (prototype deps; `dev` + `storybook` scripts) and a README (run commands + the standalone/decoupled boundary) live at the package root |
| `prototype/web-ui/.storybook/` | new | Storybook config (the harness) |

## Acceptance criteria

- [ ] AC-1: `prototype/web-ui` runs as a standalone SPA dev server with **no import of `src/` engine code** and no Nitro/daemon/binary dependency.
- [ ] AC-2: Storybook launches and renders at least one component story off mock data, with **≥2 named variants** of that component shown as separate stories.
- [ ] AC-3: A documented variant convention exists so later surface tasks add multi-variant stories consistently.
- [ ] AC-4: A README states the prototype is decoupled from [[M-0008-single-exec-distribution]] / [[T-SPAE-spa-embed-spike]] and is mock-data only.

## Out of scope

- Wiring to the real `runner`/daemon, Nitro, a real SSE backend, or single-binary embedding — deferred behind the decide-after gate ([[T-UTKU-web-ui-prototype-review]]); the binary is owned by [[M-0008-single-exec-distribution]] / [[T-SPAE-spa-embed-spike]].
- Registering the prototype as a moon project / production build + perf hardening.

## Dependencies

- none (foundational). Pairs with [[T-D7X1-web-ui-mock-api-shapes]]; all surface tasks build on this.

## Discovery context

- Created in the M-0009 planning session (2026-06-30) per [[D-0012-distribution-single-exec-and-web-ui]]; the prototype-as-separate-app and Storybook-as-harness decisions came from that session.
