---
type: task
schema_version: '5'
id: T-ZLND
status: in-progress
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
last_reviewed: '2026-06-30'
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

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — `npm run generate` (Nuxt `ssr:false`) produced `.output/public/` SPA mounting at `#__nuxt`; `vue-tsc` typecheck clean; `git grep` confirms no import of `src/` (engine output shape is mirrored as local `mocks/types.ts`, never imported); absent from `moon.yml` and root `package.json` workspaces. The interactive `npm run dev` live feel is inherently a deferred-user spot-check.
- AC-2: auto — `npm run build-storybook` static `index.json` lists 4 components / 11 stories, each component carrying ≥2 named variants (FindingsList 3, VaultStatusCard 3, RunSummary 2, VaultDashboard 4), all rendered off `mocks/` fixtures via a preview decorator. Live Storybook UX is deferred-user.
- AC-3: auto — `CONVENTIONS.md` documents the ≥2-named-variant rule, the state-naming convention, and a per-component checklist; a README summary table mirrors it; every shipped component already conforms.
- AC-4: auto — README "Boundary" section explicitly states mock-data-only, imports-nothing-from-`src/`, not-the-single-binary, decoupled from [[M-0008-single-exec-distribution]] / [[T-SPAE-spa-embed-spike]], deferred behind the [[T-UTKU-web-ui-prototype-review]] gate.

### What worked

- The root quality gate stayed green with zero root-config edits. Because the prototype lives entirely under `prototype/web-ui/` — outside the root `tsconfig.json` `include: ["src","tests"]` and outside the root `vitest.config.ts` globs — `npm run test` (566 tests) and `npm run typecheck` pass unchanged, and the prototype carries its own self-contained `tsconfig.json`/`node_modules`. The decoupling the task asked for is exactly what kept the existing checks isolated.
- The baseline-gated quality run (`--diff-against-baseline`) cleanly separated origin/main's pre-existing `tests/yaml-parity.test.ts` typecheck drift from this branch's (zero) new drift, so the gate verdict was unambiguous (`OK 2/2`, no `new-drift:`).

### Friction and automation gaps

- Storybook-for-Nuxt framework + version compatibility was unspecified — the spec said "Storybook (Nuxt/Vue 3 integration)" but `@storybook-vue/nuxt` is fragile for non-interactive (CI/build) verification, so the implementer fell back to `@storybook/vue3-vite` 8.6, which under the resolved Vite 7 additionally needed a manual `@vitejs/plugin-vue` injection in `viteFinal`, a `nuxt prepare` pre-script, and a scoped `.npmrc` `legacy-peer-deps=true`. A web-UI scaffold task template (for the M-0009 surface tasks that build on this) should pin the Storybook framework + a Vite/plugin-vue compatibility note so each surface task doesn't rediscover the same toolchain wiring. → [[T-HZYM-web-ui-scaffold-storybook-toolchain]]
- Step 5a/5b `--commit-on main` landed the verify/start lifecycle commits on the task branch rather than advancing local `refs/heads/main` — local `main` was ahead of `origin/main` with parallel sessions' start-commits, and the verify/start commits ended up only reachable from `task/T-ZLND-web-ui-prototype-app` (confirmed via `git reflog main` and `merge-base --is-ancestor`). During the in-flight window `main` still reported the task `open/ready` while the lease was `working` — the exact limbo the `--commit-on main` design targets. Step 9's contamination rebase folds the commits into the PR so the eventual merge is correct, but it is worth confirming whether the commit-worktree path reliably advances `refs/heads/main` when local main is ahead of origin with concurrent parallel sessions. → [[T-OLKM-commit-on-main-advances-local-main]]

### Spawned follow-up tasks

- [[T-HZYM-web-ui-scaffold-storybook-toolchain]] (https://github.com/sksizer/markdown-contract/pull/104) — spawned: web-UI scaffold task template that pins the Storybook-for-Nuxt framework + a Vite/plugin-vue compatibility note for the M-0009 surface tasks (Local).
- [[T-OLKM-commit-on-main-advances-local-main]] (https://github.com/sksizer/dev/pull/526) — spawned: confirm task-work `--commit-on main` reliably advances local `refs/heads/main` when main is ahead of origin under concurrent parallel sessions (Upstream-plugin, `sdlc-meta`).
