---
type: task
schema_version: '5'
id: T-WEBU
status: planning/needs-definition
created: '2026-06-30'
related:
- '[[M-0008-single-exec-distribution]]'
- '[[D-0012-distribution-single-exec-and-web-ui]]'
- '[[C-0010-single-binary-and-vault-dashboard]]'
- '[[M-0009-local-web-ui-vault-dashboard]]'
- '[[T-DAEM-daemon-and-json-api]]'
depends_on:
- '[[T-WKSP-bun-workspace-split]]'
tags:
- distribution
- web-ui
- nuxt
- spa
- prototype
need_human_review: true
impact: high
complexity: medium
autonomy: supervised
definition_gap: The spec has stale/ambiguous path citations that fail the readiness
  gate. The `## Today` table lists `apps/web/src/daemon/api.ts` as an existing file,
  but it does not exist yet (it is built by the not-yet-done [[T-DAEM-daemon-and-json-api]]);
  reword that row so it does not assert a present-day file. Six cited component/config
  paths (`apps/web/nuxt.config.ts`, `apps/web/app/app.vue`, `apps/web/app/pages/index.vue`,
  `apps/web/app/components/FindingsList.vue`, `app/pages/index.vue`, and the daemon
  `api.ts`) each collide by basename with an existing file under `apps/daemon-web-prototype/`,
  so the readiness gate reads them as relocated citations; the spec must reconcile
  the relationship to that existing prototype (reuse/adapt vs. build fresh) and disambiguate
  the new-file paths. Finally, AC-3's universal quantifier 'lists each finding's id,
  level, path, and message' is unpinned — name the set it ranges over (e.g. 'each
  finding in the returned findings[] array'). Fixing these citation and quantifier
  gaps needs human or /sdlc:task-define attention before pickup.
---
# Minimal Nuxt SPA (`ssr: false`) — the embedded validate-and-findings UI

## Goal

Build the **smallest real web UI** for the prototype: a Nuxt SPA (`ssr: false`, the stack
[[D-0012-distribution-single-exec-and-web-ui]] §D3 fixed) that lets a user point at a vault
path, calls `POST /api/validate` on the daemon ([[T-DAEM-daemon-and-json-api]]), and renders
the returned findings. It is the client half of the [[M-0008-single-exec-distribution]]
feasibility slice and the seed of the [[M-0009-local-web-ui-vault-dashboard]] dashboard — so
it is built in the real stack, not a throwaway.

## Today

| Location | Role today |
|---|---|
| `apps/web/` | Placeholder workspace member from [[T-WKSP-bun-workspace-split]]; no Nuxt app, no client. |
| `apps/web/src/daemon/api.ts` | The JSON API this SPA calls (`/api/validate`, `/api/health`) — built in [[T-DAEM-daemon-and-json-api]]. |

## Proposed

A Nuxt app under `apps/web` configured `ssr: false`, building to a **static client**
(`apps/web/.output/public` or the Nuxt SPA dist) — exactly the artifact
[[T-SPAE-spa-embed]] embeds into the binary. One route: a form for a vault path + a findings
view (id, level, path, message). No SSR, no server routes in the Nuxt app itself (the API is
the `Bun.serve` daemon).

## Approach

1. **Scaffold Nuxt** in `apps/web` with `nuxt.config.ts` → `ssr: false`; pin Nuxt + Vue
   versions in `apps/web/package.json`; add a `build:web` script that emits the static SPA.
2. **One page** (`app/pages/index.vue` or `app.vue`): an input for the vault path + a
   "Validate" button; on submit `fetch('/api/validate', { … })` and render
   `findings` grouped by level, plus the `stats` summary. Keep components minimal and
   well-factored; no design-system dependency for the prototype.
3. **Dev wiring.** Point dev fetches at the daemon's port (proxy or absolute URL) so the SPA
   can be developed against a running [[T-DAEM-daemon-and-json-api]] before the embed exists.
4. **Build output contract.** Ensure `build:web` produces a self-contained static directory
   with a single HTML entry — the shape [[T-SPAE-spa-embed]] depends on for Bun's HTML import.
5. **Smoke test.** A minimal component/route test (or a Playwright-free fetch-mock test) that
   the findings view renders a sample API payload; full UI testing is M-0009.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `apps/web/nuxt.config.ts` | new | Nuxt config: `ssr: false`, static SPA output. |
| `apps/web/app/app.vue` | new | Root component: the vault-path form. |
| `apps/web/app/pages/index.vue` | new | Validate form + findings/stats view calling `/api/validate`. |
| `apps/web/app/components/FindingsList.vue` | new | Renders findings grouped by level. |
| `apps/web/app/components/FindingsList.test.ts` | new | Peer test: renders a sample findings payload. |
| `apps/web/package.json` | modify | Add Nuxt/Vue deps and the `build:web` script (file created by [[T-DAEM-daemon-and-json-api]]). |

## Acceptance criteria

- [ ] AC-1: `apps/web` builds a static SPA (`ssr: false`) with a single HTML entry via `build:web` — no server-side rendering output.
- [ ] AC-2: Loaded against a running daemon, the page submits a vault path, calls `POST /api/validate`, and renders the returned findings and run-summary stats.
- [ ] AC-3: A clean vault shows a clear "no error findings" state; a vault with errors lists each finding's id, level, path, and message.
- [ ] AC-4: The build output is a self-contained static directory consumable by [[T-SPAE-spa-embed]] (single HTML import entry, relative asset paths).

## Out of scope

- Embedding the built SPA into the binary — [[T-SPAE-spa-embed]].
- The daemon / JSON API implementation — [[T-DAEM-daemon-and-json-api]].
- Multi-vault dashboard, live status, drift timelines, polish/design system — [[M-0009-local-web-ui-vault-dashboard]].

## Dependencies

- Depends on [[T-WKSP-bun-workspace-split]] (the `apps/web` slot). Calls the API from [[T-DAEM-daemon-and-json-api]]; its output feeds [[T-SPAE-spa-embed]]. Stack fixed by [[D-0012-distribution-single-exec-and-web-ui]] §D3.
