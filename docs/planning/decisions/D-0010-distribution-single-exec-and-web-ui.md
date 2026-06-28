---
type: decision
schema_version: '1'
id: D-0010
status: open/proposed
title: Distribution — single-executable CLI plus a bundled local web UI
created: '2026-06-27'
related:
  - '[[D-0006-packaging]]'
  - '[[PR-0002-markdown-contract-cli]]'
  - '[[C-0003-corpus-cli]]'
  - '[[DR-0004-markdown-quality-cli]]'
  - '[[C-0008-config-scaffolding]]'
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

- Ship `markdown-contract` three ways from **one codebase**: the existing **npm library** (canonical, unchanged — [[D-0006-packaging]]), a **single self-contained executable** for the CLI, and a **local web UI** the same binary serves in a `daemon` mode. The UI tracks several managed vaults and shows each one's validation status. ^summary
- **The library stays Node ESM and canonical.** The executable and the daemon are *additional build targets* compiled from the same `src/`; no engine rewrite, and the one-way layering (`cli → runner → core`) gains one more peer consumer (`daemon → runner/declarative`), never the reverse.
- **Single executable via Bun `build --compile`.** It is the only option that cross-compiles from a single host to **darwin/linux/windows × x64/arm64**, runs our Node ESM directly (bundling used `node_modules`), and has a first-class **Nitro `bun` preset** — so the daemon and the binary share one runtime. Deno `compile` is a viable fallback; Node SEA is rejected for cross-platform.
- **UI = Nuxt in SPA mode (`ssr: false`) + a Nitro JSON API** over the runner. Static client, no SSR; Nitro is kept only for its server-route/conventions value as the daemon's HTTP layer. This is also the exact decomposition a future **Tauri** shell wants (static frontend + a sidecar backend), so nothing here blocks that path.
- **Vault tracking is three layers, not one store.** A **flat-file registry** holds which vaults are managed (durable intent); **live per-vault status is in-memory + SSE**, refreshed on demand or by an optional file-watch (no database); **SQLite is only for persisted history/trends** (cheap under Bun, added when wanted). File-watching and SQLite are orthogonal — watching keeps in-memory status fresh; SQLite keeps a record.

## Context

[[D-0006-packaging]] commits the project to a standard Node ESM package that installs and runs under any package manager and any Node ≥ 20 — deliberately no Bun-only APIs in shipped library code. That decision is about the **library**. This decision is about **distribution of the tool**: making it trivial to *use* without a Node toolchain (a single downloadable binary) and giving it a **local web UI** so a user can manage and monitor several markdown vaults at once, not just run one-shot `validate` invocations.

Two needs drive it ([[DR-0004-markdown-quality-cli]], [[PR-0002-markdown-contract-cli]]):

1. **Frictionless install.** "Download one file and run it" — no `npm i -g`, no Node version juggling — across macOS, Linux, and Windows.
2. **A status surface for many vaults.** A user with several Obsidian-style vaults (each with its own `markdown-contract.yaml`) wants one place to see "are they all green?", drill into findings, and notice drift — the daemon + UI.

The enabling facts (verified, June 2026):

- The engine is **pure** and contract validation is already exposed as a library API: `runCorpus(config, opts) → { findings, exitCode }` and `inferConfig` ([[C-0003-corpus-cli]], [[C-0008-config-scaffolding]]). A web API is a thin HTTP layer over these — **no engine change**.
- **Bun** `build --compile` cross-compiles to `bun-{darwin,linux,windows}-{x64,arm64}` (plus musl) from any host, bundling + tree-shaking the app and its used `node_modules` into one ~50–100 MB binary with millisecond startup and no external deps.
- **Nuxt** `ssr: false` produces a SPA; **Nitro** (its server engine) ships a `bun` preset ("better optimizations") and a `node-server` preset (a standalone `.output` launching a ready-to-run server) — so we get Nuxt/Nitro conventions while serving a static client.

So the work is **distribution wiring and a thin server/UI**, not new engine machinery — and this decision fixes the runtime, the UI shape, the daemon's data model, and the release channels.

## Decision

### The shape

```text
                         ┌─────────────── one codebase (src/) ───────────────┐
   core  ◄── runner ◄────┤  cli (today)         daemon (new)                  │
 (engine)  (corpus API)  │   argv→runner→exit    HTTP/JSON over runner + SPA  │
                         └────────────────────────────────────────────────────┘
        published as ▼            compiled as ▼                 served by ▼
   npm Node ESM library     Bun single-exec (per OS/arch)   Nuxt SPA (ssr:false)
   (canonical, D-0006)      `markdown-contract` binary       + Nitro JSON API
                                  │  daemon mode  ─────────────────┘
                                  ▼
                       future: Tauri shell + daemon-as-sidecar
```

### D1 — The library stays Node-canonical; binaries are a build target

`src/` remains the Node ESM library of [[D-0006-packaging]], built with `tsc` and published to npm; `npm i -g markdown-contract` / `npx markdown-contract` keep working. The single-executable is produced by a **separate, additive** build step (Bun) over the same sources. The shipped *library* code keeps avoiding runtime-specific APIs; any Bun-only conveniences (e.g. `bun:sqlite`) live only in the **daemon/binary build**, never in the published library. This preserves D-0006 verbatim and keeps the executable a packaging concern, not an architecture pivot.

### D2 — Single executable via Bun `build --compile`

Cross-compile the CLI entry to every target from one CI host:

```sh
bun build --compile --target=bun-darwin-arm64  src/cli/index.ts --outfile dist/bin/markdown-contract-darwin-arm64
bun build --compile --target=bun-linux-x64     src/cli/index.ts --outfile dist/bin/markdown-contract-linux-x64
bun build --compile --target=bun-windows-x64   src/cli/index.ts --outfile dist/bin/markdown-contract-windows-x64.exe
# …darwin-x64, linux-arm64, windows-arm64
```

Bun runs our Node ESM directly, so the binary is the same code paths as the npm CLI. Deno `compile` is the documented **fallback** (also cross-compiles, npm support since Deno 2) if Bun proves unsuitable; **Node SEA is rejected** for first-class cross-platform (see Options). The comparison is in Options considered.

### D3 — Daemon + UI: Nuxt SPA + Nitro JSON API over the runner

- A new **`daemon` consumer** (in the `apps/web` workspace package — see D7) starts a **local, single-user, localhost** HTTP server and serves a **Nuxt SPA (`ssr: false`)** plus a **JSON API** whose handlers call `runCorpus` / `inferConfig` / the `--check` drift logic. It imports `runner` + `declarative` only — the same one-way layering the CLI obeys; it never reaches into `core` internals.
- **Nitro is the daemon's HTTP layer** (the user's ask: Nuxt/Nitro conventions for cheap), built with the **`bun` preset** so the server and the compiled binary share the Bun runtime. The client is **static** (SPA), embedded in / served by the binary; no SSR.
- The verb: `markdown-contract daemon [--port N] [--open]` boots the server; the binary therefore *is* the app. (Name TBD — `daemon` vs `serve` vs `ui`.)
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

A static SPA + a standalone daemon binary is exactly Tauri's model: Tauri shell + our Nuxt SPA as the webview + the Bun-compiled daemon as a **sidecar**. So the Tauri wrap reuses everything here and needs no Rust reimplementation of the JS engine. We note it and stop; we do not build for it yet.

### D7 — A Bun workspace (`packages/core` + `apps/web`) orchestrated by moon

Split the single package into a workspace. **`packages/core`** is today's Node ESM library (engine + runner + declarative + the CLI bin) — the canonical npm artifact of D1, with its `tsc`/`vitest` flow unchanged. **`apps/web`** is the Nuxt SPA + Nitro daemon that depends on it (the D3 `daemon` consumer lives here; a sibling `apps/daemon` can split out later if the server outgrows the Nuxt app). **Bun workspaces** are the package layer — consistent with the chosen compile runtime (D2) and the existing `bun.lock` — keeping one lockfile across library, binary, and UI.

On top of the workspace, **[moon](https://moonrepo.dev) is the task runner + toolchain manager**: it models the cross-project task graph (build / typecheck / test / `lint:docs`, later the Nuxt build and the `bun build --compile` matrix), caches by inputs/outputs, and **pins the Bun/Node versions** for every dev and CI run — reproducibility that directly serves the cross-compiled binary (D2). moon over Bun composes cleanly (moon enables its `javascript` + `bun` toolchains and respects `package.json` workspaces). The decisive reason over the TS-native runners is **polyglot reach**: when the Tauri shell (D6) adds Rust, moon keeps the TS library, the Nuxt app, and the Rust crate in one dependency graph — Turborepo and Nx are JavaScript-centric. Cost: a smaller community, and moon v2 ("Phobos", May 2026) is a recent rearchitecture (pin a version). **Turborepo is the fallback** if the project ever drops the Rust/Tauri path and stays TS-only. Adoption is tracked by [[T-MOON-adopt-moon-monorepo]].

## Why

- **One codebase, three artifacts, no fork.** Keeping the library Node-canonical (D1) and treating the binary/daemon as build targets means the engine, the CLI, and the UI all run the *same* validated `runner`/`core` code — no second implementation to drift.
- **Bun is the only single-command cross-platform story** that also matches our stack: it runs Node ESM as-is (so D-0006 holds), targets all six OS/arch combos from one host, and shares its runtime with Nitro's `bun` preset and `bun:sqlite` — collapsing "binary runtime", "daemon runtime", and "embedded DB" into one choice.
- **SPA over SSR is correct for a local tool.** There is no SEO or first-paint argument for a localhost dashboard; SSR only adds in-binary weight and surface. `ssr: false` still gives the Nuxt/Nitro DX the user asked for.
- **Flat-file-first keeps the engine's statelessness honest.** The registry is small, human-editable, and recomputable, and live status is just in-memory + SSE; we add the database only when *persisted history* earns its complexity — and even then it's a zero-dep `bun:sqlite` store, not a new deployment dependency.
- **The UI is library-deep, not engine-deep.** Because everything routes through `runCorpus`/`inferConfig`, the daemon is a thin, testable HTTP adapter — and the layering rule keeps it that way.

## Consequences

- **A bundler enters CI.** A release matrix runs `bun build --compile` per target (and `tsc` for npm). Binaries are 50–100 MB and start in ms.
- **Code-signing is a known deferred cost.** v1 ships **unsigned** (D5): users hit a one-time macOS Gatekeeper / Windows SmartScreen prompt and override it per documented install steps. Signing later means Developer ID + notarisation (macOS) and a Windows OV/EV cert (~$200–700/yr) — eased by Tauri's tooling when that path lands.
- **The repo becomes a Bun workspace.** `packages/core` (library) + `apps/web` (Nuxt SPA + daemon), one lockfile/toolchain (D7). The library's own `tsc`/`vitest` flow is unchanged; the repo gains a second, isolated app build. (The untracked `bun.lock` already anticipates this.)
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

Recommendation: ship the registry + in-memory live status in v1 (file-watching optional, also DB-free); add SQLite only when persisted history/trends are wanted. **File-watching and SQLite are independent** — the earlier framing that coupled them was wrong (corrected in D4).

### Monorepo task runner — moon (chosen) vs Turborepo vs Nx

| | **moon** (chosen) | Turborepo | Nx |
|---|---|---|---|
| Language reach | Polyglot (JS/TS, **Rust**, Go, …) | JS/TS-centric | JS/TS-centric (+ plugins) |
| Toolchain pinning | **Built-in** (pins Bun/Node per repo) | external (you pin) | external (you pin) |
| Bun support | First-class toolchain (v2) | works (as PM) | works (as PM) |
| Footprint / community | Rust core; smaller (~50K/wk) | simple; large (~2M/wk) | feature-rich/heavy; largest (~5M/wk) |
| Fit here | Tauri/Rust future + reproducible cross-compile | best *if TS-only* | overkill at 2–3 packages |

Chosen **moon** for polyglot reach (the Rust/Tauri future, D6) and built-in toolchain reproducibility (matters for the cross-compiled binary, D2). **Turborepo** is the fallback if the repo stays TS-only; **Nx** is rejected as overkill at this size.

### Library posture — additive binary (chosen) vs Bun/Deno-first pivot

Rejected the pivot: making the compiled binary primary would risk runtime-specific APIs leaking into shipped library code and reopen [[D-0006-packaging]] for no gain. The binary is a *consumer-facing convenience*; the library remains the canonical, runtime-neutral artifact.

## Open questions

- **Daemon verb & lifecycle** — `daemon` vs `serve` vs `ui` (undecided); foreground-only for v1 or background/auto-start (launchd/systemd/Task Scheduler); port selection + `--open`.
- **File-watching in v1?** — live status is in-memory + SSE either way (no DB, per D4); the only question is whether v1 ships the watcher for push-on-change or starts with on-demand/refresh and adds watching later.
- **Signing timeline** — *when* the unsigned-v1 stance flips: who holds the Apple Developer ID and the Windows OV/EV cert, and at which release notarisation enters the pipeline.
- **API/registry versioning** — version the registry file and the JSON API from the first release.
- **Binary size** — is ~50–100 MB acceptable, or do we want a slimmer Deno build for size-sensitive contexts?

## Out of scope

- **The Tauri desktop app** — acknowledged as the forward path (D6); not built or designed here beyond keeping the SPA + sidecar shape compatible.
- **Multi-user / networked / hosted service** — the daemon is local, single-user, loopback-only. A hosted SaaS is a separate decision.
- **Auth, RBAC, remote vaults** — out by virtue of localhost single-user.
- **Engine/format changes** — none; this is distribution and a thin adapter over existing library APIs ([[C-0003-corpus-cli]], [[C-0008-config-scaffolding]]).
- **Auto-update** — deferred (and largely a Tauri-era concern).

## References

- Bun — Single-file executable & cross-compilation: https://bun.com/docs/bundler/executables
- Bun — cross-compiling executables (overview): https://developer.mamezou-tech.com/en/blogs/2024/05/20/bun-cross-compile/
- Deno — `deno compile` (npm support, `--target` cross-compile): https://docs.deno.com/runtime/reference/cli/compile/
- Deno 1.34 — compile supports npm packages: https://deno.com/blog/v1.34
- Node.js — Single executable applications (cross-platform caveats): https://nodejs.org/api/single-executable-applications.html
- Node.js SEA in 2026 (signing, limitations): https://www.hirenodejs.com/blog/nodejs-single-executable-applications-2026
- Nitro — Bun runtime/preset: https://nitro.build/deploy/runtimes/bun
- Nitro — Node server preset: https://nitro.build/deploy/node
- Nuxt — Deployment (SPA `ssr:false`, presets): https://nuxt.com/docs/4.x/getting-started/deployment
- Nuxt — Rendering modes: https://nuxt.com/docs/4.x/guide/concepts/rendering
- moon — task runner + toolchain: https://moonrepo.dev/moon
- moon — Bun handbook: https://moonrepo.dev/docs/guides/javascript/bun-handbook
- moon — v2.0 ("Phobos") release: https://www.infoq.com/news/2026/05/moonrepo-2-release/
- Monorepo tools compared (Turborepo vs Nx vs moon, 2026): https://www.pkgpulse.com/guides/turborepo-vs-nx-vs-moon-2026
- Internal: [[D-0006-packaging]] (Node ESM library), [[C-0003-corpus-cli]] (runner/CLI API), [[C-0008-config-scaffolding]] (`init`/`--check`), [[PR-0002-markdown-contract-cli]], [[DR-0004-markdown-quality-cli]], [[T-MOON-adopt-moon-monorepo]]
