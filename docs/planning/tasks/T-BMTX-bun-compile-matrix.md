---
type: task
schema_version: '5'
id: T-BMTX
status: open/ready
created: '2026-06-28'
related:
  - '[[M-0008-single-exec-distribution]]'
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
  - '[[D-0010-monorepo-tooling]]'
  - '[[T-DAEM-daemon-and-json-api]]'
depends_on:
  - '[[T-WKSP-bun-workspace-split]]'
tags:
  - distribution
  - bun
  - compile
  - ci
  - prototype
need_human_review: true
impact: high
complexity: large
autonomy: supervised
---
# Cross-compile the combined CLI + daemon binary, and stand up the moon/CI build graph

## Goal

Produce a self-contained `markdown-contract` binary that is **both the CLI and the `daemon`
web server** for **macOS / Linux / Windows × x64 / arm64** from one host, built via
`bun build --compile` as cached moon tasks, plus the CI that builds and smoke-tests it. This
is the build foundation of the [[M-0008-single-exec-distribution]] prototype, per
[[D-0012-distribution-single-exec-and-web-ui]] §D2.

## Today

| Location | Role today |
|---|---|
| `package.json#bin` | The npm bin `markdown-contract → ./dist/cli/index.js` (Node ESM, `tsc` → `dist`). Stays unchanged. |
| `src/cli/index.ts` | The Node-standard CLI bin entry; no `daemon`, no binary, no cross-compile. |
| `.moon/workspace.yml` / `.moon/toolchains.yml` | moon over the workspace; Bun + Node toolchains pinned ([[T-MOON-adopt-moon-monorepo]]). |
| `.github/workflows/ci.yml` | CI runs the moon suite; it does not build any binary. |
| `apps/web/src/bin.ts` | The combined entry ([[T-DAEM-daemon-and-json-api]]) this task compiles — `daemon` → server, else → `packages/core` `runCli`. |

There is no standalone binary and no cross-compile pipeline; [[T-WKSP-bun-workspace-split]]
gives `packages/core` (library + CLI) and the `apps/web` slot the binary is built from.

## Proposed

Per-target moon `compile` tasks running `bun build --compile --target=<triple>` against
`apps/web/src/bin.ts` (which pulls in the daemon and, via [[T-SPAE-spa-embed]], the SPA),
emitting one binary per OS/arch into a `dist-bin/` layout, with the matrix runnable from a
single host and a CI job that builds the host binary and smoke-tests **both faces**.

## Approach

1. **Build graph.** Define moon tasks on `apps/web/moon.yml`: `build:web` (the SPA dist,
   [[T-WEBU-nuxt-spa-ui]]) → `compile` (`bun build --compile` of `apps/web/src/bin.ts`),
   declaring `build:web` as an input/dep of `compile` so the SPA exists at compile time
   (the ordering [[T-SPAE-spa-embed]] needs).
2. **Target matrix.** Parameterize `compile` over the 6 triples (`bun-darwin-x64`,
   `bun-darwin-arm64`, `bun-linux-x64`, `bun-linux-arm64`, `bun-windows-x64`,
   `bun-windows-arm64`; `+musl` if needed), `--outfile dist-bin/markdown-contract-<os>-<arch>`
   (`.exe` on Windows). Cache by inputs (`apps/web/src/**`, `packages/core/src/**`, the SPA dist).
3. **Smoke both faces.** A smoke check runs the host binary as `validate` (parity with the npm
   bin) **and** boots it as `daemon`, curls `/api/health` + `/api/validate`, and asserts the
   embedded SPA HTML is served (the [[T-SPAE-spa-embed]] AC, exercised in CI).
4. **CI job.** Add a job to `.github/workflows/ci.yml` that runs `moon run web:compile`
   (host target) and the smoke check on push/PR — the "infrastructure (CI tasks), scripts to
   build" deliverable. (Tag-triggered release upload is [[T-RELS-release-channels]].)
5. **Keep npm untouched.** `packages/core`'s `tsc` → `dist` publish flow and its `bin` are
   unchanged; the binary is a separate, additive Bun target (D1).
6. **Fallback note.** Record Deno `compile` as the documented fallback if Bun proves
   unsuitable ([[D-0012-distribution-single-exec-and-web-ui]] §D2).

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `apps/web/moon.yml` | new | `build:web` and parameterized `compile` (per-triple) tasks; `compile` depends on `build:web`. |
| `apps/web/scripts/compile.ts` | new | The cross-compile driver invoked by the moon `compile` task (target list → `bun build --compile`). |
| `apps/web/scripts/smoke.ts` | new | Smoke check: run the binary as `validate` and as `daemon` (curl `/api/health`, `/api/validate`, embedded HTML). |
| `.github/workflows/ci.yml` | modify | Add a job that builds the host binary via moon and runs the smoke check. |
| `.moon/workspace.yml` | modify | Ensure the `web` project + the binary task graph are registered. |
| `.gitignore` | modify | Ignore `dist-bin/`. |

## Acceptance criteria

- [ ] AC-1: A moon `compile` task produces a runnable binary for each of macOS/Linux/Windows × x64/arm64 from one host via `bun build --compile` of `apps/web/src/bin.ts`.
- [ ] AC-2: The host binary runs `validate`/`init` identically to the npm bin (CLI parity) **and** boots as `daemon` serving `/api/*` plus the embedded SPA (both faces).
- [ ] AC-3: `build:web` is wired as a prerequisite of `compile` so the SPA dist is present at compile time; the task graph caches by source inputs.
- [ ] AC-4: CI builds the host binary and runs the both-faces smoke check on push/PR and is green.
- [ ] AC-5: `packages/core`'s npm publish (`tsc` → `dist`) and `bin` are unchanged (no coupling to the binary build).

## Out of scope

- Release upload / channels ([[T-RELS-release-channels]]); installers ([[T-INST-convenience-installer]]); signing/notarisation (deferred, [[D-0012-distribution-single-exec-and-web-ui]] §D5; documented in [[T-UNSG-unsigned-install-notes]]).
- The SPA, the daemon/API, and the embed mechanism themselves — [[T-WEBU-nuxt-spa-ui]] / [[T-DAEM-daemon-and-json-api]] / [[T-SPAE-spa-embed]].

## Dependencies

- Depends on [[T-WKSP-bun-workspace-split]] (`packages/core` + the `apps/web` slot) and the moon/Bun toolchain ([[T-MOON-adopt-moon-monorepo]]). Compiles the combined entry from [[T-DAEM-daemon-and-json-api]] (with the embed from [[T-SPAE-spa-embed]]). Governed by [[D-0012-distribution-single-exec-and-web-ui]] / [[D-0010-monorepo-tooling]].
