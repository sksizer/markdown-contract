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

/**
 * The inert placeholder content schema. The real per-leaf Zod schema is built in T-5LW7
 * from `LeafSpec.config`; until then this stands in so a `LeafSpec` is well-typed and the
 * structural kind-gate (which reads only `LeafSpec.kind`) can run.
 */
const PLACEHOLDER_SCHEMA: ZodType = {};

/**
 * The typed row a `cells` map projects to: each declared cell's `z.output` (read off the
 * `ZodType` phantom `_output`), keyed by column name. Undeclared columns stay string-valued at
 * runtime; this only types the declared, possibly-transforming cells. Stub-level — the real
 * per-row wiring into the model lands in T-SCRB.
 */
type CellsRow<C extends Record<string, ZodType>> = {
  [K in keyof C]: C[K] extends ZodType<infer O> ? O : never;
};

/**
 * A typed-table leaf: columns, optional anchor, per-cell schemas, min rows. Generic over its
 * `cells` map so the return type carries the transformed row shape (`z.output` per cell) forward
 * on `LeafSpec._row`; the runtime is an inert passthrough (real inference lands in T-SCRB).
 */
export function table<C extends Record<string, ZodType> = Record<string, ZodType>>(s: {
  columns: string[];
  anchor?: string;
  minRows?: number;
  cells?: C;
  extraColumns?: "ignore" | "error";
}): LeafSpec<CellsRow<C>> {
  return { kind: "table", schema: PLACEHOLDER_SCHEMA, config: s };
}

/** A list leaf: ordered/unordered, per-item schema or checkbox gate, min items. */
export function list(s: {
  ordered?: boolean;
  everyItem?: "checkbox" | ZodType;
  minItems?: number;
}): LeafSpec {
  return { kind: "list", schema: PLACEHOLDER_SCHEMA, config: s };
}

/** A fenced-code leaf, optionally pinned to a language. */
export function code(s: { lang?: string }): LeafSpec {
  return { kind: "code", schema: PLACEHOLDER_SCHEMA, config: s };
}

/** A paragraph leaf bounding word count. */
export function maxWords(n: number): LeafSpec {
  return { kind: "paragraph", schema: PLACEHOLDER_SCHEMA, config: { maxWords: n } };
}
