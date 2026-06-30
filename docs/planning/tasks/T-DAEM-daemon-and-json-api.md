---
type: task
schema_version: '5'
id: T-DAEM
status: open/ready
created: '2026-06-30'
related:
  - '[[M-0008-single-exec-distribution]]'
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
  - '[[C-0010-single-binary-and-vault-dashboard]]'
  - '[[M-0009-local-web-ui-vault-dashboard]]'
depends_on:
  - '[[T-WKSP-bun-workspace-split]]'
tags:
  - distribution
  - daemon
  - web-ui
  - api
  - bun
  - prototype
need_human_review: true
impact: high
complexity: medium
autonomy: supervised
---
# `daemon` mode + a JSON API over the runner — the `apps/web` server face

## Goal

Give the single binary its **second face**: a `markdown-contract daemon` verb that boots a
local, loopback-only HTTP server exposing a thin JSON API over `runCorpus` / `inferConfig`,
so the embedded web UI ([[T-WEBU-nuxt-spa-ui]]) has something real to call. This is the
prototype of [[D-0012-distribution-single-exec-and-web-ui]] §D3 ("one binary, two faces")
and the server half of the [[M-0008-single-exec-distribution]] feasibility slice.

## Today

| Location | Role today |
|---|---|
| `src/cli/run.ts#runCli` | Pure CLI core; dispatches `init` / `validate` by positional (`src/cli/run.ts:114`); an unknown command exits `2`. No `daemon` verb, no server. |
| `src/runner/corpus.ts#runCorpus` | `runCorpus(config, opts) → { findings, stats, exitCode }` — the library API a JSON handler calls. |
| `src/declarative/infer.ts#inferConfig` | `inferConfig(root, opts) → InferResult` — the `init`/drift API. |
| `apps/web/` | A placeholder workspace member scaffolded by [[T-WKSP-bun-workspace-split]] (empty; no server code yet). |

## Proposed

An `apps/web` server module plus a **new combined-binary entry** (`apps/web/src/bin.ts`)
that dispatches `daemon` → the server and every other argv → `packages/core`'s exported
`runCli`. The npm bin (`packages/core` `validate`/`init`, Node-standard) is **unchanged**;
all Bun-only and server code lives only in `apps/web`, preserving the one-way layering
(`apps/web → packages/core`, `daemon → runner/declarative`) and [[D-0012-distribution-single-exec-and-web-ui]] §D1.

## Approach

1. **Combined entry.** Add `apps/web/src/bin.ts`: parse `argv[0]`; if `daemon`, start the
   server; otherwise call `packages/core`'s `runCli(argv)` and apply the same
   write-streams-and-exit wrapper as `src/cli/index.ts`. This file (not `packages/core`'s
   bin) becomes the `bun build --compile` target in [[T-BMTX-bun-compile-matrix]].
2. **Server.** Use **`Bun.serve`** (simplest path with the fewest moving parts to prove the
   loop; Nitro's `bun` preset is the M-0009 productionization noted in
   [[D-0012-distribution-single-exec-and-web-ui]] §D3). Bind `127.0.0.1` only — refuse
   non-loopback binds — with `--port` (default e.g. `4319`) and `--open`.
3. **JSON API (thin over the library).** Implement the prototype subset:
   `POST /api/validate` `{ path, config? }` → run `runCorpus` over that path and return
   `{ findings, stats, exitCode }`; `GET /api/health` → `{ ok: true, version }`. Treat the
   submitted path as untrusted input (resolve, reject traversal). The multi-vault registry,
   `GET /api/vaults`, SSE, and drift are **[[M-0009-local-web-ui-vault-dashboard]]**, not here.
4. **Static assets.** In the prototype the server serves the built SPA from disk
   (`apps/web/.output/public` / the Nuxt SPA dist) so the API can be developed before the
   embed lands; [[T-SPAE-spa-embed]] swaps that to `Bun.embeddedFiles` inside the binary.
5. **Peer test.** Add a server unit test (boot on an ephemeral port, `POST /api/validate`
   against a tiny fixture vault, assert the findings JSON) per the repo's peer-test rule.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `apps/web/src/bin.ts` | new | Combined-binary entry: `daemon` → server, else delegate to `packages/core` `runCli`. |
| `apps/web/src/daemon/server.ts` | new | `Bun.serve` loopback server: static assets + the JSON API; `--port` / `--open`. |
| `apps/web/src/daemon/api.ts` | new | Route handlers over `runCorpus` / `inferConfig` (`/api/validate`, `/api/health`). |
| `apps/web/src/daemon/server.test.ts` | new | Peer test: boot on ephemeral port, validate a fixture vault, assert JSON. |
| `apps/web/package.json` | modify | Add the `bin`, the `daemon` script, and the `packages/core` workspace dependency. |
| `apps/web/moon.yml` | new | `dev` / `typecheck` / `test` tasks for the daemon (compile/build:web land in [[T-BMTX-bun-compile-matrix]]). |

## Acceptance criteria

- [ ] AC-1: Running the combined entry with `daemon` boots a server bound to `127.0.0.1`; a non-loopback bind is refused.
- [ ] AC-2: `POST /api/validate { path }` returns the same `findings` / `exitCode` that `markdown-contract validate <path>` produces for the same tree (parity with the CLI).
- [ ] AC-3: Running the combined entry with `validate <path>` / `init <dir>` behaves identically to the `packages/core` npm bin (delegation parity).
- [ ] AC-4: A peer test boots the server and asserts the `/api/validate` JSON for a fixture vault.
- [ ] AC-5: No `packages/core` source imports anything from `apps/web`; only `apps/web` imports `packages/core` (one-way layering preserved).

## Out of scope

- The SPA itself — [[T-WEBU-nuxt-spa-ui]]; embedding it into the binary — [[T-SPAE-spa-embed]].
- The multi-vault registry, live SSE status, drift, and persisted history — [[M-0009-local-web-ui-vault-dashboard]] / [[D-0012-distribution-single-exec-and-web-ui]] §D4.
- Swapping `Bun.serve` for Nitro's `bun` preset — a noted M-0009 productionization, not the prototype.
- Auth / multi-user / non-loopback binds — out by design (localhost single-user).

## Dependencies

- Depends on [[T-WKSP-bun-workspace-split]] (the `apps/web` slot + `packages/core` as a workspace dependency). Consumes `runCorpus` / `inferConfig`. Governed by [[D-0012-distribution-single-exec-and-web-ui]] §D1/§D3.
