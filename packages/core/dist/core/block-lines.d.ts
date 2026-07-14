/**
 * Positioned block enumeration over the projection — the source lines occupied by fenced
 * code blocks and by table rows. These are the two "which lines are opaque / are data rows"
 * line sets consumers build to scan a raw document safely (skip fenced code, inspect table
 * rows). Both return 1-indexed source line numbers.
 *
 * `codeBlockLines` walks `tree.mdast` (layer-0) rather than the heading-direct `SectionNode.blocks`,
 * so code fences nested inside lists / blockquotes — which the section projection does not hoist —
 * are still covered. `tableRowLines` reads the projected table blocks (recursively), whose header
 * `pos` and per-row `rowPos` already give the exact row lines (the separator row forms no data row,
 * so it is naturally excluded).
 */
import type { DocTree, SectionNode } from "./types.js";
/**
 * Every source line occupied by a fenced code block — opening fence through closing fence,
 * inclusive — sourced from `tree.mdast` so code nested in lists / blockquotes is included
 * (heading-direct `SectionNode.blocks` misses those). A `##` / `|` / placeholder line inside a
 * fence is thereby opaque to a raw-line scan.
 */
export declare function codeBlockLines(tree: DocTree): Set<number>;
/**
 * Every table row line — each table's header line (`table.pos.line`) plus every data-row line
 * (`table.rowPos(i).line`) — recursive over the section tree. The separator row is absent (the
 * projection forms no data row for it). These are the lines a table-cell scanner inspects.
 */
export declare function tableRowLines(root: SectionNode): Set<number>;
//# sourceMappingURL=block-lines.d.ts.map