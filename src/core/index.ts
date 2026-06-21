/**
 * Engine — one document × one contract → findings + tree + doc. Pure: no file IO,
 * no argv, no `process`. The library's public API (`../index.ts`) and the runner
 * (`../runner`) build on this; nothing here imports from `../cli` or `../runner`.
 *
 * Planned sub-modules (see `provenance/d0014/proposed-shape.md` §1–§6):
 *   projection/  parse → DocTree (remark-gfm + Obsidian micromark ext; §2 invariants)
 *   structure/   tree-grammar findings: sections, block/anchor family, collisions
 *   content/     Zod leaves: frontmatter + typed tables/lists/code
 *   rules/       named-rule registry + docRule (cross-plane / cross-file)
 *   oom/         typed model: read/validate, views, byAnchor, dual-key access
 */

// The public type surface (T-7K2D).
export type * from "./types.js";

// Runtime surface (T-4QM9 stubs). Findings + error class:
export { ContractError, finding, notImplemented } from "./finding.js";
// Projection:
export { parse } from "./projection.js";
// Contract combinators + named-rule factories:
export {
  contract,
  docRule,
  gap,
  oneOf,
  optional,
  rule,
  section,
  sections,
} from "./grammar.js";
// Content leaves:
export { code, list, maxWords, table } from "./leaves.js";
// Engine entry points (the doors `contract()` delegates to):
export { read, validate } from "./validate.js";
// Out-of-model entry:
export { buildModel } from "./model.js";
