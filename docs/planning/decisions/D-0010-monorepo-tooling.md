---
type: decision
schema_version: '1'
id: D-0010
status: open/proposed
title: Monorepo tooling — a Bun workspace orchestrated by moon
created: '2026-06-28'
related:
  - '[[D-0006-packaging]]'
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
  - '[[C-0009-single-binary-and-vault-dashboard]]'
  - '[[T-MOON-adopt-moon-monorepo]]'
  - '[[PR-0002-markdown-contract-cli]]'
tags:
  - monorepo
  - tooling
  - moon
  - bun
  - workspace
  - build
  - ci
need_human_review: true
---

# Monorepo tooling — a Bun workspace orchestrated by moon

## Summary

- The repo becomes a **Bun workspace** (`packages/core` + `apps/web`) orchestrated by **[moon](https://moonrepo.dev)**. Two layers: **Bun** is the package layer (dependency linking, one lockfile, and the compile/runtime), **moon** is the task runner + toolchain manager (cross-project task graph, input/output caching, and **pinned Bun/Node versions** for every dev and CI run). ^summary
- **moon over Turborepo/Nx** for two reasons this repo actually hits: **polyglot reach** (the Tauri shell, and a possible future Rust core, both add Rust — moon keeps TS + Rust in one graph; Turborepo/Nx are JavaScript-centric) and **built-in toolchain reproducibility** (a pinned Bun matters for cross-compiled binaries). **Turborepo is the fallback** if the project ever stays TS-only.
- This is a **foundational decision, prior to and independent of** the distribution work it enables ([[D-0012-distribution-single-exec-and-web-ui]]): it fixes *how the repo is organized and built*, regardless of *what* is shipped. It keeps the npm library canonical ([[D-0006-packaging]]) — the workspace just gives it siblings.

## Context

Today the repo is a single npm package with plain npm scripts (`build`/`typecheck`/`test`/`lint:docs`): no task caching, no affected-detection, and no pinned runtime — the toolchain version is implicit. That is fine for one package.

It stops being fine on the near horizon ([[D-0012-distribution-single-exec-and-web-ui]], [[C-0009-single-binary-and-vault-dashboard]]): a **Nuxt UI app** lands beside the library, a **cross-compiled binary matrix** needs a *reproducible* runtime, and **Rust** arrives later (a Tauri shell, and possibly a parallel Rust core for performance). That trajectory needs (a) a **workspace** to link multiple packages under one lockfile and (b) a **task runner + toolchain manager** that caches a cross-project graph and pins runtimes across machines and CI.

The building blocks: Bun is already the chosen compile/runtime and a `bun.lock` is already present; Bun workspaces handle the package layer. The open choice is the task runner on top — and whether it must reach beyond JavaScript.

## Decision

### D1 — Bun workspaces as the package layer

Split the single package into a workspace: **`packages/core`** (today's Node ESM library: engine + runner + declarative + the CLI bin — the canonical npm artifact of [[D-0006-packaging]], with its `tsc`/`vitest` flow unchanged) and **`apps/web`** (the Nuxt SPA + daemon that depends on it). **Bun workspaces** own dependency linking and the single lockfile — consistent with the compile runtime and the existing `bun.lock`. The library remains the published, runtime-neutral artifact; the workspace just gives it siblings.

### D2 — moon as the task runner + toolchain manager

On top of the workspace, **moon** models the cross-project task graph (`build` / `typecheck` / `test` / `lint:docs`, later the Nuxt build and the `bun build --compile` matrix), caches by inputs/outputs, and **pins the Bun/Node versions** for every dev and CI run. moon over Bun composes cleanly: enable moon's `javascript` + `bun` toolchains and it respects `package.json` workspaces and installs in the right place. moon v2 ("Phobos", May 2026) moved to a WASM plugin-toolchain architecture — pin a v2.x and follow the Bun handbook.

### D3 — Adopt incrementally

moon is adopted *first* over the current single-package layout — model the existing tasks, pin the toolchain, wire CI — and the physical `packages/core` + `apps/web` split follows, so moon lands as a small, independently shippable change and the split then only *adds projects* to the graph. This is tracked by [[T-MOON-adopt-moon-monorepo]].

## Why

- **Polyglot reach is the deciding factor.** The roadmap adds Rust (Tauri shell; possibly a Rust core — [[D-0012-distribution-single-exec-and-web-ui]]). moon graphs TS *and* Rust *and* Go in one dependency graph and knows what to rebuild across the boundary; Turborepo and Nx are fundamentally JavaScript-centric.
- **Toolchain reproducibility is load-bearing for a binary.** moon pins the exact Bun/Node for every dev and CI run — exactly what a reproducible cross-compiled `bun build --compile` matrix needs. Turborepo/Nx leave runtime pinning to you.
- **One toolchain across library, binary, and UI.** Bun is the package manager, the compile runtime, and (via `bun:sqlite`, later) an embedded store; moon pins and orchestrates it — collapsing several concerns into one consistent setup.
- **Composes with the canonical library.** The workspace and runner change *how the repo builds*, not *what it ships*; the npm package stays the canonical artifact ([[D-0006-packaging]]).

## Consequences

- **The repo restructures into a Bun workspace** (`packages/core` + `apps/web`), one lockfile/toolchain. The library's own `tsc`/`vitest` flow is unchanged; the repo gains a second, isolated app build. (The untracked `bun.lock` already anticipates this.)
- **A task runner enters the repo and CI.** moon config (`.moon/`, per-project `moon.yml`) plus a pinned moon version; CI runs tasks via moon. Coordinate with the CI quality-checks workflow so there is one task source of truth.
- **A smaller-ecosystem bet.** moon's community is smaller than Turborepo's/Nx's (fewer tutorials, fewer people who already know it) and v2 is a recent rearchitecture — pin versions and keep the config simple. Mitigated by the Turborepo fallback if the Rust path is ever dropped.

## Options considered

### Task runner — moon (chosen) vs Turborepo vs Nx

| | **moon** (chosen) | Turborepo | Nx |
|---|---|---|---|
| Language reach | Polyglot (JS/TS, **Rust**, Go, …) | JS/TS-centric | JS/TS-centric (+ plugins) |
| Toolchain pinning | **Built-in** (pins Bun/Node per repo) | external (you pin) | external (you pin) |
| Bun support | First-class toolchain (v2) | works (as PM) | works (as PM) |
| Footprint / community | Rust core; smaller (~50K/wk) | simple; large (~2M/wk) | feature-rich/heavy; largest (~5M/wk) |
| Fit here | Tauri/Rust future + reproducible cross-compile | best *if TS-only* | overkill at 2–3 packages |

Chosen **moon** for polyglot reach (the Rust/Tauri future) and built-in toolchain reproducibility (the cross-compiled binary). **Turborepo** is the fallback if the repo stays TS-only; **Nx** is rejected as overkill at this size.

### Package layer — Bun workspaces (chosen) vs pnpm/npm workspaces

Chosen **Bun workspaces**: the project already commits to Bun as the compile runtime and carries a `bun.lock`, so one runtime/lockfile across library, binary, and UI is the least-friction path, and moon's `bun` toolchain integrates it directly. pnpm is the alternative if a non-Bun contributor flow ever matters; npm workspaces are the lowest-common-denominator fallback.

## Out of scope

- **What gets distributed** — the single-exec binary, the web UI, vault tracking, release channels — all live in [[D-0012-distribution-single-exec-and-web-ui]]; this decision only fixes the repo's build organization.
- **Remote/cloud caching** (moon's cloud) — local cache only for now.
- **Rust crates** — none are added here; the *reason* for moon is the Rust future, but no Rust project lands in this decision.
- **The physical restructure mechanics** — sequenced by [[T-MOON-adopt-moon-monorepo]] (moon first, split second).

## References

- moon — task runner + toolchain: https://moonrepo.dev/moon
- moon — Bun handbook: https://moonrepo.dev/docs/guides/javascript/bun-handbook
- moon — v2.0 ("Phobos") release: https://www.infoq.com/news/2026/05/moonrepo-2-release/
- Monorepo tools compared (Turborepo vs Nx vs moon, 2026): https://www.pkgpulse.com/guides/turborepo-vs-nx-vs-moon-2026
- Internal: [[D-0006-packaging]] (Node ESM library, canonical), [[D-0012-distribution-single-exec-and-web-ui]] (the distribution this enables), [[C-0009-single-binary-and-vault-dashboard]], [[T-MOON-adopt-moon-monorepo]], [[PR-0002-markdown-contract-cli]]
