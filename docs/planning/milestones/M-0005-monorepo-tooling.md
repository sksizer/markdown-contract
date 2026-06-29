---
type: milestone
schema_version: '1'
id: M-0005
title: Monorepo tooling — a Bun workspace orchestrated by moon
status: open/active
created: '2026-06-28'
related:
  - '[[D-0010-monorepo-tooling]]'
  - '[[T-MOON-adopt-moon-monorepo]]'
  - '[[D-0006-packaging]]'
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
  - '[[PR-0002-markdown-contract-cli]]'
contains:
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
need_human_review: true
---

# Monorepo tooling — a Bun workspace orchestrated by moon

## Summary

- Reorganize the repo into a Bun workspace (`packages/core` + `apps/web`) orchestrated by moon (task graph, input/output caching, pinned Bun/Node toolchain), per [[D-0010-monorepo-tooling]]. The npm library stays canonical ([[D-0006-packaging]]); this is build organization, not an engine change. ^summary
- The enabler for the distribution and docs milestones: the cross-compiled binary and the web/docs apps build as moon tasks over this workspace.

## Outcome

moon is adopted with a pinned toolchain and cached `build`/`typecheck`/`test`/`lint:docs` tasks; the package split into `packages/core` + `apps/web` lands incrementally so later milestones only add projects.

## Scope

**In:** the Bun workspace; moon config + pinned toolchain; task modeling + CI via moon; the moon build-system setup (PR #47); [[T-MOON-adopt-moon-monorepo]].
**Out:** the binary / docs site / UI themselves (M-0008 / M-0006 / M-0009 later); remote caching; Rust crates.

## Success criteria

- A Bun workspace with `packages/core` (library + CLI) and `apps/web` scaffolded under one lockfile.
- moon runs `build`/`typecheck`/`test`/`lint:docs` with caching and a pinned Bun/Node toolchain; CI runs the suite via moon.
- The npm publish flow (`tsc` → `dist`, tests excluded) is unchanged.
- Later milestones (M-0008 distribution, M-0006 docs site) add their builds as moon projects without retooling.
