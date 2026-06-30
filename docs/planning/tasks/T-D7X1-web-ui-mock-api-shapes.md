---
type: task
schema_version: '5'
id: T-D7X1
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
- api
need_human_review: false
impact: high
complexity: small
autonomy: supervised
readiness_verified_at: '2026-06-30T11:57:16Z'
---
# Prototype: mock vault & findings JSON payload shapes (the UI data seam)

## Goal

Define the **mock JSON payload shapes the prototype binds to** — the same shapes
the real daemon's JSON API will later emit ([[D-0012-distribution-single-exec-and-web-ui]]
§D3). Pinning them now lets every surface task render off realistic data, and the
shapes double as the proposed **stable API seam** (also what a future Tauri shell
or native UI would consume). Mock only — no engine import, no server.

## Today

| Location | Role today |
|---|---|
| `src/core/finding.ts` | the canonical Finding model the mock findings mirror (file·line·severity·rule·message) |
| `src/runner/corpus.ts` | `runCorpus` → `{ findings, exitCode }`; mock vault-status mirrors this output |
| `src/declarative/infer.ts` | `inferConfig` / `--check` drift the mock drift payload mirrors |
| `tests/fixtures/` | the real corpus to draw representative mock findings from |

## Proposed

A `prototype/web-ui/mocks/` set of **typed fixtures + TS types** covering: a
vault registry entry, vault status (`green` / `findings` / `drift` / `running` /
`error`), a findings list (per the [[D-0001-finding-model]] shape), a drift result
(`init --check`), and an SSE event envelope — mirroring the D-0012 §D3 route
sketch (`GET /api/vaults`, `GET /api/vaults/:id`, `GET /api/vaults/:id/check`,
`GET /api/events`). A single mock loader serves both Storybook and the app shell.

## Approach

1. Transcribe the API sketch routes from [[D-0012-distribution-single-exec-and-web-ui]] §D3 into TS request/response types.
2. Mirror the Finding shape from `src/core/finding.ts` — **copy the shape, do not import** (keeps the prototype decoupled).
3. Author representative fixtures: several vaults spanning every status state; a findings-heavy vault drawn from `tests/fixtures/`; a drift example; an SSE event sequence.
4. Expose one mock loader consumed by the Storybook decorator ([[T-ZLND-web-ui-prototype-app]]) and the app shell.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `prototype/web-ui/mocks/` | new | typed fixtures + the mock loader |
| `prototype/web-ui/types/api.ts` | new | TS types for vault / status / finding / drift / SSE payloads |

## Acceptance criteria

- [ ] AC-1: TS types exist for vault, vault-status, finding, drift, and SSE-event payloads, matching the [[D-0012-distribution-single-exec-and-web-ui]] §D3 route sketch.
- [ ] AC-2: Fixtures cover every status state (`green` / `findings` / `drift` / `running` / `error`) plus an empty registry.
- [ ] AC-3: Finding fixtures carry file·line·severity·rule·message consistent with `src/core/finding.ts`.
- [ ] AC-4: One mock loader is consumed by both Storybook stories and the app shell.

## Out of scope

- Implementing the real API / daemon / Nitro routes.
- Importing engine code; persistence / SQLite history payloads.

## Dependencies

- none (foundational). Consumed by every surface task; pairs with [[T-ZLND-web-ui-prototype-app]].

## Discovery context

- Created in the M-0009 planning session (2026-06-30); the payload shapes are lifted from the [[D-0012-distribution-single-exec-and-web-ui]] §D3 API sketch.
