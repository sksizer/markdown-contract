---
type: decision
schema_version: '1'
id: D-0012
status: open/proposed
title: Distribution — single-executable CLI plus a bundled local web UI
created: '2026-06-28'
related:
  - '[[D-0010-monorepo-tooling]]'
  - '[[D-0006-packaging]]'
  - '[[C-0010-single-binary-and-vault-dashboard]]'
  - '[[PR-0002-markdown-contract-cli]]'
  - '[[C-0003-corpus-cli]]'
  - '[[C-0008-config-scaffolding]]'
  - '[[DR-0004-markdown-quality-cli]]'
tags:
  - distribution
  - packaging
  - cli
  - web-ui
  - daemon
  - bun
  - nuxt
  - tauri
need_human_review: true
---

# Distribution — single-executable CLI plus a bundled local web UI

## Summary

- Ship `markdown-contract` from **one codebase** as: the existing **npm library** (canonical, unchanged — [[D-0006-packaging]]) and **one self-contained executable** that is *both* the CLI and — in `daemon` mode — a **local web UI**. The Nuxt SPA is **compiled into that same binary** (not a separate download); the UI tracks several managed vaults and shows each one's validation status. ^summary
- **The library stays Node ESM and canonical.** The executable and the daemon are *additional build targets* compiled from the same sources; no engine rewrite, and the one-way layering (`cli → runner → core`) gains one more peer consumer (`daemon → runner/declarative`), never the reverse. The repo organization that builds them — a Bun workspace orchestrated by moon — is a separate, prior decision ([[D-0010-monorepo-tooling]]).
- **Single executable via Bun `build --compile`.** It is the only option that cross-compiles from a single host to **darwin/linux/windows × x64/arm64**, runs our Node ESM directly (bundling used `node_modules`), and has a first-class **Nitro `bun` preset** — so the daemon and the binary share one runtime. Deno `compile` is a viable fallback; Node SEA is rejected for cross-platform.
- **UI = Nuxt in SPA mode (`ssr: false`) + a Nitro JSON API** over the runner, **embedded in the binary**. Bun's `build --compile` bundles the built SPA's client assets into the executable (D2/D3), so `markdown-contract daemon` serves the UI straight from the binary — no SSR, no separate web server. This is also the exact decomposition a future **Tauri** shell wants (static frontend + a sidecar backend), so nothing here blocks that path.
- **Vault tracking is three layers, not one store.** A **flat-file registry** holds which vaults are managed (durable intent); **live per-vault status is in-memory + SSE**, refreshed on demand or by an optional file-watch (no database); **SQLite is only for persisted history/trends** (cheap under Bun, added when wanted). File-watching and SQLite are orthogonal — watching keeps in-memory status fresh; SQLite keeps a record.

## Context

[[D-0006-packaging]] commits the project to a standard Node ESM package that installs and runs under any package manager and any Node ≥ 20 — deliberately no Bun-only APIs in shipped library code. That decision is about the **library**. This decision is about **distribution of the tool**: making it trivial to *use* without a Node toolchain (a single downloadable binary) and giving it a **local web UI** so a user can manage and monitor several markdown vaults at once, not just run one-shot `validate` invocations. (How the repo is organized to build these — the workspace + task runner — is [[D-0010-monorepo-tooling]].)

Two needs drive it ([[DR-0004-markdown-quality-cli]], [[PR-0002-markdown-contract-cli]]):

1. **Frictionless install.** "Download one file and run it" — no `npm i -g`, no Node version juggling — across macOS, Linux, and Windows.
2. **A status surface for many vaults.** A user with several Obsidian-style vaults (each with its own `markdown-contract.yaml`) wants one place to see "are they all green?", drill into findings, and notice drift — the daemon + UI.

The enabling facts (verified, June 2026):

- The engine is **pure** and contract validation is already exposed as a library API: `runCorpus(config, opts) → { findings, exitCode }` and `inferConfig` ([[C-0003-corpus-cli]], [[C-0008-config-scaffolding]]). A web API is a thin HTTP layer over these — **no engine change**.
- **Bun** `build --compile` cross-compiles to `bun-{darwin,linux,windows}-{x64,arm64}` (plus musl) from any host, bundling + tree-shaking the app and its used `node_modules` into one ~50–100 MB binary with millisecond startup and no external deps; importing an HTML/asset entry embeds the frontend into that same binary.
- **Nuxt** `ssr: false` produces a SPA; **Nitro** (its server engine) ships a `bun` preset ("better optimizations") and a `node-server` preset (a standalone `.output` launching a ready-to-run server) — so we get Nuxt/Nitro conventions while serving a static client.

So the work is **distribution wiring and a thin server/UI**, not new engine machinery — and this decision fixes the runtime, the UI shape, the daemon's data model, and the release channels.

## Decision

### The shape

```text
            ┌──────── one codebase (Bun workspace · moon — D-0010) ──────────┐
 core ◄ runner ◄┤ packages/core: library + CLI      apps/web: daemon + Nuxt SPA │
(engine)(corpus)└────────────────────────────────────────────────────────────────┘
       published ▼                        bun build --compile (per OS/arch) ▼
  npm Node ESM library            ── ONE binary `markdown-contract` ──
  (canonical, D-0006)              ├─ CLI     →  markdown-contract validate …
                                   └─ daemon  →  markdown-contract daemon
                                                 └─ embedded Nuxt SPA + JSON API
                                   future: Tauri shell wraps this binary (sidecar)
```

The repo layout and task tooling behind this (a Bun workspace `packages/core` + `apps/web`, orchestrated by moon) are decided in [[D-0010-monorepo-tooling]]; this decision builds on it.

### D1 — The library stays Node-canonical; binaries are a build target

The library (engine + runner + declarative + the CLI bin) remains the Node ESM package of [[D-0006-packaging]], built with `tsc` and published to npm; `npm i -g markdown-contract` / `npx markdown-contract` keep working. The single-executable is produced by a **separate, additive** build step (Bun) over the same sources. The shipped *library* code keeps avoiding runtime-specific APIs; any Bun-only conveniences (e.g. `bun:sqlite`) live only in the **daemon/binary build**, never in the published library. This preserves D-0006 verbatim and keeps the executable a packaging concern, not an architecture pivot.

### D2 — Single executable via Bun `build --compile`

Cross-compile the CLI entry to every target from one CI host:

```sh
bun build --compile --target=bun-darwin-arm64  <cli-entry> --outfile dist/bin/markdown-contract-darwin-arm64
bun build --compile --target=bun-linux-x64     <cli-entry> --outfile dist/bin/markdown-contract-linux-x64
bun build --compile --target=bun-windows-x64   <cli-entry> --outfile dist/bin/markdown-contract-windows-x64.exe
# …darwin-x64, linux-arm64, windows-arm64
```

Bun runs our Node ESM directly, so the binary is the same code paths as the npm CLI. Crucially, **the same compile embeds the web UI** (the answer to "can we compile the Nuxt SPA into the CLI binary?" — yes): importing the built SPA's HTML entry makes Bun bundle the client JS/CSS into the executable and serve it with correct MIME types, and `with { type: "file" }` / `Bun.embeddedFiles` cover any explicit assets. So a single `bun build --compile` of the CLI entry — which pulls in the daemon, which imports the SPA — yields **one binary = CLI + daemon + embedded UI**, no separate UI artifact (D3). Whole-*directory* asset embedding still has rough edges in Bun (issues #5445/#23852), so the SPA is embedded via an HTML/explicit-file entry — the one integration spike to de-risk first (Open questions). Deno `compile` is the documented **fallback** (also cross-compiles, npm support since Deno 2) if Bun proves unsuitable; **Node SEA is rejected** for first-class cross-platform (see Options).

### D3 — One binary, two faces: CLI + an embedded-SPA daemon

- **There is a *single* compiled executable.** Run as a CLI (`markdown-contract validate …`) it behaves exactly as today; run as `markdown-contract daemon` it boots a **local, single-user, localhost** server that serves the **Nuxt SPA bundled into the binary** plus a **JSON API**. The SPA is compiled *into* this binary (D2) — no separate UI download, no external web server, nothing to point a browser at but `localhost`.
- **The daemon is a `runner`/`declarative` consumer** (code in `apps/web` — [[D-0010-monorepo-tooling]]): its API handlers call `runCorpus` / `inferConfig` / the `--check` drift logic, obeying the same one-way layering as the CLI; it never reaches into `core` internals.
- **Nitro is the daemon's HTTP layer** (Nuxt/Nitro conventions for cheap), built with the **`bun` preset** so the server shares the binary's Bun runtime. `ssr: false` → the client is a **static SPA**; Nitro serves the embedded client + the `/api` routes. No SSR.
- The verb name is TBD (`daemon` vs `serve` vs `ui`); flags `--port`, `--open`.
- API sketch (thin over the library): `GET /api/vaults` (registry + last status), `POST /api/vaults` (register a path+config), `POST /api/vaults/:id/validate` (run → findings), `GET /api/vaults/:id/check` (drift, via `init --check`), optional `GET /api/events` (SSE) for live status when watching is enabled.

### D4 — Vault tracking: registry (file) · live status (memory) · history (SQLite, later)

Three distinct concerns, deliberately not collapsed into one store:

- **Registry — which vaults + which config.** Durable *intent*. A flat file under the OS config dir (`$XDG_CONFIG_HOME/markdown-contract/`, `~/Library/Application Support/markdown-contract/`, `%APPDATA%\markdown-contract\`). Human-editable; the source of truth.
- **Live status — current pass/fail + findings per vault.** *Derived*, held **in memory** by the long-running daemon and pushed to the UI over **SSE**. Computed by `runCorpus` / `init --check` on demand, on refresh, or (optionally) on a **file-watch** event. Needs a watcher + in-memory state — **not a database**.
- **History / trends — status over time.** The *only* layer that wants a store: a **SQLite** layer (cheap under Bun via built-in `bun:sqlite`, no native dep) persists run history for timelines and "when did it go red", surviving restarts. Optional and additive, layered over the registry.

File-watching and SQLite are **orthogonal**: watching keeps the in-memory live status fresh with zero persistence; SQLite is for keeping a *record*. So live, file-watched status is a DB-free feature; the database is purely a history concern. Full comparison in Options considered.

### D5 — Distribution channels

- **npm** (Node) — unchanged, canonical for library consumers and `npx`.
- **GitHub Releases** — per-OS/arch binaries from the Bun matrix, with checksums.
- **Convenience installers** — Homebrew tap + Scoop/winget manifest + a `curl … | sh` script, all pointing at the Release binaries.
- **Signing — v1 ships unsigned.** Early binaries are unsigned, with per-OS install notes for the one-time Gatekeeper/SmartScreen override. Developer ID + notarisation (macOS) and a Windows OV/EV cert are a deliberate, deferred follow-up (and largely handled later by Tauri's tooling — D6).

### D6 — Tauri is a clean forward path, not designed-for now

A static SPA + a standalone daemon binary is exactly Tauri's model: Tauri shell + our Nuxt SPA as the webview + the Bun-compiled daemon as a **sidecar**. So the Tauri wrap reuses everything here and needs no Rust reimplementation of the engine *for the wrap itself* (a Rust core may still come later for performance — D7). We note it and stop; we do not build for it yet.

### D7 — Noted future directions (recorded, not designed here)

- **A Rust core, for performance.** The engine may later be reimplemented in Rust — a rewrite, or a parallel implementation behind the same contract semantics and findings — if validation throughput on very large vaults warrants it. This is a polyglot driver that *reinforces the monorepo tooling choice* ([[D-0010-monorepo-tooling]]). It changes nothing here: the JS library stays canonical (D1) unless and until that work is justified, and the daemon/UI keep talking to whichever core implements the contract.
- **An OS-native UI, on demand.** If a true native desktop app is wanted beyond a Tauri-wrapped web UI, that is a later, demand-driven option. The single-binary daemon + static SPA over a stable JSON API keeps *both* the Tauri path (D6) and a native-UI-over-the-same-API path open.

Both are explicitly out of scope now (Out of scope); they are recorded so the architecture stays compatible with them.

## Why

- **One codebase, two artifacts, no fork.** Keeping the library Node-canonical (D1) and treating the single binary (CLI + embedded-SPA daemon) as a build target means the engine, the CLI, and the UI all run the *same* validated `runner`/`core` code — no second implementation to drift.
- **Bun is the only single-command cross-platform story** that also matches our stack: it runs Node ESM as-is (so D-0006 holds), targets all six OS/arch combos from one host, embeds the SPA into the binary, and shares its runtime with Nitro's `bun` preset and `bun:sqlite` — collapsing "binary runtime", "daemon runtime", and "embedded DB" into one choice.
- **SPA over SSR is correct for a local tool.** There is no SEO or first-paint argument for a localhost dashboard; SSR only adds in-binary weight and surface. `ssr: false` still gives the Nuxt/Nitro DX.
- **Flat-file-first keeps the engine's statelessness honest.** The registry is small, human-editable, and recomputable, and live status is just in-memory + SSE; we add the database only when *persisted history* earns its complexity — and even then it's a zero-dep `bun:sqlite` store, not a new deployment dependency.
- **The UI is library-deep, not engine-deep.** Because everything routes through `runCorpus`/`inferConfig`, the daemon is a thin, testable HTTP adapter — and the layering rule keeps it that way.

## Consequences

- **A bundler enters CI.** A release matrix runs `bun build --compile` per target (and `tsc` for npm), driven by the moon tasks of [[D-0010-monorepo-tooling]]. Binaries are 50–100 MB and start in ms.
- **Code-signing is a known deferred cost.** v1 ships **unsigned** (D5): users hit a one-time macOS Gatekeeper / Windows SmartScreen prompt and override it per documented install steps. Signing later means Developer ID + notarisation (macOS) and a Windows OV/EV cert (~$200–700/yr) — eased by Tauri's tooling when that path lands.
- **The UI/daemon are built in `apps/web`.** The repo is organized as a Bun workspace orchestrated by moon ([[D-0010-monorepo-tooling]]); the binary + UI are additive targets there. The library's own `tsc`/`vitest` flow is unchanged.
- **A new persisted surface to design and migrate.** Even the flat-file registry needs a schema, a location convention, and forward-compatible versioning; SQLite later adds migrations.
- **New consumer, same rules.** `daemon` must obey `→ runner/declarative` only; a peer test and the dogfood layering check should cover it. The daemon's API contract (routes, payloads) becomes a thing to version.
- **Security posture.** The daemon binds localhost, single-user; still, it executes file reads over arbitrary registered paths and should refuse non-loopback binds by default and treat vault paths as untrusted input.

## Options considered

### Single-executable runtime — Bun (chosen) vs Deno vs Node SEA

| | **Bun `build --compile`** (chosen) | Deno `compile` | Node SEA |
|---|---|---|---|
| Cross-compile from one host | **Yes**, all targets, one command | Yes (downloads target runtime) | **No** — build per-target env / Docker matrix; code-cache must be off cross-platform |
| Targets | darwin/linux/windows × x64/arm64 (+musl) | linux gnu x64/arm64, windows x64, darwin x64/arm64 (**no win-arm64**) | whatever you can build on |
| Node/npm fidelity | Runs our Node ESM directly, bundles `node_modules` | npm support since Deno 2; occasional node-compat edges | Native (it *is* Node) |
| Frontend embedding | HTML/asset import → bundled into the binary | manual | manual |
| Daemon/DB synergy | Nitro **`bun` preset** + built-in **`bun:sqlite`** | No first-class Nitro preset; KV/sqlite separate | node:sqlite (newer); Nitro `node-server` |
| Binary size / startup | ~50–100 MB / ms | ~45 MB | varies |
| Verdict | **Best fit** for cross-platform + our stack | Viable fallback | Rejected for cross-platform reach |

### UI rendering — SPA `ssr:false` (chosen) vs full Nitro SSR

SPA ships a static client + a Nitro JSON API: simplest to embed in one binary, lowest runtime surface, and Tauri-portable. SSR would server-render pages — irrelevant for a localhost tool and heavier to compile into a single executable. Chosen: **SPA**, keeping Nitro purely as the API/daemon layer.

### Vault tracking — three layers (registry / live status / history)

| Layer | Mechanism | In v1? | Why |
|---|---|---|---|
| Registry — which vaults + config | flat file in OS config dir (JSON/YAML) | yes | durable intent; human-editable source of truth |
| Live status — current pass/fail + findings | in-memory in the daemon, pushed via SSE; refreshed on demand or by optional file-watch | yes | a long-lived process needs no DB to hold current state |
| History — status/findings over time | SQLite (`bun:sqlite`, zero extra dep) | later | the only layer that needs persistence; enables trends/timelines |

Recommendation: ship the registry + in-memory live status in v1 (file-watching optional, also DB-free); add SQLite only when persisted history/trends are wanted. **File-watching and SQLite are independent.**

### Library posture — additive binary (chosen) vs Bun/Deno-first pivot

Rejected the pivot: making the compiled binary primary would risk runtime-specific APIs leaking into shipped library code and reopen [[D-0006-packaging]] for no gain. The binary is a *consumer-facing convenience*; the library remains the canonical, runtime-neutral artifact.

*(The monorepo task-runner choice — moon vs Turborepo vs Nx — and the Bun-vs-pnpm package layer are decided in [[D-0010-monorepo-tooling]], not here.)*

## Open questions

- **SPA-in-binary embedding (the one packaging spike)** — validate Bun's HTML/explicit-file embedding of the built Nuxt client into the CLI binary end to end (whole-*directory* embedding has known gaps, #5445/#23852). De-risk before committing to the workspace split.
- **Daemon verb & lifecycle** — `daemon` vs `serve` vs `ui` (undecided); foreground-only for v1 or background/auto-start (launchd/systemd/Task Scheduler); port selection + `--open`.
- **File-watching in v1?** — live status is in-memory + SSE either way (no DB, per D4); the only question is whether v1 ships the watcher for push-on-change or starts with on-demand/refresh and adds watching later.
- **Signing timeline** — *when* the unsigned-v1 stance flips: who holds the Apple Developer ID and the Windows OV/EV cert, and at which release notarisation enters the pipeline.
- **API/registry versioning** — version the registry file and the JSON API from the first release.
- **Binary size** — is ~50–100 MB acceptable, or do we want a slimmer Deno build for size-sensitive contexts?

## Out of scope

- **The Tauri desktop app** — acknowledged as the forward path (D6); not built or designed here beyond keeping the SPA + sidecar shape compatible.
- **A Rust core reimplementation and an OS-native UI** — recorded as future directions (D7); not designed or built here. The architecture stays compatible with both (stable contract semantics + a stable JSON API).
- **Monorepo tooling** — the workspace layout and task runner are [[D-0010-monorepo-tooling]], not this decision.
- **Multi-user / networked / hosted service** — the daemon is local, single-user, loopback-only. A hosted SaaS is a separate decision.
- **Auth, RBAC, remote vaults** — out by virtue of localhost single-user.
- **Engine/format changes** — none; this is distribution and a thin adapter over existing library APIs ([[C-0003-corpus-cli]], [[C-0008-config-scaffolding]]).
- **Auto-update** — deferred (and largely a Tauri-era concern).

## References

- Bun — Single-file executable & cross-compilation (embeds frontend assets via HTML import / `with { type: "file" }` / `Bun.embeddedFiles`): https://bun.com/docs/bundler/executables
- Bun — cross-compiling executables (overview): https://developer.mamezou-tech.com/en/blogs/2024/05/20/bun-cross-compile/
- Bun — embedding a Vite/Vue SPA into a single binary (worked example): https://dev.to/calumk/using-bun-compilebuild-to-embed-an-express-vite-vue-application-1e41
- Bun — directory-embedding gaps (spike risk): https://github.com/oven-sh/bun/issues/5445
- Deno — `deno compile` (npm support, `--target` cross-compile): https://docs.deno.com/runtime/reference/cli/compile/
- Deno 1.34 — compile supports npm packages: https://deno.com/blog/v1.34
- Node.js — Single executable applications (cross-platform caveats): https://nodejs.org/api/single-executable-applications.html
- Node.js SEA in 2026 (signing, limitations): https://www.hirenodejs.com/blog/nodejs-single-executable-applications-2026
- Nitro — Bun runtime/preset: https://nitro.build/deploy/runtimes/bun
- Nitro — Node server preset: https://nitro.build/deploy/node
- Nuxt — Deployment (SPA `ssr:false`, presets): https://nuxt.com/docs/4.x/getting-started/deployment
- Nuxt — Rendering modes: https://nuxt.com/docs/4.x/guide/concepts/rendering
- Internal: [[D-0010-monorepo-tooling]] (workspace + moon, the build substrate), [[D-0006-packaging]] (Node ESM library), [[C-0003-corpus-cli]] (runner/CLI API), [[C-0008-config-scaffolding]] (`init`/`--check`), [[C-0010-single-binary-and-vault-dashboard]], [[PR-0002-markdown-contract-cli]], [[DR-0004-markdown-quality-cli]]
