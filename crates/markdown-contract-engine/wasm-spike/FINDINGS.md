# Engine → WebAssembly packaging spike — FINDINGS

**Question:** can the TS `packages/core` *declarative-validation* plane become a thin
wasm wrapper around `crates/markdown-contract-engine`, keeping only the programmatic
shell (docRule, fluent authoring, Zod content) in TS?

**Answer: GO** — with size as the one real cost to accept, not a blocker. The engine
core is already wasm-clean; the round-trip works byte-identically in Node and bun; the
JSON interchange boundary preserves parity by construction.

This is a throwaway spike (`wasm-spike/`, its own Cargo workspace, `publish = false`).
It does **not** touch the engine crate's API, its `Cargo.toml`, or its tests
(`cargo test -p markdown-contract-engine` -> 149 unit + 1 corpus golden, still green).

---

## What was built

A one-function wasm-bindgen surface (`src/lib.rs`) over the engine's declarative plane:

```rust
validate_document(source, contract_yaml, path) -> Result<String /* Finding[] JSON */, JsError>
```

It compiles a declarative YAML contract (`load_contract`) and validates a markdown
document (`validate`) — exactly what the TS declarative plane does today, and the plane
the shared corpus goldens pin. Built for three wasm-pack targets (`nodejs`, `web`,
`bundler`) and exercised by a Node harness (`harness/run-node.cjs`) + a browser harness
(`harness/index.html`).

Reproduce: `./build.sh` (from this dir). Prereqs in *Tooling* below.

### Proof it runs (Node, real wasm artifact)

```
loaded: markdown-contract-engine-wasm-spike 0.0.0 (engine core, native feature OFF)

PASS doc findings: []

FAIL doc findings:
[
  { "id": "frontmatter/enum", "level": "error", "path": "doc.md",
    "pos": { "line": 2 },
    "message": "frontmatter field 'status' must be one of 'open/proposed', 'open/accepted'" },
  { "id": "structure/section-missing", "level": "error", "path": "doc.md",
    "pos": { "line": 5, "col": 1 }, "message": "required section 'Context' is missing" }
]

malformed contract threw: unsupported mcVersion: 9 (this build supports 1)
OK — wasm round-trip verified in Node.
```

The **same `--target nodejs` artifact** produces identical output under `bun` (verified).

---

## 1. Bundle size

The `.wasm` is **identical across all three targets** (nodejs/web/bundler share one
`_bg.wasm`); only the JS glue differs.

| Artifact | Raw | gzip -9 | brotli -q11 |
|---|--:|--:|--:|
| `.wasm`, plain `cargo build --release` (pre-wasm-opt) | 1,670,923 B (1.63 MiB) | 567,402 B | — |
| **`.wasm`, wasm-opt `-Os` + LTO + strip (shipped)** | **1,490,008 B (1.42 MiB)** | **563,697 B (551 KiB)** | **413,518 B (404 KiB)** |
| JS glue — nodejs target | 6,227 B | 1,893 B | — |
| JS glue — web target | 9,363 B | 2,677 B | — |
| JS glue — bundler target (`_bg.js` + `.js`) | 6,286 B | ~1,900 B | — |

Release profile used: `opt-level = "s"`, `lto = true`, `codegen-units = 1`,
`panic = "abort"`, `strip = true`, plus wasm-opt `-Os`. wasm-opt bought ~180 KB off the
raw build; the gzip delta is small because gzip already collapses the dead code.

### Comparison to the TS implementation footprint

Bundled with esbuild (`--bundle --minify`, node builtins external):

| TS bundle | minified | gzip -9 |
|---|--:|--:|
| `markdown-contract` full entry (validate + parser stack) | 321,904 B | **101,133 B (99 KiB)** |
| `markdown-contract/declarative` entry (adds schema-inference) | 665,478 B | 170,240 B |

Top weight in the TS bundle: `yaml`, the `micromark`/`mdast`/`unified` markdown stack,
`picomatch`, `zod`.

**Verdict:** the wasm is **~4–5.5x heavier on the wire** than the equivalent TS bundle
(404 KiB brotli / 551 KiB gzip vs ~99 KiB gzip). `comrak` (the parity-critical
CommonMark parser with sourcepos) + `regex` + `serde_*` simply compile to a chunky
binary, whereas the TS side rides `micromark`, which minifies and gzips very well. Size
is the cost of this move — see §5 for who pays it.

## 2. Init model

| Target | Instantiation | Sync possible? |
|---|---|---|
| **nodejs** | `fs.readFileSync` + `new WebAssembly.Module` + `new WebAssembly.Instance`, **synchronously at module load** | **Yes, out of the box.** `require()` returns a ready module — no `await`, no top-level await. |
| **web** | default export `await init()` -> `fetch` + `WebAssembly.instantiateStreaming` (async) | **Yes, via `initSync(bytes)`** if you supply the bytes yourself (inline/base64/bundler asset). |

- **CLI / daemon:** fully synchronous via the nodejs glue — no async-init tax. This is
  the good case: the daemon `require`s the module and calls straight in.
- **Browser:** async by default (streaming instantiate is the recommended path and needs
  the server to serve `application/wasm`). A one-time `await init()` before first call;
  the API is identical after that. Synchronous browser init is *available* (`initSync`)
  but blocks the main thread compiling a 1.42 MiB module — fine for a one-shot boot,
  not for a hot path.
- Compiling a 1.42 MiB module is ms-scale and one-time (cache the `WebAssembly.Module`).

## 3. Targets

**One core `.wasm`, per-target JS glue.** The binary is byte-identical across
nodejs/web/bundler; wasm-pack emits a different loader per `--target`. You do **not** get
one universal npm package for free — you either ship all three glues behind conditional
`exports`, or pick the glue that matches the consumer.

| Consumer | Build | Notes |
|---|---|---|
| Node CLI / daemon | `--target nodejs` | CommonJS, sync fs load. |
| Browser (Vite/webpack) | `--target bundler` | ESM; the bundler resolves `_bg.wasm` as an asset. |
| Browser (no bundler) | `--target web` | ESM + `await init()`. |
| **bun** | reuse `--target nodejs` | **Verified**: the nodejs artifact runs unmodified under bun (same output). Bun also handles the ESM/`web` target. No bun-specific build needed. |

## 4. API ergonomics

- **Call shape:** `validate_document(source, contractYaml, path)` -> JSON string ->
  `JSON.parse`. A bad/unsupported contract **throws a JS `Error`** (mapped from
  `DeclarativeError`); findings themselves never throw.
- **Marshalling cost:** wasm-bindgen copies the three input strings into wasm linear
  memory (UTF-8) and copies one result string out; then one `serde_json::to_string` in
  Rust and one `JSON.parse` in JS. For document-sized inputs this is negligible.
- **The JSON boundary is a feature, not a tax.** `Finding` is already the frozen
  interchange shape (`{id,level,path,pos?,message,fix?}`), so the wasm returns *exactly*
  the bytes the corpus goldens pin — parity holds by construction. The alternative,
  `serde-wasm-bindgen` (return a live JS object graph, skip `JSON.parse`), adds glue
  weight and forfeits the "exact interchange bytes" property; **not worth it here.**
- **Error mapping:** `Result<String, JsError>` -> idiomatic JS `throw`. Clean; can grow
  typed error classes later.
- **One ergonomics gap (spike shortcut):** `validate_document` recompiles the contract
  on *every* call. A real wrapper should expose an opaque `Contract` handle
  (`#[wasm_bindgen] pub struct`) so a contract is compiled once and reused across many
  documents — see §5 next steps.
- **Native-test caveat noted for future maintainers:** the `JsError` error path can't be
  unit-tested off wasm32 (`JsError::new` is a wasm import that panics natively); that
  path is covered by the Node harness on the real artifact.

## 5. Go / no-go

**GO**, scoped exactly as the plan frames it (declarative plane -> wasm; programmatic
shell stays TS).

**Why it de-risks cleanly:**
- The engine core is **already fs-free and wasm-clean** — the existing `native` feature
  gate did its job. It compiled to `wasm32-unknown-unknown` on the first try: no
  `getrandom`, no `js-sys`, no `std::fs`, no panic-hook surprises. This was the biggest
  unknown and it's a non-event.
- Round-trip works in **Node and bun** with **byte-identical interchange output**, so
  the shared-corpus parity contract is preserved for free.
- **Sync init** in Node means the CLI/daemon path pays no async-init tax.

**Risks / costs to accept:**
1. **Size (the real one):** ~404 KiB brotli / 551 KiB gzip, ~4–5x the TS bundle. Irrelevant
   for CLI/daemon; a one-time cached download for the browser dashboard. `comrak` dominates
   and is parity-critical (sourcepos), so swapping the parser to shrink the binary would
   risk the parity contract — not recommended.
2. **Footprint is additive for dual consumers:** only the declarative plane moves; the
   programmatic shell stays TS. A consumer needing both ships the wasm *and* some TS. The
   plan already assumes this split.
3. **Build/CI tooling:** adds `wasm32-unknown-unknown` + wasm-pack to the toolchain, and a
   binaryen new enough / explicitly feature-flagged (see *Tooling*). New moon task + CI step.
4. **Per-call contract compile** in the naive surface (fixed by the opaque-handle step below).
5. **Source-of-truth shift (a benefit):** today TS and Rust are kept in lockstep by the
   shared corpus. If TS declarative becomes a wasm wrapper, the Rust engine becomes the
   single source of truth for that plane — this *kills the duplication* the plan is chasing,
   at the price of putting the wasm build in `packages/core`'s publish pipeline.

**Next steps if go:**
1. Replace per-call compile with an opaque handle: `compile_contract(yaml) -> Contract`
   (`#[wasm_bindgen] pub struct`), `contract.validate(source, path) -> Finding[] JSON`.
2. Wire wasm-pack into the build (a moon task emitting `packages/core/wasm/` with the
   `nodejs` + `web`/`bundler` glues over one shared `_bg.wasm`); gate the TS declarative
   entry to delegate into it.
3. Add a **wasm-parity CI check**: run the existing shared corpus through the wasm surface
   in Node and assert byte-identical goldens — the same guarantee the Rust corpus test gives.
4. Decide packaging: conditional `exports` in `markdown-contract` so Node gets the sync-fs
   glue and browser/bundler get the async/asset glue over the same binary.

---

## Tooling (blockers hit, all resolved)

- **wasm32 target** not installed -> `rustup target add wasm32-unknown-unknown`.
- **wasm-pack** not preinstalled -> installed 0.13.1 via the prebuilt-binary installer
  (`curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh`).
- **wasm-opt rejected the module**: binaryen 117 (bundled by wasm-pack) errored
  *"Bulk memory operations require bulk memory [--enable-bulk-memory]"*. Cause: rustc
  1.95 emits the post-MVP wasm feature set (bulk-memory, sign-ext, nontrapping-fptoint,
  mutable-globals, multivalue) by default, and the size profile's `strip = true` removed
  the `target_features` custom section wasm-opt would otherwise auto-detect from — so
  wasm-opt fell back to MVP and rejected the module. **Fix:** pass the enables explicitly
  via `[package.metadata.wasm-pack.profile.release] wasm-opt = ["-Os", "--enable-bulk-memory", ...]`
  (see `Cargo.toml`). A CI setup should either keep these flags or ship a binaryen new
  enough to honor the section.

## Measurement environment

rustc/cargo 1.95.0 · wasm-pack 0.13.1 · binaryen (wasm-opt) 117 · Node v24.18.0 ·
bun 1.3.12 · esbuild (repo-pinned) · macOS arm64. `.wasm` sizes from the `--target
nodejs` build; gzip via `gzip -9`, brotli via `brotli -q 11`.
