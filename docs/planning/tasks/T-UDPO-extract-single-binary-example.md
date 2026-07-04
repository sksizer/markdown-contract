---
type: task
schema_version: '5'
id: T-UDPO
status: closed/done
created: '2026-07-03'
related:
- '[[M-0008-single-exec-distribution]]'
- '[[M-0009-local-web-ui-vault-dashboard]]'
- '[[D-0012-distribution-single-exec-and-web-ui]]'
- '[[C-0010-single-binary-and-vault-dashboard]]'
- '[[T-DAEM-daemon-and-json-api]]'
- '[[T-SPAE-spa-embed]]'
- '[[T-WEBU-nuxt-spa-ui]]'
- '[[T-BMTX-bun-compile-matrix]]'
- '[[T-DEMO-end-to-end-feasibility-demo]]'
- '[[T-UTKU-web-ui-prototype-review]]'
tags:
- distribution
- packaging
- single-binary
- examples
- bun
- prototype
need_human_review: false
impact: high
complexity: medium
autonomy: supervised
last_reviewed: '2026-07-04'
prs:
- https://github.com/sksizer/markdown-contract/pull/205
completion_note: 'Shipped via #205.'
---
# Extract the M-0008 single-binary prototype into examples/single-binary — minimal two-faces example

## Goal

[[M-0008-single-exec-distribution]]'s deliverable is a **pure prototype of the core idea**
— one Bun-compiled binary that is both the CLI and a self-contained web-UI daemon — with
minimal business logic, kept as the **canonical example** the architecture discussion
describes. Today that core slice exists only interleaved with M-0009 business logic inside
`apps/web` (PR #183 shipped registry, SSE, file watching, and a contract editor alongside
it). Extract the minimal slice into a new top-level `examples/` tree at
`examples/single-binary/`, so the M-0008 ↔ M-0009 boundary is legible in the directory
layout itself and the remaining M-0008 tasks ([[T-BMTX-bun-compile-matrix]],
[[T-DEMO-end-to-end-feasibility-demo]], [[T-RELS-release-channels]]) target a stable,
minimal artifact instead of a moving product app.

## Today

| Location | Role today |
|---|---|
| `apps/web/src/bin.ts` | Combined entry and `bun build --compile` target: `daemon` argv boots the full prototype daemon; every other argv goes to core's `runCli` via the side-effect-free `markdown-contract/cli/run` export |
| `apps/web/src/daemon/server.ts` | The landed T-DAEM skeleton: `Bun.serve` boot, loopback-only bind |
| `apps/web/src/daemon/routes.ts` | T-DAEM route table: `/api/health` + stateless `POST /api/validate` over `runCorpus` — exactly the M-0008 API surface |
| `apps/web/src/daemon/static.ts` | Serves the embedded SPA from the generated manifest — no external files at runtime |
| `apps/web/src/daemon/assets.gen.ts` | GENERATED embed manifest (committed as a stub, rewritten at build time) |
| `apps/web/scripts/gen-assets.ts` | Rewrites `assets.gen.ts` from `ui/.output/public` after `nuxt generate` |
| `apps/web/types/api.ts` | The wire contract both faces bind to (adopted from the design prototype via T-D7X1); the example needs only its validate/health subset |
| `apps/web/src/daemon/registry.ts` | M-0009 business logic (multi-vault registry) — stays behind, NOT extracted; likewise `sse.ts`, `watcher.ts`, `runs.ts`, `status.ts`, `config.ts`, `api.ts` |
| `apps/web/ui/components/kit/` | The minimal findings-rendering component set (`FindingRow`, `SeverityBadge`, `StatusBadge`, `Empty/Error/LoadingState`, …) adopted from the design prototype — the subset the example's one page needs |
| `apps/web/ui/components/editor/` | Contract-editor surface (and its `pages/vault/[id]/edit.vue` route) — M-0009 scope, marks how far past "minimal" `apps/web` has grown |
| `apps/daemon-web-prototype/` | Mock-driven Storybook design harness (no engine imports, no daemon); source of the kit components, `design/tokens.ts`, and the "Boundary — read this first" README pattern |
| `package.json` | Root bun workspace globs: `packages/*`, `apps/*`, `sites/*` — no `examples/*` |
| `.moon/workspace.yml` | Explicit moon project map (`core`, `web`, `docs`) — the example must be registered to get moon tasks and CI coverage |
| `docs/planning/milestones/M-0008-single-exec-distribution.md` | Milestone doc still names `apps/web` as the prototype home; scope/task table pre-date this re-scope |

## Proposed

A new top-level `examples/` tree whose first member, `examples/single-binary/`, is the
self-contained canonical demonstration of [[D-0012-distribution-single-exec-and-web-ui]]
§D3 "one binary, two faces":

- **CLI face** — `src/bin.ts` hands argv to `runCli` via `markdown-contract/cli/run`, so
  `validate`/`init` behave byte-identically to the npm bin.
- **Daemon face** — `daemon` verb boots a loopback-only `Bun.serve` exposing exactly
  `/api/health` + stateless `POST /api/validate`, serving a minimal embedded Nuxt SPA
  (`ssr: false`, one page: point at a markdown tree, validate, render findings).
- **Embed pipeline** — `ui:generate → gen:assets → compile`, producing one executable
  with no external files at runtime.
- **Registered** as a bun workspace member (`examples/*` glob) and a moon project, so
  typecheck/test run in CI like any other project.
- **README owns the architecture narrative** (this is the "canonical example" half of the
  goal): the two-faces diagram, the build pipeline, the loopback trust model, why
  `Bun.serve` (not Nitro) for the prototype, the `./cli` entry-guard gotcha and why the
  example must import `markdown-contract/cli/run`, plus a "Boundary — read this first"
  section (patterned on `apps/daemon-web-prototype/README.md`) stating what the example
  deliberately is NOT: no registry, no SSE, no watching, no editor — that is `apps/web`,
  [[M-0009-local-web-ui-vault-dashboard]].

`apps/web` is left untouched and formally becomes the M-0009 app; the M-0008 planning
docs are re-pointed at the example.

## Approach

1. **Scaffold the package.** `examples/single-binary/` with a private
   `@markdown-contract/example-single-binary` package.json; scripts mirror `apps/web`'s
   pipeline (`cli`, `daemon`, `ui:dev`, `ui:generate`, `gen:assets`, `compile`,
   `build:binary`, `test`, `typecheck`); dependencies are only `markdown-contract`
   (`workspace:*`) + `nuxt`/`vue`/`typescript` tooling. Compile outfile:
   `dist/markdown-contract` (the directory namespaces it). Daemon default port **4320**
   (distinct from `apps/web`'s 4319 so both can run side by side); flags `--port`/`--open`
   only, loopback-only, foreground-only.
2. **Wire the workspace.** Add `"examples/*"` to the root `package.json` workspaces; add
   `example-single-binary: 'examples/single-binary'` to `.moon/workspace.yml`; author
   `examples/single-binary/moon.yml` modeled on `apps/web/moon.yml` (`typecheck`/`test`
   with `deps: ['core:build']`, `bun` toolchain, plus a `build` task running
   `build:binary`). CI needs no workflow edit — `moon run` targets discover the new
   project through the workspace map; confirm the tasks appear in the CI run.
3. **Server face.** Copy-then-trim the T-DAEM skeleton: `server.ts`, `routes.ts` cut to
   `/api/health` + stateless `POST /api/validate` (over `runCorpus`, in-process),
   `static.ts` + committed `assets.gen.ts` stub + `scripts/gen-assets.ts`; a local
   `types/api.ts` holding only the validate/health wire shapes (documented as adopted
   from the T-D7X1 contract). Peer `*.test.ts` files come along (`bun test src`), per
   the repo's peer-test convention.
4. **Entry.** `src/bin.ts`: `daemon` → boot the server; anything else → `runCli` via
   `markdown-contract/cli/run`. Never import `markdown-contract/cli`: under
   `bun build --compile` every bundled module's `import.meta.url` is the executable
   path, so the bin wrapper's entry-guard false-positives and exits — this is the
   PR #183 landmine the README must record.
5. **UI face.** Minimal Nuxt SPA under `ui/` (`ssr: false`): one page that takes a
   vault path, calls `POST /api/validate`, and renders findings using the kit subset
   adopted from `apps/web/ui/components/kit/` (`FindingRow`, `FindingsList` or a local
   equivalent, `SeverityBadge`, `RunSummary`, `Empty/Error/LoadingState`) plus the
   design tokens. No registry, no SSE, no editor, no additional pages.
6. **README + architecture discussion.** Write the canonical narrative described under
   Proposed; cross-link [[D-0012-distribution-single-exec-and-web-ui]],
   [[M-0008-single-exec-distribution]], [[M-0009-local-web-ui-vault-dashboard]].
7. **Verify both faces end-to-end.** `bun run build:binary`; copy the binary to an empty
   scratch directory; (a) `./markdown-contract validate <fixture-tree>` diffed
   byte-identical (stdout + exit code) against `packages/core`'s npm bin on a passing
   and a failing corpus; (b) `./markdown-contract daemon` from that same directory —
   SPA loads on `127.0.0.1:4320`, validates a vault, renders findings, proving the
   no-external-files embed.
8. **Re-point the planning docs.** M-0008 milestone doc: prototype home is
   `examples/single-binary/`, `apps/web` is the M-0009 seed, task table/status refresh.
   Retarget path citations in [[T-BMTX-bun-compile-matrix]],
   [[T-DEMO-end-to-end-feasibility-demo]], [[T-RELS-release-channels]] at the example.
   Close out [[T-WEBU-nuxt-spa-ui]] and [[T-SPAE-spa-embed]] (delivered via PR #183;
   the example carries the canonical minimal surface). Resolve
   [[T-UTKU-web-ui-prototype-review]] — the adoption it gated happened in #183; record
   the outcome.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `examples/single-binary/` | new | The example package: `src/bin.ts`, `src/daemon/` (server/routes/static/assets stub + peer tests), `scripts/gen-assets.ts`, `types/api.ts`, `ui/` (one-page Nuxt SPA + kit subset), `moon.yml`, `package.json`, `tsconfig.json`, README with the architecture discussion |
| `package.json` | modify | Add `"examples/*"` to the workspaces globs |
| `.moon/workspace.yml` | modify | Register `example-single-binary: 'examples/single-binary'` |
| `docs/planning/milestones/M-0008-single-exec-distribution.md` | modify | Re-scope: prototype lives at `examples/single-binary/`; `apps/web` recorded as the M-0009 seed; task table/status refreshed |
| `docs/planning/tasks/T-BMTX-bun-compile-matrix.md` | modify | Retarget the compile-matrix paths and moon targets at the example project |
| `docs/planning/tasks/T-DEMO-end-to-end-feasibility-demo.md` | modify | Retarget the demo walkthrough at the example binary |
| `docs/planning/tasks/T-RELS-release-channels.md` | modify | Note the released artifact builds from the example until M-0009 retargets distribution at `apps/web` |
| `docs/planning/tasks/T-WEBU-nuxt-spa-ui.md` | modify | Close: delivered (beyond scope) via PR #183; minimal surface now carried by the example |
| `docs/planning/tasks/T-SPAE-spa-embed.md` | modify | Close: embed shipped via PR #183; the example carries the canonical embed pipeline |
| `docs/planning/tasks/T-UTKU-web-ui-prototype-review.md` | modify | Resolve the review gate — component adoption happened in PR #183; record outcome and disposition of the Storybook harness |

## Acceptance criteria

- [ ] AC-1: `bun run build:binary` in `examples/single-binary/` produces
  `dist/markdown-contract`; copied to an empty scratch directory, `validate` over one
  passing and one failing fixture tree prints stdout byte-identical to
  `packages/core`'s npm bin with matching exit codes.
- [ ] AC-2: from that same empty directory (no `ui/.output/` anywhere on disk),
  `./markdown-contract daemon` serves the SPA on `127.0.0.1:4320`; the page validates a
  vault via `POST /api/validate` and renders its findings — no external files read.
- [ ] AC-3: the example imports the library only through published `markdown-contract`
  exports — grep shows no import from `apps/web`, no relative reach into
  `packages/core/src`, and the CLI face imports `markdown-contract/cli/run` (not
  `markdown-contract/cli`).
- [ ] AC-4: `moon run example-single-binary:typecheck example-single-binary:test` passes
  locally, and both tasks appear green in the CI run for the PR.
- [ ] AC-5: the example README contains the architecture discussion (two-faces diagram,
  generate → embed → compile pipeline, loopback trust model, the `cli/run` entry-guard
  gotcha) and a Boundary section naming what is deliberately out (registry, SSE,
  watching, editor → `apps/web`, M-0009).
- [ ] AC-6: the M-0008 milestone doc and T-BMTX/T-DEMO/T-RELS cite
  `examples/single-binary/` paths; T-WEBU and T-SPAE are `closed/done` with completion
  notes citing PR #183; T-UTKU is resolved with a recorded outcome.

## Out of scope

- The cross-compile matrix and CI both-faces smoke — [[T-BMTX-bun-compile-matrix]]
  implements them *against* this example; this task only retargets its paths.
- GitHub Releases / checksums / installer / unsigned-install notes
  ([[T-RELS-release-channels]], [[T-INST-convenience-installer]],
  [[T-UNSG-unsigned-install-notes]]).
- The illustrated demo document ([[T-DEMO-end-to-end-feasibility-demo]]) — the example
  is its subject; the walkthrough is its own task.
- Any behavior change in `apps/web` (it stays as the M-0009 seed, untouched) or in
  `apps/daemon-web-prototype` (the Storybook harness; its retirement is decided under
  T-UTKU's resolution, not here).
- Signing/notarisation, the Nitro swap, Tauri/Rust futures
  ([[D-0012-distribution-single-exec-and-web-ui]] §D5–§D7).
- Deleting the untracked `prototype/web-ui/` leftovers (`node_modules`, `bun.lock`) —
  local cleanup, not a PR change.

## Dependencies

- None hard — everything the extraction copies from is merged on `main` (PR #183, and
  the T-DAEM skeleton from PR #173). Downstream, [[T-BMTX-bun-compile-matrix]] and
  [[T-DEMO-end-to-end-feasibility-demo]] should start only after this lands, since
  their touchpoints move to `examples/single-binary/`.

## Discovery context

Defined 2026-07-03 in-session during the M-0008 completion evaluation and re-scope
discussion on [[M-0008-single-exec-distribution]]: PR #183 delivered the milestone's
architecture proof but grew well into M-0009 surfaces inside `apps/web`, leaving M-0008
without a *pure* minimal prototype. Decision: keep M-0008 focused on the core idea,
extracted as a canonical example under a new top-level `examples/` tree (chosen over an
`apps/` sibling so the boundary between canonical demonstration and product app is
readable from the directory layout).

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-03. PR: pending._

### Acceptance criteria coverage

- AC-1: agent-manual — built the binary, copied it to an empty scratch dir; `validate` stdout AND stderr byte-identical (`cmp`) to the npm bin on a passing and a failing vault, exit codes matched (0/0, 1/1).
- AC-2: agent-manual — daemon booted from the empty dir on 4326 and 4320; `/api/health` ok, `/` served the embedded SPA HTML, hashed asset came back with `immutable` cache headers, `POST /api/validate` on a real vault returned findings JSON. No `ui/.output` anywhere on disk.
- AC-3: auto — grep gate: no `apps/web` imports, no `packages/core/src` reach, CLI face imports `markdown-contract/cli/run` only; pinned by the import layout itself.
- AC-4: auto (local) / deferred-user (CI half) — `moon run example-single-binary:typecheck example-single-binary:test` green locally (23 tests); the "green in the PR's CI run" half is observable only after this PR's CI completes — please confirm on the PR checks.
- AC-5: agent-manual — README carries all six required sections (Boundary, two-faces diagram, build pipeline, loopback trust model, Bun.serve-vs-Nitro, `cli/run` entry-guard gotcha); independently spot-checked by the parent session.
- AC-6: auto — all seven re-pointed planning docs pass `sdlc entities validate`; T-WEBU/T-SPAE `closed/done` with completion notes citing PR #183; T-UTKU `closed/superseded`.

### What worked

- The copy-then-trim extraction out of `apps/web` was clean — the T-DAEM skeleton and embed pipeline separated from the M-0009 business logic exactly along the seams the task's Today table predicted.
- The baseline-gated quality run (`OK 5/5`) correctly ignored pre-existing repo drift and gated only this branch's changes.
- End-to-end verification from an empty directory (both faces, real vaults) caught zero regressions — the byte-identical CLI check is a strong, cheap parity gate.

### Friction and automation gaps

- `sdlc quality run` captures verb output via `spawnSync` with the default 1 MiB maxBuffer; `bunx moon run core:lint` emits ~1.04 MiB of pre-existing warnings and gets SIGTERM-killed, misreported as FAIL (flaps right at the boundary) — the runner should stream or raise maxBuffer. → [[T-WG6B-quality-run-stream-verb-output]]
- Related runner instability: `--diff-against-baseline` line-matches verb output exactly, so moon's per-run decoration (timing values like `Time: 56ms`, `(cached, <SHA>)` cache-status lines, ANSI-colored summaries) shows up as false `new-drift:` whenever cache state differs between baseline capture and gate run — Step 9's post-rebase re-run FAILed on 6 such lines while the branch's diff against `origin/main` touches nothing `core:lint` covers (verified empty for `packages/core` + biome config). The baseline differ should normalize/strip unstable decoration lines; same fix surface as [[T-WG6B-quality-run-stream-verb-output]].
- `packages/core` carries 324 pre-existing biome warnings whose colored output is what breaches that buffer — a warning cleanup or a `--max-diagnostics` cap would defuse the flap from the repo side. → [[T-UFUX-core-biome-warning-cleanup]]
- The task location grammar cannot cite literal paths containing `[` `]` (Nuxt dynamic-route files like `pages/vault/[id]/edit.vue` parse as glob character classes and never resolve) — the resolver could support escaping; worked around by citing the parent directory. → [[T-TLJW-location-grammar-bracket-escaping]]
- `preflight_permissions.ts` reported missing Write/Edit grants for the worktree path even though session writes to `.sdlc/worktrees/**` demonstrably worked — the settings-file scan misses session-effective permission modes; a live write-probe would eliminate the false gate. → [[T-0AM0-preflight-probe-honors-runtime-edit-grant]] (pre-existing upstream task in sksizer/dev)
- task-work's "land body edits on origin/main before the gate" step has no sanctioned verb: a hand-rolled `git push origin HEAD:main` for the citation fix was denied by the harness permission layer (correctly), while the plugin's own scripts push main internally — a `sdlc task amend --on main` verb would close the gap; worked around by carrying the fix on the task branch. → [[T-LCTU-task-amend-on-main-verb]]
- M-0008's milestone body was missing the schema-required `## Goal` H2 at HEAD (pre-existing validation failure on main, only surfaced when this task edited the file) — periodic `/sdlc:entities-audit` runs would catch such drift before it blocks unrelated tasks. → [[T-6KS9-orchestrate-periodic-entities-audit]]
- `docs/index.md` is a generated artifact indexing task statuses; nothing in the task-work flow regenerates it after planning-doc edits — `/sdlc:docs` needs a post-merge run, or close-out should trigger it. → [[T-BDKN-close-out-regenerates-docs-index]]

### Spawned follow-up tasks

- [[T-WG6B-quality-run-stream-verb-output]] (<https://github.com/sksizer/dev/pull/622>) — quality run streams verb output so the 1 MiB spawnSync maxBuffer can't misreport FAIL; spawned upstream (sksizer/dev, sdlc-meta)
- [[T-UFUX-core-biome-warning-cleanup]] (<https://github.com/sksizer/markdown-contract/pull/204>) — clean up packages/core's 324 pre-existing biome warnings (or cap lint diagnostics); spawned local
- [[T-TLJW-location-grammar-bracket-escaping]] (<https://github.com/sksizer/dev/pull/624>) — location grammar supports escaping literal `[` `]` in cited paths; spawned upstream (sksizer/dev, sdlc-meta)
- [[T-0AM0-preflight-probe-honors-runtime-edit-grant]] — preflight probe honors runtime edit grants / touch-tests before flagging Write/Edit gaps; linked to the pre-existing upstream task in sksizer/dev (same gap, same proposed fix — no new PR)
- [[T-LCTU-task-amend-on-main-verb]] (<https://github.com/sksizer/dev/pull/625>) — sanctioned `sdlc task amend --on main` verb for pre-gate body edits; spawned upstream (sksizer/dev, sdlc-meta)
- [[T-6KS9-orchestrate-periodic-entities-audit]] (<https://github.com/sksizer/dev/pull/626>) — periodic /sdlc:entities-audit runs catch entity drift before it blocks tasks; spawned upstream (sksizer/dev, sdlc-meta)
- [[T-BDKN-close-out-regenerates-docs-index]] (<https://github.com/sksizer/dev/pull/627>) — task close-out (or a post-merge hook) regenerates the /sdlc:docs artifacts; spawned upstream (sksizer/dev, sdlc-meta)
