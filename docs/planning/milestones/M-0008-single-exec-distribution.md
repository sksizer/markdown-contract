---
type: milestone
schema_version: '1'
id: M-0008
title: 'Single-binary prototype — one Bun executable: CLI + self-contained web-UI daemon'
status: open/planned
created: '2026-06-28'
related:
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
  - '[[D-0010-monorepo-tooling]]'
  - '[[M-0005-monorepo-tooling]]'
  - '[[M-0009-local-web-ui-vault-dashboard]]'
  - '[[C-0010-single-binary-and-vault-dashboard]]'
  - '[[PR-0002-markdown-contract-cli]]'
tasks:
  - '[[T-BMTX-bun-compile-matrix]]'
  - '[[T-DAEM-daemon-and-json-api]]'
  - '[[T-WEBU-nuxt-spa-ui]]'
  - '[[T-SPAE-spa-embed]]'
  - '[[T-DEMO-end-to-end-feasibility-demo]]'
  - '[[T-RELS-release-channels]]'
  - '[[T-INST-convenience-installer]]'
  - '[[T-UNSG-unsigned-install-notes]]'
tags:
  - distribution
  - packaging
  - cli
  - daemon
  - web-ui
  - nuxt
  - bun
  - single-binary
  - prototype
  - milestone
need_human_review: true
---

# Single-binary prototype — one Bun executable: CLI + self-contained web-UI daemon

## Summary

- A **working feasibility prototype** of the whole [[D-0012-distribution-single-exec-and-web-ui]]
  shape: one Bun-compiled binary that is *both* the `markdown-contract` CLI *and*, in
  `daemon` mode, a **self-contained local web UI** — a Nuxt SPA (`ssr: false`) compiled
  **into the same binary** and served over a thin JSON API on the loopback interface. Built on
  the workspace of [[D-0010-monorepo-tooling]] / [[M-0005-monorepo-tooling]], with the CI/build
  infrastructure to produce it and the distribution channels to ship it. ^summary
- This milestone is **primarily a prototype** — it proves the architecture end to end (a *fully
  illustrated example*: build the binary → run the CLI → run the daemon → open the embedded UI
  → validate a vault → see findings) rather than hardening it. The **production** vault
  dashboard (multi-vault registry, live SSE status, persisted history, polish) is
  [[M-0009-local-web-ui-vault-dashboard]], which now builds on this *proven* prototype instead
  of a paper plan.
- **One codebase, two faces, no fork.** The npm library + CLI stay the canonical, Node-ESM
  `packages/core` artifact ([[D-0010-monorepo-tooling]] D1), unchanged. The combined binary is
  an *additive* Bun target whose entry lives in `apps/web`, dispatching `daemon` → the server
  and every other argv → `packages/core`'s `runCli` — so layering stays one-way
  (`apps/web → packages/core`, `daemon → runner/declarative`) and no Bun-only API leaks into the
  published library.

```text
            ┌──── one codebase (Bun workspace · moon — D-0010 / M-0005) ─────┐
 core ◄ runner ◄┤ packages/core: library + CLI       apps/web: daemon + Nuxt SPA │
(engine)(corpus)└───────────────────────────────────────────────────────────────┘
       published ▼                  bun build --compile (apps/web/src/bin.ts) ▼
  npm Node ESM library          ──── ONE binary `markdown-contract` ────
  (canonical, unchanged)        ├─ CLI     →  markdown-contract validate …  (→ runCli)
                                └─ daemon  →  markdown-contract daemon
                                              └─ embedded Nuxt SPA + JSON API (Bun.serve)
```

## Outcome

A reviewer downloads (or builds) one file, runs `markdown-contract validate` exactly as the
npm bin, then runs `markdown-contract daemon`, opens `localhost` in a browser, points the
embedded UI at a markdown vault, and sees its validation findings — all from a single
self-contained executable, no Node toolchain, no separate UI download.

## Scope

**In**

- The **combined-binary entry** in `apps/web` and the `daemon` verb ([[T-DAEM-daemon-and-json-api]]).
- A **thin JSON API** over `runCorpus` / `inferConfig` (`/api/validate`, `/api/health`) on loopback.
- A **minimal Nuxt SPA** (`ssr: false`) that validates a vault and renders findings ([[T-WEBU-nuxt-spa-ui]]).
- **Embedding** the built SPA into the binary and serving it with no external files ([[T-SPAE-spa-embed]]) — the one packaging risk to de-risk.
- The **`bun build --compile` matrix** (macOS/Linux/Windows × x64/arm64) plus the **moon build graph and CI** (`build:web` → `compile`, both-faces smoke) ([[T-BMTX-bun-compile-matrix]]).
- **Distribution channels**: GitHub Releases + checksums ([[T-RELS-release-channels]]), at least one convenience installer ([[T-INST-convenience-installer]]), and unsigned-install notes ([[T-UNSG-unsigned-install-notes]]).
- The **end-to-end illustrated demo** that ties it together ([[T-DEMO-end-to-end-feasibility-demo]]).

**Out**

- The **production vault dashboard** — multi-vault flat-file registry, live in-memory status over SSE, file-watching, persisted SQLite history, and UI polish — [[M-0009-local-web-ui-vault-dashboard]] ([[D-0012-distribution-single-exec-and-web-ui]] §D3/§D4).
- **Signing / notarisation** — the prototype ships unsigned (Developer ID / Windows OV-EV deferred, [[D-0012-distribution-single-exec-and-web-ui]] §D5); only the override *notes* are in ([[T-UNSG-unsigned-install-notes]]).
- **Swapping `Bun.serve` for Nitro's `bun` preset** — recorded as the M-0009 productionization; the prototype uses `Bun.serve`.
- **Tauri shell, a Rust core, an OS-native UI** — recorded future directions ([[D-0012-distribution-single-exec-and-web-ui]] §D6/§D7), not built here.
- **The workspace split itself** — [[T-WKSP-bun-workspace-split]] / [[M-0005-monorepo-tooling]] own `packages/core` + the `apps/web` slot; this milestone fills that slot.

## Success criteria

- [ ] A single `bun build --compile` of `apps/web/src/bin.ts` produces a binary that runs the CLI (`validate`/`init`) identically to the npm bin **and** boots as `daemon`.
- [ ] Run as `daemon`, the binary serves the **embedded** Nuxt SPA over HTTP with **no external files**, and the SPA validates a vault via `/api/validate` and renders the findings.
- [ ] Cross-compiled binaries for macOS/Linux/Windows × x64/arm64 are produced from one host via moon tasks, and CI builds the host binary + runs a both-faces smoke check.
- [ ] Binaries are published on GitHub Releases with checksums, with at least one convenience installer and documented unsigned-install steps; the npm package is unchanged.
- [ ] A reproducible, illustrated end-to-end demo ([[T-DEMO-end-to-end-feasibility-demo]]) proves the full loop and states what is deferred to [[M-0009-local-web-ui-vault-dashboard]].
- [ ] Human review of the prototype scope and the M-0008 ↔ M-0009 boundary.

## Deliverables

The prototype is decomposed into eight tasks — the two binary faces, the embed, the build
matrix/CI, the illustrated demo, and the three distribution channels. All depend on the
workspace split [[T-WKSP-bun-workspace-split]] (the `packages/core` + `apps/web` layout) landing
first.

| # | Task | Delivers | Status |
|---|------|----------|--------|
| 1 | [[T-BMTX-bun-compile-matrix]] | The `bun build --compile` matrix + moon build graph + both-faces CI smoke | open/ready |
| 2 | [[T-DAEM-daemon-and-json-api]] | The combined-binary entry, `daemon` mode, and the JSON API over the runner | open/ready |
| 3 | [[T-WEBU-nuxt-spa-ui]] | The minimal Nuxt SPA (`ssr:false`) — validate a vault, render findings | open/ready |
| 4 | [[T-SPAE-spa-embed]] | Embed the built SPA into the binary; serve it with no external files | open/ready |
| 5 | [[T-DEMO-end-to-end-feasibility-demo]] | The fully illustrated end-to-end walkthrough (sample vault + demo script + doc) | open/ready |
| 6 | [[T-RELS-release-channels]] | GitHub Releases + SHA-256 checksums on a version tag | open/ready |
| 7 | [[T-INST-convenience-installer]] | At least one one-line installer over the Release artifacts | open/ready |
| 8 | [[T-UNSG-unsigned-install-notes]] | Per-OS Gatekeeper / SmartScreen override + checksum-verify notes | open/ready |

Build-order dependency chain: `T-WKSP → {T-DAEM, T-BMTX} → T-WEBU → T-SPAE → T-DEMO`, with
`T-SPAE → T-RELS → {T-INST, T-UNSG}` for distribution.

## Risks / open questions

- **SPA-in-binary embedding is the one real packaging risk.** Whole-*directory* asset
  embedding has known Bun gaps (oven-sh/bun#5445, #23852); the prototype embeds via the
  HTML-import / explicit `Bun.embeddedFiles` path ([[T-SPAE-spa-embed]]) and records the
  Deno-`compile` fallback ([[D-0012-distribution-single-exec-and-web-ui]] §D2). This is the
  task to land early — it gates the whole "two faces" claim.
- **`Bun.serve` vs Nitro for the daemon.** The prototype uses `Bun.serve` (fewest moving parts
  to prove the loop); Nitro's `bun` preset ([[D-0012-distribution-single-exec-and-web-ui]] §D3)
  is the M-0009 productionization. The riskiest unknown is the *client embed*, not the server
  framework, so this split keeps the feasibility signal honest.
- **Daemon verb & lifecycle.** The prototype fixes the verb as `daemon` with `--port`/`--open`,
  foreground-only, loopback-only. `serve`/`ui` naming and background/auto-start are M-0009.
- **Binary size.** Bun binaries are ~50–100 MB; acceptable for the prototype, flagged for
  M-0009 (a slimmer Deno build is the size-sensitive fallback).
- **Signing timeline.** The prototype is unsigned by decision; *when* the unsigned stance flips
  (who holds the Apple Developer ID / Windows OV-EV cert) is an open [[D-0012-distribution-single-exec-and-web-ui]] question, deferred.
- **Sequencing.** Every task assumes the post-[[T-WKSP-bun-workspace-split]] layout
  (`packages/core` + `apps/web`); the touchpoint paths resolve only once that split lands, so
  the workspace split is the hard prerequisite for picking any of these up.
- **Milestone status.** `open/planned`: the prototype is fully decomposed and the member tasks
  are `open/ready`, but none have started and the workspace split they depend on is not yet
  merged.

## Dependencies

- **The workspace split** — [[T-WKSP-bun-workspace-split]] ([[M-0005-monorepo-tooling]]) creates
  `packages/core` (library + CLI) and the `apps/web` slot the binary is built from. Hard
  prerequisite.
- **The moon / Bun toolchain** — [[T-MOON-adopt-moon-monorepo]] / [[D-0010-monorepo-tooling]];
  the compile matrix and build graph run as moon tasks.
- **The library API** — `runCorpus` ([[C-0003-corpus-cli]]) and `inferConfig`
  ([[C-0008-config-scaffolding]]) are the surfaces the JSON API is a thin adapter over; no
  engine change.

## References

- [[D-0012-distribution-single-exec-and-web-ui]] — the governing decision: single executable via
  Bun `build --compile` (§D2), one binary / two faces (§D3), vault tracking (§D4), distribution
  channels + unsigned-v1 (§D5), Tauri / Rust-core future (§D6/§D7).
- [[D-0010-monorepo-tooling]] / [[M-0005-monorepo-tooling]] — the Bun workspace + moon substrate;
  [[T-WKSP-bun-workspace-split]] is the `packages/core` + `apps/web` split this fills.
- [[M-0009-local-web-ui-vault-dashboard]] — the production vault dashboard this prototype proves
  the architecture for; [[C-0010-single-binary-and-vault-dashboard]] is the capability.
- [[PR-0002-markdown-contract-cli]] — the CLI product requirement the binary distributes.
- Bun — single-file executable & cross-compilation, embedding frontend assets:
  https://bun.com/docs/bundler/executables
- Nuxt — SPA (`ssr: false`) deployment: https://nuxt.com/docs/4.x/getting-started/deployment
