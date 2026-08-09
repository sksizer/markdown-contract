/**
 * The content plane — Zod leaves over projected blocks (D-0004 / C-0005).
 *
 * `matchContent(tree, def, ctx)` runs AFTER the structure plane. It walks the SAME body
 * grammar the structure plane walks, finds each declared section's `content` leaf and the
 * block that fills it, and validates that block's DATA — columns, row count, cell values,
 * list-item shape, code language, paragraph word count. Presence and kind are the structure
 * plane's kind-gate (D-0001: *kind and presence are structure; data shape is content*), so
 * this plane never re-reports `structure/block-missing` / `structure/block-kind`:
 *
 *   - the content leaf runs only when a block of the expected kind is present (AC-4); a
 *     wrong-kind or absent block defers to the structure plane's finding.
 *
 * Cell-level table findings localize to the offending row via `node.rowPos(i)`, and
 * frontmatter findings remap the Zod issue path to its key's source line via
 * `tree.frontmatter.lineForPath(path)` (AC-5). The leaf config is read off `LeafSpec.config`
 * (stashed inert by the `leaves.ts` builders); raw `z.*` may ride inside a leaf (e.g. a
 * table's typed `cells`).
 */
import type { ContractDef, Ctx, DocTree, Finding } from "./types.js";
/**
 * Run the content plane: frontmatter Zod (if declared) plus every section's content leaf.
 * Returns findings in emission order; `validate()` applies the deterministic cross-plane sort.
 */
export declare function matchContent(tree: DocTree, def: ContractDef, ctx: Ctx): Finding[];
//# sourceMappingURL=content.d.ts.map