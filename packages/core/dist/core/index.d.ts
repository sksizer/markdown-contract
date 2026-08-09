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
export { codeBlockLines, tableRowLines } from "./block-lines.js";
export { ContractError, finding, notImplemented } from "./finding.js";
export { countByLevel, filterFindings, findingLocation, formatFinding, hasErrors, } from "./finding-view.js";
export type { FrontmatterSplit } from "./frontmatter.js";
export { splitFrontmatter } from "./frontmatter.js";
export { contract, docRule, gap, oneOf, optional, rule, section, sections, } from "./grammar.js";
export type { RowOf } from "./leaves.js";
export { code, list, maxWords, table } from "./leaves.js";
export { buildModel } from "./model.js";
export type { SectionSpan } from "./navigate.js";
export { blocksOfKind, findSection, sectionForLine, sectionSpans, sectionsAt } from "./navigate.js";
export { LENIENT, lenientBody, optionalSection, STRICT, strictBody } from "./presets.js";
export { parse } from "./projection.js";
export { rawTableRow, rawTableRows } from "./table-source.js";
export type { TextRuleSpec } from "./text-constraints.js";
export { forbids, requires, textRule } from "./text-constraints.js";
export type { TextFindingInput, TextFindingKind, TextKind, TextMatchResult, TextMatchSpec, } from "./text-match.js";
export { buildTextFindings, matchText, synthesizeTextId } from "./text-match.js";
export type * from "./types.js";
export { read, validate } from "./validate.js";
//# sourceMappingURL=index.d.ts.map