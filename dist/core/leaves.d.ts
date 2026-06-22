/**
 * Content leaves — `table` / `list` / `code` / `maxWords`. Each declares a
 * structural kind-gate (`LeafSpec.kind`, read by the structure plane) plus a content
 * Zod schema over the projected node (C-0005, content plane).
 *
 * The builders CONSTRUCT a `LeafSpec`: an accurate `kind` for the structural kind-gate,
 * a placeholder `schema` slot, and the raw config stashed on `config`. The actual
 * data-shape validation lives in `./content` (`matchContent`), which the validate pass
 * calls AFTER the structure plane; it reads each leaf's `config` to validate a present,
 * correct-kind block's data (columns / rows / cells / items / lang / word-count) and
 * remaps Zod issue paths to source lines. `matchContent` is re-exported here so the leaf
 * vocabulary and its validator surface from one module.
 */
import type { LeafSpec, ZodType } from "./types.js";
export { matchContent } from "./content.js";
/** A typed-table leaf: columns, optional anchor, per-cell schemas, min rows. */
export declare function table(s: {
    columns: string[];
    anchor?: string;
    minRows?: number;
    cells?: Record<string, ZodType>;
    extraColumns?: "ignore" | "error";
}): LeafSpec;
/** A list leaf: ordered/unordered, per-item schema or checkbox gate, min items. */
export declare function list(s: {
    ordered?: boolean;
    everyItem?: "checkbox" | ZodType;
    minItems?: number;
}): LeafSpec;
/** A fenced-code leaf, optionally pinned to a language. */
export declare function code(s: {
    lang?: string;
}): LeafSpec;
/** A paragraph leaf bounding word count. */
export declare function maxWords(n: number): LeafSpec;
//# sourceMappingURL=leaves.d.ts.map