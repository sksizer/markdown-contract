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

// The public type surface (T-7K2D).
export type * from "./core/index.js";

// The public runtime surface (T-4QM9 stubs). The engine combinators, projection,
// content leaves, and the `ContractError` class come from `./core`:
export {
  ContractError,
  code,
  contract,
  docRule,
  forbids,
  gap,
  list,
  maxWords,
  oneOf,
  optional,
  parse,
  requires,
  rule,
  section,
  sections,
  table,
  textRule,
} from "./core/index.js";

// Consumer utilities — additive standalone helpers over the exported types
// (navigation over the projected tree, source-faithful table cells, finding
// formatting/filtering, contract-authoring presets). Sourced from `./core`;
// `SectionSpan` and other supporting types bubble via `export type *` above.
export {
  blocksOfKind,
  codeBlockLines,
  countByLevel,
  filterFindings,
  findSection,
  findingLocation,
  formatFinding,
  hasErrors,
  LENIENT,
  lenientBody,
  optionalSection,
  rawTableRow,
  rawTableRows,
  sectionForLine,
  sectionsAt,
  sectionSpans,
  STRICT,
  strictBody,
  tableRowLines,
} from "./core/index.js";

// The corpus runner is library API, surfaced at the package root:
export { defineConfig, runCorpus } from "./runner/index.js";
export type { CorpusConfig } from "./runner/index.js";
