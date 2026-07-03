---
type: task
schema_version: '5'
id: T-DAEM
status: closed/done
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
last_reviewed: '2026-07-02'
prs:
- https://github.com/sksizer/markdown-contract/pull/173
completion_note: 'Shipped via #173.'
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
| `packages/core/src/cli/run.ts#runCli` | Pure CLI core; dispatches `init` / `validate` by positional (`packages/core/src/cli/run.ts:124`); an unknown command exits `2`. No `daemon` verb, no server. |
| `packages/core/src/runner/corpus.ts#runCorpus` | `runCorpus(config, opts) → { findings, stats, exitCode }` — the library API a JSON handler calls. |
| `packages/core/src/declarative/infer.ts#inferConfig` | `inferConfig(root, opts) → InferResult` — the `init`/drift API. |
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
   write-streams-and-exit wrapper as `packages/core/src/cli/index.ts`. This file (not `packages/core`'s
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
| `apps/web/src/daemon/routes.ts` | new | Route handlers over `runCorpus` / `inferConfig` (`/api/validate`, `/api/health`). |
| `apps/web/src/daemon/server.test.ts` | new | Peer test: boot on ephemeral port, validate a fixture vault, assert JSON. |
| `apps/web/package.json` | modify | Add the `bin`, the `daemon` script, and the `packages/core` workspace dependency. |
| `apps/web/` | new | New `moon.yml` manifest declaring the daemon's `dev` / `typecheck` / `test` tasks (compile/build:web land in [[T-BMTX-bun-compile-matrix]]). |

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

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-02. PR: pending._

### Acceptance criteria coverage

- AC-1: auto + agent-manual — peer test asserts `Bun.serve({host:"0.0.0.0"})` throws; `lsof` confirmed the live daemon bound `127.0.0.1` (IPv4 LISTEN only) and `daemon --host 0.0.0.0` was refused (exit 1, nothing bound).
- AC-2: auto + agent-manual — peer test pins the exact `{ findings, stats, exitCode }` JSON; `jq -S` diff confirmed `/api/validate .findings` is byte-identical to `markdown-contract validate --format json` over the same vault (config resolution in `routes.ts` mirrors `cli/run.ts`).
- AC-3: agent-manual — `bun apps/web/src/bin.ts …` vs the core dist bin produced identical stdout+exit for `validate --format json`, `init <dir> --dry-run`, `--help`, an unknown verb, and no-args.
- AC-4: auto — `apps/web/src/daemon/server.test.ts` boots on an ephemeral port under `bun test` and asserts the `/api/validate` JSON for `./fixtures/vault/` (5 pass / 0 fail).
- AC-5: auto — grep confirmed no `packages/core/src` file references `apps/web`; `apps/web/src` imports core only via `markdown-contract`, `markdown-contract/cli`, `markdown-contract/declarative`.

### What worked

- The `runCorpus` / `runCli` library seams made the "one binary, two faces" split clean: the daemon is a thin JSON shell over `runCorpus`, and delegation is a one-line `runCli` call plus the same write-streams-and-exit wrapper as the npm bin — no logic duplicated.
- `bun test` on an ephemeral port (`port: 0`) gave a fast, hermetic peer test that exercises the real `Bun.serve` server end-to-end, and `jq -S` diffing the endpoint against the CLI made the AC-2 parity check objective rather than eyeballed.
- The deterministic `task gap-report` pinpointed every stale citation by exact line and even named the relocated target, so the pre-gate citation correction was mechanical.

### Friction and automation gaps

- The `paths` claim resolver (and `gap-report`) false-positived on two genuinely-new files whose basename collides with exactly one existing file — `apps/web/moon.yml` (vs `packages/core/moon.yml`) and the originally-proposed `apps/web/src/daemon/api.ts` (vs `prototype/web-ui/types/api.ts`) — because it has no `kind: new` awareness and never cross-references the Files-to-touch `new` column. This is structural for config filenames: every new moon project's `moon.yml` will ALWAYS collide. It forced a citation reshape (moon row scoped to the `apps/web/` directory) and a rename (`api.ts` → `routes.ts`) purely to green the gate — `gap-report`/the `paths` resolver should suppress a same-basename "moved" finding when the cited path is declared `kind: new` in `## Files to touch`. → [[T-O66A-gap-report-honors-kind-new]]
- Step 7's documented `quality run --diff-against-baseline` invocation omits `--baseline-dir`, so from the worktree it defaulted to the worktree's gitignored `.sdlc/quality-baselines/` and failed with "baseline not found" — the Step 3a baseline was captured in the MAIN repo's `.sdlc/`. Had to pass `--baseline-dir <main-repo>/.sdlc/quality-baselines` explicitly — task-work Step 7 should thread the main-repo baseline dir (or `quality run` should resolve the baseline from the superproject when run in a worktree). → [[T-X9PO-task-work-step7-threads-baseline-dir]]
- The task cited pre-`T-WKSP` paths (`src/…`) that the workspace split had relocated to `packages/core/src/…`; the gate flagged them and named the exact relocated target, but the fix was a manual pre-gate correction landed on `origin/main`. Since the resolver already resolves the unique same-basename relocation, an opt-in auto-apply (in `task-define`/`gap-report`) could land these one-match moves without a hand edit. → [[T-L7XL-gap-report-auto-applies-relocations]]
- The project's `quality_checks:` cover only `core:*`, so `apps/web`'s `typecheck`/`test` were not gated — the implementer ran `bun test` + `web:typecheck` by hand. Now that `apps/web` carries real code, `sdlc.yaml` should add `web:typecheck` / `web:test` to the gate. → [[T-ASSW-gate-apps-web-typecheck-test]]

### Spawned follow-up tasks

- [[T-O66A-gap-report-honors-kind-new]] (https://github.com/sksizer/dev/pull/597) — spawned (Upstream-plugin, sdlc-meta): teach the `paths`/`gap-report` resolver `kind: new` awareness so genuinely-new same-basename files aren't reported as relocations.
- [[T-X9PO-task-work-step7-threads-baseline-dir]] (https://github.com/sksizer/dev/pull/598) — spawned (Upstream-plugin, sdlc-meta): thread the main-repo (superproject) quality-baseline dir through task-work Step 7 so the worktree gate finds the captured baseline.
- [[T-L7XL-gap-report-auto-applies-relocations]] (https://github.com/sksizer/dev/pull/599) — spawned (Upstream-plugin, sdlc-meta): opt-in auto-apply for unique same-basename path relocations the resolver already pinpoints.
- [[T-ASSW-gate-apps-web-typecheck-test]] (https://github.com/sksizer/markdown-contract/pull/171) — spawned (Local): add `web:typecheck` / `web:test` to `sdlc.yaml` `quality_checks:` now that `apps/web` carries real code.
