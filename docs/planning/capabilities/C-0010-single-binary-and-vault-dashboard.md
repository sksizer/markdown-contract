---
type: capability
schema_version: '1'
id: C-0010
kind: feature
title: Single-binary distribution and local vault dashboard
status: open/proposed
created: '2026-06-28'
parent_key: null
contains: []
related:
  - '[[PR-0002-markdown-contract-cli]]'
  - '[[PR-0001-markdown-contract]]'
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
  - '[[D-0010-monorepo-tooling]]'
  - '[[C-0003-corpus-cli]]'
  - '[[C-0008-config-scaffolding]]'
  - '[[T-MOON-adopt-moon-monorepo]]'
tags:
  - distribution
  - packaging
  - cli
  - web-ui
  - daemon
  - dashboard
  - single-binary
need_human_review: true
---

# Single-binary distribution and local vault dashboard

## Summary

- Ship the tool as **one self-contained, cross-platform executable** that is *both* the `markdown-contract` CLI and — in `daemon` mode — a **local web UI**, with the Nuxt SPA compiled into the same binary. No Node toolchain, no separate UI download. ^summary
- The UI is a **managed-vault dashboard**: register several markdown vaults and see each one's live validation status (green / findings / drift) in one place, drilling into findings per contract.
- It expands the product's *reach*, not its engine: the npm library stays canonical and untouched ([[PR-0001-markdown-contract]]); the binary and UI are additive build targets over the same `runner` ([[C-0003-corpus-cli]]). This capability supports the [[PR-0002-markdown-contract-cli]] product; its shape is fixed by [[D-0012-distribution-single-exec-and-web-ui]].

## Statement

A consumer downloads a single file for their OS/arch and runs it. As a **CLI** it validates a tree exactly as the npm bin does. Run as **`markdown-contract daemon`**, the same binary starts a localhost web UI — served from assets embedded in the executable — that tracks a set of registered vaults and reports each one's validation status, refreshed on demand (or live, when watching). It lowers "use markdown-contract" from "install Node, then `npm i -g`" to "download one file", and lifts it from one-shot CLI runs to a standing, at-a-glance view across many vaults.

## What it provides

- **One cross-platform binary** (macOS/Linux/Windows × x64/arm64) that is the CLI *and* the UI host — the SPA is bundled in, not shipped separately.
- **A `daemon` mode**: a local, single-user, localhost web app + JSON API over the existing `runner` (`runCorpus` / `inferConfig` / `--check` drift).
- **A managed-vault dashboard**: a registry of vaults (path + config) and a per-vault status surface (pass/fail, findings by contract, drift), with optional live updates.
- **Frictionless distribution**: GitHub Release binaries + Homebrew/Scoop/curl installers, alongside the unchanged npm package (v1 binaries unsigned).

## Inputs

- The downloaded **binary** (or `npm`/`npx` for library/CLI users).
- For the dashboard: **registered vault paths** and their configs (the daemon reads them; it never edits the docs).

```bash
markdown-contract validate docs/planning      # CLI face — unchanged
markdown-contract daemon --open               # UI face — opens the local dashboard
```

## Outputs

- **Validation status per vault** in the UI (and the same findings via the JSON API): green / findings / drift, drillable by contract.
- The familiar CLI outputs (human / JSON / SARIF) and exit codes — unchanged.

## Hook points

- **Library-deep, not engine-deep.** The UI/daemon route entirely through `runCorpus` / `inferConfig` ([[C-0003-corpus-cli]], [[C-0008-config-scaffolding]]); the engine and formats are untouched, so the dashboard grows as the library does.
- **Stable JSON API** as the seam — the same API a future **Tauri** desktop wrap or an OS-native UI would consume ([[D-0012-distribution-single-exec-and-web-ui]] § future directions).
- **Layered status** — registry (durable) / live status (in-memory) / history (optional SQLite) — so persistence can be added later without reshaping the UI ([[D-0012-distribution-single-exec-and-web-ui]] § vault tracking).

## Underlying implementation

- A single executable produced by **Bun `build --compile`** over the same sources, with the **Nuxt SPA (`ssr: false`) embedded** and served by a Nitro JSON API in `daemon` mode. The repo is a **Bun workspace orchestrated by moon** (`packages/core` + `apps/web`) per [[D-0010-monorepo-tooling]], adopted via [[T-MOON-adopt-moon-monorepo]].
- A new `daemon` consumer obeys the one-way layering (`daemon → runner/declarative`, never `core` internals), like the CLI.
- The runtime, UI shape, vault-tracking data model, channels, and the one packaging spike (embedding the SPA in the binary) are fixed by [[D-0012-distribution-single-exec-and-web-ui]]. Not yet built.

## Notes

- This is an extension of the CLI product ([[PR-0002-markdown-contract-cli]]) — the same offering, now distributed as a binary and gaining a UI face — over the canonical library ([[PR-0001-markdown-contract]]).
- Deliberately out of scope: multi-user/hosted service, auth, a Rust core, and a native (non-web) UI — the last two are recorded as future directions in [[D-0012-distribution-single-exec-and-web-ui]].
