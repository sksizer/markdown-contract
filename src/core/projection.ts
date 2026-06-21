/**
 * Projection — `parse(markdown) → DocTree`. The dialect-aware projection
 * (GFM + Obsidian micromark ext; §2 invariants) lands in T-2HF6; this is the
 * typed stub the engine and runner build against.
 */
import { notImplemented } from "./finding.js";
import type { DocTree, ParseOptions } from "./types.js";

/**
 * Parse raw markdown (frontmatter + body) into a `DocTree`. Stub — the real
 * remark-gfm + Obsidian projection lands in T-2HF6.
 */
export function parse(_markdown: string, _opts?: ParseOptions): DocTree {
  throw notImplemented("parse");
}
