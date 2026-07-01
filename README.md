# markdown-contract (Bun workspace)

[![CI](https://github.com/sksizer/markdown-contract/actions/workflows/ci.yml/badge.svg)](https://github.com/sksizer/markdown-contract/actions/workflows/ci.yml)

Bun workspace for **markdown-contract**. The publishable library + CLI lives in
[`packages/core`](packages/core/); [`apps/web`](apps/web/) is a placeholder for
the future web UI (D-0012 / M-0009).

## Layout

| Path | Role |
|---|---|
| `packages/core` | The `markdown-contract` npm library + CLI. Runtime-neutral; the canonical published artifact. See [`packages/core/README.md`](packages/core/README.md). |
| `apps/web` | Placeholder for the future web UI. No code yet. |
| `prototype/web-ui` | Exploratory UI prototype (not a workspace member). |
| `docs/`, `contracts/` | Project planning docs and their contracts. |
| `provenance/d0014/` | The originating ADR: proposed shape + decision log. |

## Toolchain

- **Bun** is the canonical dev package manager — one `bun.lock` at the root.
  `bun install` resolves the whole workspace.
- **moon** is the task runner. Tasks are defined in `packages/core/moon.yml`:
  `build` + `typecheck` run on the Bun toolchain, `test` / `coverage` run vitest
  under the pinned **Node** toolchain (the Node-compatibility gate).
- **npm** stays canonical for the *published* artifact only: `npm publish` from
  `packages/core` ships `dist/` + the CLI bin, unchanged from before the split.

```sh
bun install                                  # resolve the workspace
bunx moon run core:build                     # tsc → packages/core/dist
bunx moon run core:test                      # vitest under Node
bunx moon run :build :typecheck :coverage    # what CI runs
```
