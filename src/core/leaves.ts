/**
 * Content leaves — `table` / `list` / `code` / `maxWords`. Each declares a
 * structural kind-gate plus a content Zod schema over the projected node (C-0005,
 * content plane). Stubs — the Zod-over-a-node validation lands in T-5LW7.
 */
import { notImplemented } from "./finding.js";
import type { LeafSpec, ZodType } from "./types.js";

/** A typed-table leaf: columns, optional anchor, per-cell schemas, min rows. Stub. */
export function table(_s: {
  columns: string[];
  anchor?: string;
  minRows?: number;
  cells?: Record<string, ZodType>;
  extraColumns?: "ignore" | "error";
}): LeafSpec {
  throw notImplemented("table");
}

/** A list leaf: ordered/unordered, per-item schema or checkbox gate, min items. Stub. */
export function list(_s: {
  ordered?: boolean;
  everyItem?: "checkbox" | ZodType;
  minItems?: number;
}): LeafSpec {
  throw notImplemented("list");
}

/** A fenced-code leaf, optionally pinned to a language. Stub. */
export function code(_s: { lang?: string }): LeafSpec {
  throw notImplemented("code");
}

/** A paragraph leaf bounding word count. Stub. */
export function maxWords(_n: number): LeafSpec {
  throw notImplemented("maxWords");
}
