import type { DocTree, ParseOptions } from "./types.js";
/**
 * Parse raw markdown (frontmatter + body) into a positioned `DocTree`.
 *
 * GFM tables / lists and `^block-id` anchors are base (always on); the Obsidian
 * `[[wikilink]]` / `![[transclusion]]` dialect is recognized by default (see `./dialect`).
 * `opts.extensions` is an additive hook for *further* dialects — a no-op pass-through for
 * now (the base set is never re-enabled through it).
 */
export declare function parse(markdown: string, opts?: ParseOptions): DocTree;
//# sourceMappingURL=projection.d.ts.map