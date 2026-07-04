# markdown-contract (Bun workspace)

[![CI](https://github.com/sksizer/markdown-contract/actions/workflows/ci.yml/badge.svg)](https://github.com/sksizer/markdown-contract/actions/workflows/ci.yml)

Bun workspace for **markdown-contract**. The publishable library + CLI lives in
[`packages/core`](packages/core/); runtime apps (the single-binary prototype,
the daemon-web UI prototype) live under `apps/`; websites — including the
documentation site — live under `sites/`.

**Documentation:** <https://markdown-contract-docs.pages.dev/> — the
[`sites/docs`](sites/docs/) Starlight site, auto-deployed to Cloudflare Pages on
push to `main` (build settings: [`sites/docs/README.md`](sites/docs/README.md)).

## Layout

| Path | Role |
|---|---|
| `packages/core` | The `markdown-contract` npm library + CLI. Runtime-neutral; the canonical published artifact. See [`packages/core/README.md`](packages/core/README.md). |
| `apps/web` | The single-binary prototype (D-0012 "one binary, two faces"): CLI + localhost daemon serving the vault dashboard. See [`apps/web/README.md`](apps/web/README.md). |
| `apps/daemon-web-prototype` | Nuxt + Storybook UI prototype of the daemon's vault dashboard. Mock data only; not a moon project. See [`apps/daemon-web-prototype/README.md`](apps/daemon-web-prototype/README.md). |
| `sites/docs` | Astro + Starlight documentation site (M-0006), published to Cloudflare Pages; never published to npm. See [`sites/docs/README.md`](sites/docs/README.md). |
| `docs/`, `contracts/` | Project planning docs and their contracts. |
| `provenance/d0014/` | The originating ADR: proposed shape + decision log. |

## Library health baseline

This repo tracks [sksizer/node-template](https://github.com/sksizer/node-template)
as the reference for single-package Node/TypeScript **library health**. The
template defines the canonical layer stack — scaffold, Biome format/lint, Vitest
test + coverage floor, the CI gate, dependency hygiene (Dependabot + audit),
publish hygiene (`publint` + `are-the-types-wrong`), dead-code detection (knip),
code metrics (scc), and module/test conventions — and this workspace carries
every layer, adapted from the template's npm single-package shape to the
Bun + moon workspace (gates wrapped as `core:*` moon tasks plus dedicated
side-gate workflows).

Layers here that go beyond the template: lefthook pre-commit/pre-push hooks +
`.editorconfig`, knip promoted to a **blocking** gate (the template plans
report-only), and the planning-docs contract gate (`core:lint-docs`). When the
template grows or changes a layer, mirror the delta here — and when a quality
practice proves out here first, upstream it to the template.

## Toolchain

- **Bun** is the canonical dev package manager and the fast task runner: one
  `bun.lock` at the root, `bun install` resolves the whole workspace, and the
  `build` + `typecheck` moon tasks run on the Bun toolchain.
- **Node** is the compatibility gate and the runtime the published library
  targets: the `test` / `coverage` moon tasks run vitest under the pinned Node
  toolchain, exercising the runtime-neutral library under real Node before it
  ships.
- **moon** is the task runner; tasks are defined in `packages/core/moon.yml`.
  The toolchain version pins (Bun, Node) live in `.moon/toolchains.yml`.
- The published artifact still ships via `npm publish` from `packages/core`
  (`dist/` + the CLI bin), unchanged from before the split.
- **Git hooks** are managed by [lefthook](https://lefthook.dev) and arm
  automatically on install (the root `prepare` script and `worktree_init` both
  run `lefthook install`). `pre-commit` runs Biome over staged files;
  `pre-push` runs the `core:typecheck` + `core:test` gates. Bypass an
  individual run with `git commit --no-verify` / `git push --no-verify`.

```sh
bun install                                  # resolve the workspace
bunx moon run core:build                     # tsc → packages/core/dist
bunx moon run core:test                      # vitest under Node
bunx moon run :build :typecheck :coverage    # what CI runs
```

### Authoring moon tasks

moon v2's runtime-only toolchains do **not** put `node_modules/.bin` on PATH, so
a moon task must invoke its runner explicitly — never a bare `tsc` / `vitest` /
`biome`:

- On the **`bun`** toolchain (`build`, `typecheck`, `package-check`, `lint`), use
  `bun run <script>`. `bun run` puts `node_modules/.bin` on PATH, so the tool bin
  (`tsc`, `publint`, `biome`) resolves.
- On the **`node`** toolchain (`test`, `coverage`, `lint-deps`), use
  `npm run <script>` — **not** `bun run`. npm ships with Node, puts `.bin` on
  PATH, *and* runs the script under the real **Node** runtime.

Keep `test` / `coverage` pinned to `toolchain: node` on purpose: that run is the
Node-compatibility gate for the runtime-neutral published library, so `vitest`
must execute under Node. Moving those tasks onto Bun would run vitest under Bun
and defeat the gate.

**`runInCI: false` suppresses explicit `moon run` under CI.** A task marked
`runInCI: false` (in `packages/core/moon.yml`, that's `core:lint-deps` and
`core:lint-docs`) is not merely dropped from the shared `moon ci` list — moon
also **skips it for an explicit `moon run <task>`** once it detects a CI
environment. moon (version-pinned at `@moonrepo/cli` 2.3.5) keys that detection
on a **non-empty `CI` env var**.

- To run such a task from a **dedicated side-gate workflow**, clear `CI` for
  that step (`env: CI: ''`) so moon stops treating the run as CI and actually
  executes the task. `.github/workflows/knip.yml` is the canonical worked
  example.
- Prefer a dedicated side-gate workflow over adding the task to the shared
  `moon run` CI list for **report-only gates that must not fail the shared build
  gate** — `runInCI: false` keeps the task out of `moon ci`, and its own
  workflow decides whether a finding reddens the PR.

## Code metrics

`bun run metrics` (equivalently `npm run metrics`) runs
[scc](https://github.com/boyter/scc) over `packages/core/src` to report
lines-of-code, comments, blanks, and code per language/file, plus a
cyclomatic-complexity aggregate and a COCOMO cost estimate. It is
**report-only** — it never gates the build.

scc is a single Go binary, not an npm package, so it is **not** a devDependency:
it must be installed on your `PATH` first, e.g. `brew install scc` or
`go install github.com/boyter/scc/v3@v3.5.0`.

CI runs scc too, pinned via the `SCC_VERSION` env in
[`.github/workflows/metrics.yml`](.github/workflows/metrics.yml) — that pinned
version is the reproducible source of truth. Local numbers may differ if your
installed scc version drifts from the pin.
