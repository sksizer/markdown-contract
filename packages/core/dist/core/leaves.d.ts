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
 * remaps Zod issue paths to source lines.
 */
import type { z } from "zod";
import type { LeafSpec, ZodType } from "./types.js";
/**
 * The typed row a `table(...)` leaf reads back to (T-SCRB). Keyed by EVERY declared column:
 *   - a column with a declared `cells` schema → that cell's `z.output` (the parsed / transformed
 *     value, e.g. a `Location` cell `.transform()`ed from a string into `{ path, symbol? }`);
 *   - a column with no declared cell → `string` (the raw cell text, additive/opt-in).
 * `Cols` is the literal union of column names (captured off the `columns` tuple); `C` is the
 * `cells` map. A table with no `cells` falls back to the `Record<string, string>` default (see the
 * `table` overloads), so an undeclared or `byAnchor` table reads back string rows (AC-3).
 */
export type RowOf<Cols extends string, C> = {
    [K in Cols]: K extends keyof C ? z.output<C[K]> : string;
};
/**
 * A typed-table leaf: columns, optional anchor, per-cell schemas, min rows. Generic over its
 * `columns` tuple and `cells` map so the return type carries the read-back row shape
 * (`RowOf<Cols, C>`, `z.output` per declared cell) forward on `LeafSpec._row`, which
 * `section()` → `sections()` → `Infer` thread into `read()`'s `TableView<Row>` (T-SCRB).
 *
 * Two overloads keep the additive/opt-in guarantee: a table with NO `cells` reads back the
 * `Record<string, string>` default (AC-3); a table WITH `cells` reads back the typed `RowOf` row.
 * The runtime is an inert passthrough — the row read-back itself lives in `model.ts#tableView`.
 */
export declare function table<const Cols extends string = string>(s: {
    columns: Cols[];
    anchor?: string;
    minRows?: number;
    extraColumns?: "ignore" | "error";
    cells?: undefined;
}): LeafSpec<Record<string, string>>;
export declare function table<const Cols extends string, C extends Partial<Record<Cols, z.core.$ZodType>>>(s: {
    columns: Cols[];
    anchor?: string;
    minRows?: number;
    extraColumns?: "ignore" | "error";
    cells: C;
}): LeafSpec<RowOf<Cols, C>>;
export declare function table(s: {
    columns: string[];
    anchor?: string;
    minRows?: number;
    extraColumns?: "ignore" | "error";
    cells?: Record<string, ZodType>;
}): LeafSpec;
/**
 * A list leaf: ordered/unordered, per-item schema or checkbox gate, min items. Generic (T-SCLI) over
 * the `everyItem` schema so its return type carries the read-back item shape (`z.output<everyItem>`)
 * forward on `LeafSpec._item`, which `section()` → `sections()` → `Infer` thread into `read()`'s
 * `ListView<Item>` — the list analogue of `table()`'s `RowOf` capture.
 *
 * Overloads keep the additive/opt-in guarantee: a `list({ everyItem: <ZodType> })` whose schema
 * `.transform()`s reads back the typed `z.output` items; a `"checkbox"` gate or NO `everyItem` reads
 * back the raw `ListItem` default (AC-3). The runtime is an inert passthrough — the item read-back
 * itself lives in `model.ts#listView`.
 */
export declare function list<I extends z.core.$ZodType>(s: {
    ordered?: boolean;
    everyItem: I;
    minItems?: number;
}): LeafSpec<unknown, z.output<I>>;
export declare function list(s: {
    ordered?: boolean;
    everyItem?: "checkbox";
    minItems?: number;
}): LeafSpec;
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