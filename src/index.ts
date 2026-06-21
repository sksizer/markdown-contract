/**
 * markdown-contract — public library API.
 *
 * The engine (one document × one contract → findings + tree + doc) and the typed
 * out-of-model (OOM) live under `./core`; the corpus runner (globs → contracts →
 * aggregated findings) lives under `./runner`. The CLI (`./cli`) is a separate
 * consumer and is deliberately NOT part of this surface.
 *
 * Imports flow one way: cli → runner → core. Nothing here imports from `./cli`.
 *
 * Node ESM (NodeNext): relative imports carry a `.js` extension — TypeScript maps
 * `./core/index.js` to `./core/index.ts` at build time and Node resolves the
 * emitted `.js` at runtime.
 *
 * The full surface is specified in `provenance/d0014/proposed-shape.md` (§3 API,
 * §4 findings, §6 OOM); the decision record is in
 * `provenance/d0014/review-checklist.md`.
 */

export const VERSION = "0.0.0";

// The public type surface (T-7K2D). Runtime functions (`contract`, `validate`, `read`,
// `runCorpus`, the combinators) land as value re-exports in T-4QM9.
export type * from "./core/index.js";
