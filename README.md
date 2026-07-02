# markdown-contract (Bun workspace)

[![CI](https://github.com/sksizer/markdown-contract/actions/workflows/ci.yml/badge.svg)](https://github.com/sksizer/markdown-contract/actions/workflows/ci.yml)

Bun workspace for **markdown-contract**. The publishable library + CLI lives in
[`packages/core`](packages/core/); [`apps/web`](apps/web/) is a placeholder for
the future web UI (D-0012 / M-0009).

## Layout

| Path | Role |
|---|---|
| `packages/core` | The `markdown-contract` npm library + CLI. Runtime-neutral; the canonical published artifact. See [`packages/core/README.md`](packages/core/README.md). |
| `apps/docs` | Astro + Starlight documentation site (M-0006). Private; never published. See [`apps/docs/README.md`](apps/docs/README.md). |
| `apps/web` | Placeholder for the future web UI. No code yet. |
| `prototype/web-ui` | Exploratory UI prototype (not a workspace member). |
| `docs/`, `contracts/` | Project planning docs and their contracts. |
| `provenance/d0014/` | The originating ADR: proposed shape + decision log. |

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
