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
// Declarative text-constraint builders (D-0011). `TextMatchSpec` is the matcher's spec type
// (re-exported by text-constraints.ts as the authoring surface, and sourced once below from
// text-match.js to keep the barrel free of a duplicate export):
export { forbids, requires, textRule } from "./text-constraints.js";
export type { TextRuleSpec } from "./text-constraints.js";
// Engine entry points (the doors `contract()` delegates to):
export { read, validate } from "./validate.js";
// Out-of-model entry:
export { buildModel } from "./model.js";
// Text-match predicate core + the `text/*` finding area (D-0011):
export { buildTextFindings, matchText, synthesizeTextId } from "./text-match.js";
export type {
  TextFindingInput,
  TextFindingKind,
  TextKind,
  TextMatchResult,
  TextMatchSpec,
} from "./text-match.js";
