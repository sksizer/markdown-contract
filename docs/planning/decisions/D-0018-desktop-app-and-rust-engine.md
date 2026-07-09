---
type: decision
schema_version: '1'
id: D-0018
status: open/proposed
title: Desktop app (Tauri + Nuxt) and a matched Rust engine over a shared corpus
created: '2026-07-09'
related:
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
  - '[[D-0010-monorepo-tooling]]'
  - '[[D-0008-declarative-contract-dsl]]'
  - '[[D-0001-finding-model]]'
  - '[[C-0010-single-binary-and-vault-dashboard]]'
tags:
  - desktop
  - tauri
  - rust
  - nuxt
  - corpus
  - ontogen
  - distribution
need_human_review: true
---

# Desktop app (Tauri + Nuxt) and a matched Rust engine over a shared corpus

## Summary

- Ship a **desktop application** (`apps/desktop`) — a Tauri v2 shell around a Nuxt 4
  SPA, instantiated from [template-tauri-nuxt](https://github.com/sksizer/template-tauri-nuxt)
  and adapted to this workspace's Bun + moon conventions ([[D-0010-monorepo-tooling]]).
  It manages multiple tracked vaults with scan-on-change, scheduled scans, desktop
  notifications, a system tray, and "open in …" (Obsidian, VS Code, …) via
  [path-opener](https://github.com/sksizer/rust-path-opener). ^summary
- The desktop app validates **natively** through a **matched Rust engine**
  (`crates/markdown-contract-engine`) that implements the declarative validation
  plane of [[D-0008-declarative-contract-dsl]] — the same contract YAML, the same
  finding ids, levels, positions, and deterministic ordering as the TypeScript
  engine ([[D-0001-finding-model]]). The TS package stays canonical on npm; the
  Rust crate is **wasm-ready** (fs-free core) so the TS validate path can later
  delegate to the same engine.
- Parity is enforced by **sharing the fixture corpus**: expected findings move out
  of the TS fixture modules into **language-neutral golden peers**
  (`*.expected.json`) beside the existing `.md` inputs and `.contract.yaml` peers.
  Both harnesses assert against the same files; fixtures that need programmatic
  (JS) escapes are marked TS-only.
- The desktop service/model layer is generated with the **full
  [ontogen](https://github.com/sksizer/rust-ontogen) pipeline**: annotated Rust
  entities → SeaORM store (SQLite scan history — the layer [[D-0012-distribution-single-exec-and-web-ui]]
  deferred) → API layer → **Tauri IPC + Axum HTTP transports + TypeScript
  bindings**, so the binary daemon UI and the desktop UI converge on one service
  surface.
- The Vue **component kit is extracted to `packages/ui`** and consumed by both the
  binary-embedded SPA (`apps/web/ui`) and the desktop frontend, carrying the
  shared desktop-metaphor visual language (status/severity tokens, vault cards,
  finding rows) to both faces.

## Context

[[D-0012-distribution-single-exec-and-web-ui]] fixed the "one binary, two faces"
shape and explicitly recorded two forward paths it did not build: **D6 — a Tauri
desktop shell** over the same static-SPA + JSON-API decomposition, and **D7 — a
Rust core**. It also deferred history/persistence (SQLite) and scheduling. This
decision picks those paths up.

What exists today:

- `apps/web` — the loopback Bun daemon: flat-file vault registry, in-memory
  status + SSE, per-vault recursive file-watch, and a JSON API over `runCorpus`;
  `apps/web/ui` is the productionized Nuxt SPA embedded into the binary.
- `packages/core` — the engine. Its declarative v1 vocabulary (structure plane,
  content leaves, closed schema set, text constraints) covers ~88% of the
  65-fixture corpus; the remainder needs programmatic `rule`/`docRule` or Zod
  escapes. Findings are a stable, JSON-serializable shape with a severity
  registry and a deterministic sort — an interchange format a second engine can
  be held to.
- The fixture corpus already keeps inputs as verbatim `.md` peers and contracts
  as `.contract.yaml` peers; only the **expected findings** live inside TS
  fixture modules, which is the one obstacle to sharing it across languages.
- `template-tauri-nuxt` provides a working Tauri v2 + Nuxt 4 (SPA, `ssr: false`)
  desktop shell with CI/lint/test scaffolding, but no tray, notifications,
  scheduling, or persistence.
- `ontogen` 0.2.x generates SeaORM entities, a CRUD store, an API layer, and
  Axum HTTP / Tauri IPC / MCP transports plus TypeScript bindings from annotated
  Rust structs. `path-opener` 0.4.x detects installed apps and opens paths in
  them (Obsidian vault-aware via `obsidian://`), with optional `specta` TS types.

Two needs drive the shape:

1. **A resident quality surface.** The daemon answers "are my vaults green?"
   only while a terminal runs it. A desktop app — tray icon, notifications,
   scheduled and change-triggered scans — makes vault health ambient.
2. **A native engine.** Bundling the Bun daemon as a sidecar would work
   ([[D-0012-distribution-single-exec-and-web-ui]] §D6), but a Rust engine makes
   the desktop app self-contained, fast, and opens the wasm path that can later
   unify both implementations into one.

## Decision

### The shape

```text
packages/core        — TS engine (canonical npm artifact), unchanged surface
packages/ui          — NEW: shared Vue component kit + design tokens
crates/markdown-contract-engine
                     — NEW: Rust engine, declarative plane, wasm-ready core
apps/web             — Bun daemon + embedded SPA (consumes packages/ui)
apps/desktop         — NEW: Tauri v2 + Nuxt 4 desktop app (moon project)
  src-nuxt/          —   frontend (consumes packages/ui, generated TS bindings)
  src-tauri/         —   Rust app crate: ontogen-generated store/API/transports,
                         engine, watcher, scheduler, tray, notifications,
                         path-opener integration
```

### D1 — Desktop app from the template, on moon

`apps/desktop` is instantiated from `template-tauri-nuxt` (Tauri v2, Nuxt 4,
`ssr: false`, `nuxt generate` → `frontendDist`) but **adapted, not copied
wholesale**: Bun replaces pnpm, moon tasks replace make/just/mise, and the
template's release/template-sync tooling is dropped (this repo has its own).
The app registers in `.moon/workspace.yml` as `desktop`, with `dev`, `build`,
`typecheck`, `test` (frontend) and `check`, `test-rust` (cargo) tasks.

### D2 — Matched Rust engine, wasm-ready

`crates/markdown-contract-engine` implements the **declarative validation
plane**: markdown parsing to the same section/block tree, the structure plane
(order modes, aliases, oneOf, optional, gap, repeatable, children, anchors),
content leaves (table/list/code/maxWords with the closed schema vocabulary),
frontmatter plane, declarative text constraints, the severity registry, and the
deterministic finding sort. It exposes `validate(source, contract) →
Vec<Finding>` and a corpus runner mirroring `runCorpus` semantics (globs,
first-match routing, exit codes).

- **Finding parity is the contract**: identical `id` vocabulary, `level`
  defaults, 1-based `pos.line`/`pos.col`, and sort order, so JSON output is
  interchangeable with the TS engine's `--format json`.
- The core is **fs-free** (sources and contract text in, findings out) and kept
  `wasm32-unknown-unknown`-compatible; fs, glob walking, and config-file
  discovery live in a thin native layer. A future decision can route the TS
  package's validate path through the wasm build once parity holds.
- **Programmatic rules in Rust**: a `Rule` trait (node-scoped and doc-scoped)
  mirrors `rule`/`docRule`, so Rust consumers get the same code escape TS has.
- **JS-escape fallback**: vaults whose configs need TS-only escapes
  (`rule`/`docRule`, Zod beyond the closed set, `.js/.mjs` configs) are detected
  at load; the desktop app then shells out to an installed `markdown-contract`
  CLI with `--format json` instead of failing or silently under-checking.

### D3 — One corpus, golden peers

Expected findings are extracted from the TS fixture modules into
**`<fixture>.expected.json` peers** (one per case, `{id, level?, line?}` entries
in engine order) under `packages/core/tests/fixtures/`. The TS harness reads
the goldens (fixtures keep only build/label/source wiring); the Rust corpus
harness walks the same directory, runs each `.contract.yaml` against each `.md`,
and asserts the same goldens. Fixtures relying on programmatic escapes carry a
`tsOnly` marker and are skipped by the Rust harness — the shared set is the
declarative ~88% and it can only grow.

### D4 — ontogen full pipeline for the service layer

The desktop domain model — `Vault`, `ScanRun`, `FindingRecord`, `ScanSchedule`,
`OpenerPreference` — is defined once as ontogen-annotated structs in
`apps/desktop/src-tauri`. The build generates: SeaORM entities over **SQLite**
(scan history/trends — the persistence layer D-0012 deferred, now landing on the
desktop first), the CRUD store with lifecycle hooks, the API layer, the **Tauri
IPC transport** (commands the Nuxt UI invokes), the **Axum HTTP transport**
(the same service reachable the way the Bun daemon's API is — the convergence
seam), and **TypeScript bindings** consumed by the frontend. Hand-written code
sits behind the generated API layer (scan orchestration, watcher, scheduler),
not beside it in each transport.

### D5 — Desktop feature set

- **Multiple vaults**: registry semantics mirror `apps/web` (add/remove/toggle
  by path, slug ids), persisted in SQLite via the generated store.
- **Scan on change**: `notify`-based recursive watcher per vault, debounced,
  filtered to `.md`/`.yaml`/`.yml`, matching the Bun watcher's behavior.
- **Scheduled scans**: per-vault cron-style schedules (tokio + `croner`),
  a capability D-0012 explicitly left unbuilt.
- **Notifications**: `tauri-plugin-notification` on scan transitions
  (green→findings, drift, errors) — transition-edge, not every scan.
- **Tray**: Tauri tray icon with aggregate status (worst-of-all-vaults), quick
  per-vault status, scan-now, and open-window actions; closing the window hides
  to tray (the app is resident).
- **Open in**: `path-opener` — per-finding and per-vault "open in Obsidian /
  VS Code / …" from detected installed apps, with `preview_command` used to
  show what will launch.

### D6 — Shared UI package

`packages/ui` extracts the component kit and design tokens (status/severity
language, vault cards, finding rows, empty/error/loading states) from
`apps/web/ui` into a plain Vue 3 + TS package (no Nuxt module machinery),
consumed by both `apps/web/ui` and `apps/desktop/src-nuxt`. Both apps lean into
the **desktop metaphor**: window-chrome shell, tray-adjacent status, vault
"windows" — the prototype (`apps/daemon-web-prototype`) stays frozen as the
provenance artifact.

## Why

- **Tauri v2 + Nuxt 4 SPA** is exactly the decomposition D-0012 §D6 predicted;
  the template is proven, maintained by the same owner, and mobile-capable
  later. Adapting to Bun + moon keeps one workspace discipline
  ([[D-0010-monorepo-tooling]]) instead of importing pnpm/make/mise.
- **Matched engine over rewrite**: the TS engine is canonical, mature, and its
  typed consumption model is not portable; rewriting it wholesale behind wasm
  in one pass risks the npm artifact for a desktop feature. A declarative-plane
  Rust engine held to the corpus gets the desktop native today and, because the
  core is wasm-ready, keeps "one engine everywhere" open as a follow-on rather
  than a prerequisite.
- **Golden peers over one-way export**: two engines asserting one set of files
  cannot drift silently; a generated-goldens pipeline can. The refactor cost in
  `packages/core` is one harness change, and the goldens double as
  documentation of each fixture's expected outcome.
- **Full ontogen pipeline**: the desktop needs persistence (history/trends)
  anyway; taking the generated store now means the model is written once and
  every transport — IPC today, HTTP for daemon convergence, MCP if wanted — is
  generated, not hand-kept. This also exercises ontogen end-to-end in a real
  consumer, which feeds the template/library loop this repo already practices.
- **path-opener** already speaks Obsidian's vault-aware URI scheme and has the
  registry + detection model the "open in" UX needs; the `specta` feature keeps
  its types in the same generated-TS world as the ontogen bindings.

## Consequences

- The workspace becomes **polyglot in code, not just in intent**: a root
  `Cargo.toml` workspace (`crates/*`, `apps/desktop/src-tauri`) joins the Bun
  workspace; CI gains cargo fmt/clippy/test lanes; contributors need a Rust
  toolchain for desktop/engine work (moon's Rust toolchain pins it).
- **Corpus discipline tightens**: new declarative fixtures must ship golden
  peers, and a fixture that only one engine can pass is a finding against the
  lagging engine, not a shrug. The `.contract.yaml` peers stop being
  documentation and become load-bearing test inputs for a second engine.
- **Parity risk is real and owned**: markdown parsing differences (remark vs a
  Rust parser) surface as position mismatches; the corpus pins them. Where the
  Rust engine cannot yet express a fixture, the marker is explicit.
- The npm artifact is untouched this pass; `packages/ui` extraction changes
  `apps/web/ui` imports but not the daemon API. `apps/daemon-web-prototype`
  remains frozen.
- ontogen 0.2.x is early; its known caveats (client-gen inline in transports,
  store/relations stubs) are accepted, and problems found here flow upstream as
  issues/PRs to `rust-ontogen` rather than local forks.
- Desktop OS features (tray, notifications) can only be smoke-tested headlessly
  in CI; real verification is manual on macOS/Windows/Linux desktops.

## References

- [[D-0012-distribution-single-exec-and-web-ui]] — the daemon/binary shape this extends (§D6 Tauri, §D7 Rust core, deferred SQLite/scheduling)
- [[D-0010-monorepo-tooling]] — workspace + moon conventions the new projects join
- [[D-0008-declarative-contract-dsl]] — the declarative vocabulary the Rust engine implements
- [[D-0001-finding-model]] — the finding shape both engines must emit identically
- [[C-0010-single-binary-and-vault-dashboard]] — the capability the desktop app advances
