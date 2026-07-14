# wasm-spike — engine → WebAssembly packaging spike

**Throwaway spike** (its own Cargo workspace, `publish = false`) de-risking whether the
TS `packages/core` declarative-validation plane can become a thin wasm wrapper around
`markdown-contract-engine`. It does not touch the engine crate or its tests.

- **Read [`FINDINGS.md`](./FINDINGS.md)** — the measured sizes, init model, target
  matrix, API ergonomics, and the go/no-go recommendation. That is the deliverable.
- `src/lib.rs` — the wasm-bindgen surface: `validate_document(source, contract_yaml, path)`.
- `build.sh` — build all three wasm-pack targets and run the Node harness.
- `harness/run-node.cjs` — Node round-trip proof. `harness/index.html` — browser story.

## Quick start

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-pack        # or the prebuilt-binary installer (see FINDINGS.md)
./build.sh
```

Native unit tests (the surface runs off-wasm too): `cargo test`.
