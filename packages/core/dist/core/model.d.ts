import type { ContractDef, Doc, DocTree, ValidateCtx } from "./types.js";
/**
 * Build the typed model for a validated document — a lazy facade over the projection.
 * `frontmatter` is the parsed YAML; `body` is the dual-key group over the top-level sections
 * (partitioned against `def.body`); `byAnchor` resolves a `^anchor` anywhere in the document.
 */
export declare function buildModel<F, B>(tree: DocTree, def: ContractDef<F, B>, _ctx: ValidateCtx): Doc<F, B>;
//# sourceMappingURL=model.d.ts.map