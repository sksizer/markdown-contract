/**
 * Content leaves — `table` / `list` / `code` / `maxWords`. Each declares a
 * structural kind-gate (`LeafSpec.kind`, read by the structure plane) plus a content
 * Zod schema over the projected node (C-0005, content plane).
 *
 * Here they CONSTRUCT an inert `LeafSpec`: an accurate `kind` for the structural
 * kind-gate, a placeholder `schema`, and the raw config stashed on `config` so the
 * Zod-over-a-node validation (T-5LW7) can build the real schema later. This module
 * deliberately does NOT build the content schema or validate cell/row data.
 */
import type { LeafSpec, ZodType } from "./types.js";

/**
 * The inert placeholder content schema. The real per-leaf Zod schema is built in T-5LW7
 * from `LeafSpec.config`; until then this stands in so a `LeafSpec` is well-typed and the
 * structural kind-gate (which reads only `LeafSpec.kind`) can run.
 */
const PLACEHOLDER_SCHEMA: ZodType = {};

/** A typed-table leaf: columns, optional anchor, per-cell schemas, min rows. */
export function table(s: {
  columns: string[];
  anchor?: string;
  minRows?: number;
  cells?: Record<string, ZodType>;
  extraColumns?: "ignore" | "error";
}): LeafSpec {
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
