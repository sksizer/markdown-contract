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

export {};
