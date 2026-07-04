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
  - '[[T-UDPO-extract-single-binary-example]]'
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
| `examples/single-binary/src/bin.ts` | The combined entry ([[T-DAEM-daemon-and-json-api]], extracted to the example by [[T-UDPO-extract-single-binary-example]]) this task compiles — `daemon` → server, else → `packages/core` `runCli`. |
| `examples/single-binary/moon.yml` | The example's moon project: `typecheck`/`test` CI-gated, plus a host-only `build` task running the full `build:binary` pipeline (`runInCI: false`). No cross-compile, no CI smoke yet. |

There is no cross-compile matrix and no CI binary smoke; the host binary builds from the
canonical example at `examples/single-binary/` ([[T-UDPO-extract-single-binary-example]]),
on the workspace layout from [[T-WKSP-bun-workspace-split]].

## Proposed

Per-target moon `compile` tasks running `bun build --compile --target=<triple>` against
`examples/single-binary/src/bin.ts` (which pulls in the daemon and, via [[T-SPAE-spa-embed]], the SPA),
emitting one binary per OS/arch into a `dist-bin/` layout, with the matrix runnable from a
single host and a CI job that builds the host binary and smoke-tests **both faces**.

## Approach

1. **Build graph.** Extend `examples/single-binary/moon.yml`: split the existing host-only
   `build` task into an SPA-build step (`ui:generate` + `gen:assets`, the embed manifest) →
   `compile` (`bun build --compile` of `examples/single-binary/src/bin.ts`), declaring the
   SPA build as an input/dep of `compile` so the embedded assets exist at compile time
   (the ordering [[T-SPAE-spa-embed]] needs).
2. **Target matrix.** Parameterize `compile` over the 6 triples (`bun-darwin-x64`,
   `bun-darwin-arm64`, `bun-linux-x64`, `bun-linux-arm64`, `bun-windows-x64`,
   `bun-windows-arm64`; `+musl` if needed), `--outfile dist-bin/markdown-contract-<os>-<arch>`
   (`.exe` on Windows). Cache by inputs (`examples/single-binary/src/**`, `packages/core/src/**`, the SPA dist).
3. **Smoke both faces.** A smoke check runs the host binary as `validate` (parity with the npm
   bin) **and** boots it as `daemon`, curls `/api/health` + `/api/validate`, and asserts the
   embedded SPA HTML is served (the [[T-SPAE-spa-embed]] AC, exercised in CI).
4. **CI job.** Add a job to `.github/workflows/ci.yml` that runs
   `moon run example-single-binary:compile` (host target) and the smoke check on push/PR —
   the "infrastructure (CI tasks), scripts to build" deliverable. (Tag-triggered release
   upload is [[T-RELS-release-channels]].)
5. **Keep npm untouched.** `packages/core`'s `tsc` → `dist` publish flow and its `bin` are
   unchanged; the binary is a separate, additive Bun target (D1).
6. **Fallback note.** Record Deno `compile` as the documented fallback if Bun proves
   unsuitable ([[D-0012-distribution-single-exec-and-web-ui]] §D2).

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `examples/single-binary/moon.yml` | modify | SPA-build and parameterized `compile` (per-triple) tasks; `compile` depends on the SPA build. |
| `examples/single-binary/scripts/compile.ts` | new | The cross-compile driver invoked by the moon `compile` task (target list → `bun build --compile`). |
| `examples/single-binary/scripts/smoke.ts` | new | Smoke check: run the binary as `validate` and as `daemon` (curl `/api/health`, `/api/validate`, embedded HTML). |
| `.github/workflows/ci.yml` | modify | Add a job that builds the host binary via moon and runs the smoke check. |
| `.moon/workspace.yml` | modify | The `example-single-binary` project is already registered; ensure the binary task graph rides it. |
| `.gitignore` | modify | Ignore `dist-bin/`. |

## Acceptance criteria

- [ ] AC-1: A moon `compile` task produces a runnable binary for each of macOS/Linux/Windows × x64/arm64 from one host via `bun build --compile` of `examples/single-binary/src/bin.ts`.
- [ ] AC-2: The host binary runs `validate`/`init` identically to the npm bin (CLI parity) **and** boots as `daemon` serving `/api/*` plus the embedded SPA (both faces).
- [ ] AC-3: the SPA build (`ui:generate` + `gen:assets`) is wired as a prerequisite of `compile` so the embed manifest is present at compile time; the task graph caches by source inputs.
- [ ] AC-4: CI builds the host binary and runs the both-faces smoke check on push/PR and is green.
- [ ] AC-5: `packages/core`'s npm publish (`tsc` → `dist`) and `bin` are unchanged (no coupling to the binary build).

## Out of scope

- Release upload / channels ([[T-RELS-release-channels]]); installers ([[T-INST-convenience-installer]]); signing/notarisation (deferred, [[D-0012-distribution-single-exec-and-web-ui]] §D5; documented in [[T-UNSG-unsigned-install-notes]]).
- The SPA, the daemon/API, and the embed mechanism themselves — [[T-WEBU-nuxt-spa-ui]] / [[T-DAEM-daemon-and-json-api]] / [[T-SPAE-spa-embed]].

## Dependencies

- Depends on [[T-WKSP-bun-workspace-split]] (the workspace layout) and the moon/Bun toolchain ([[T-MOON-adopt-moon-monorepo]]). Compiles the combined entry from [[T-DAEM-daemon-and-json-api]] (with the embed from [[T-SPAE-spa-embed]]), now living at `examples/single-binary/` per [[T-UDPO-extract-single-binary-example]]. Governed by [[D-0012-distribution-single-exec-and-web-ui]] / [[D-0010-monorepo-tooling]].
