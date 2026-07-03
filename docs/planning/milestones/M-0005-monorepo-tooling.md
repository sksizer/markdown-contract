---
type: milestone
schema_version: '1'
id: M-0005
title: Monorepo tooling — a Bun workspace orchestrated by moon
status: closed/done
created: '2026-06-28'
related:
  - '[[D-0010-monorepo-tooling]]'
  - '[[T-MOON-adopt-moon-monorepo]]'
  - '[[D-0006-packaging]]'
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
  - '[[PR-0002-markdown-contract-cli]]'
tasks:
  - '[[T-MOON-adopt-moon-monorepo]]'
  - '[[T-WKSP-bun-workspace-split]]'
  - '[[T-AE0J-moon-build-system]]'
  - '[[T-U6W3-document-moon-npm-script-wrapping]]'
tags:
  - monorepo
  - tooling
  - moon
  - bun
  - milestone
need_human_review: false
---

# Monorepo tooling — a Bun workspace orchestrated by moon

## Summary

- Reorganize the repo into a Bun workspace (`packages/core` + `apps/web`) orchestrated by moon (task graph, input/output caching, pinned Bun/Node toolchain), per [[D-0010-monorepo-tooling]]. The npm library stays canonical ([[D-0006-packaging]]); this is build organization, not an engine change. ^summary
- The enabler for the distribution and docs milestones: the cross-compiled binary and the web/docs apps build as moon tasks over this workspace.

## Outcome

moon is adopted with a pinned toolchain and cached `build`/`typecheck`/`test`/`lint:docs` tasks; the package split into `packages/core` + `apps/web` lands incrementally so later milestones only add projects.

## Scope

**In:** the Bun workspace (`bun install` / `bun.lock` canonical — `package-lock.json` removed); moon config + pinned Bun/Node toolchain; task modeling + CI via moon (bootstrapped with Bun); the `packages/core` + `apps/web` split ([[T-WKSP-bun-workspace-split]]); [[T-MOON-adopt-moon-monorepo]] (shipped).
**Out:** the binary / docs site / UI themselves (M-0008 / M-0006 / M-0009 later); remote caching; Rust crates.

### Runtime split — Bun for dev speed, Node for the artifact

Bun is the canonical **dev** layer: the installer/lockfile and the runner for `build` / `typecheck`, chosen for speed. Node remains the **published-artifact** target ([[D-0006-packaging]]) and the **test gate** — `vitest` runs under pinned Node, and that run is the proof the library actually runs on Node. D-0006's "npm canonical" rule governs *what ships*, not the dev package manager. Developers may run tests under Bun locally for fast iteration; the authoritative CI gate is the Node run.

## Success criteria

- A Bun workspace with `packages/core` (library + CLI) and `apps/web` scaffolded under **one `bun.lock`**; `package-lock.json` is removed and `bun install` resolves the workspace.
- moon runs `build`/`typecheck`/`test`/`lint:docs` with caching and a pinned Bun/Node toolchain; install + `build`/`typecheck` run on **Bun**, the `test` task is pinned to **Node**; CI bootstraps with Bun (`setup-bun` + `bun install`) and runs the suite via moon.
- **Node-compatibility is proven, not assumed:** the test suite runs under pinned Node (the compat gate), and `packages/core` imports no Bun-only APIs (`Bun.*`, `bun:*`) — guarded so a dev-time Bun dependency cannot leak into the published library.
- The npm publish flow (`tsc` → `dist`, tests excluded) is unchanged: `npm pack` from `packages/core` emits the same artifact with no `workspace:*` refs.
- Later milestones (M-0008 distribution, M-0006 docs site) add their builds as moon projects without retooling.
