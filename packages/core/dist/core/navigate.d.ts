/**
 * Section navigation — standalone helpers over the projected section tree
 * (`DocTree.root` and its nested `SectionNode`s). These absorb the section-finding
 * glue consumers hand-roll on top of `root.sections`: the `find(s => s.depth===2 &&
 * s.name===X)` lookup, the `filter(s => s.depth===d)` slice, the "last heading ≤ line"
 * enclosing-section scan, the repeated next-sibling body-extent math, and the
 * `.blocks.find(b => b.kind==="table")` / recursive block walk.
 *
 * Pure functions over the EXISTING `SectionNode` / `BlockNode` shapes — nothing here
 * parses, mutates, or reshapes the tree.
 */
import type { BlockNode, SectionNode } from "./types.js";
/**
 * The first top-level section in `root.sections` whose `name` matches `name` (a single
 * name, or any alias when an array). `opts.depth` restricts the match to that heading
 * depth; `opts.ci` matches case-insensitively (names are otherwise exact and
 * case-sensitive, as `SectionNode.name` is trimmed heading text).
 *
 * Absorbs `root.sections.find(s => s.depth === 2 && s.name === "Operations")` →
 * `findSection(root, "Operations", { depth: 2 })`.
 */
export declare function findSection(root: SectionNode, name: string | string[], opts?: {
    depth?: number;
    ci?: boolean;
}): SectionNode | undefined;
/**
 * The top-level sections at a given heading depth — `root.sections.filter(s => s.depth === depth)`.
 */
export declare function sectionsAt(root: SectionNode, depth: number): SectionNode[];
/**
 * The section enclosing a source `line`: the last top-level section (at `opts.depth`, or any
 * depth by default) whose heading `pos.line <= line`. Because `root.sections` is in document
 * order, the last section at or before `line` is the one whose body extends up to (but not
 * into) the next same-depth sibling — so this is exactly the "last heading ≤ line" scan
 * consumers hand-roll to map a finding's line back to its section.
 */
export declare function sectionForLine(root: SectionNode, line: number, opts?: {
    depth?: number;
}): SectionNode | undefined;
/** A section paired with its 1-indexed body line extent (both bounds inclusive). */
export interface SectionSpan {
    section: SectionNode;
    /** first body line — the line after the heading (`pos.line + 1`) */
    start: number;
    /** last body line — the line before the next same-depth sibling, or `lineCount` at EOF */
    end: number;
}
/**
 * Each section's body extent, for every top-level section at `opts.depth` (default `2`, per the
 * callers). A section's body runs from the line after its heading (`start = pos.line + 1`) to the
 * line before the next same-depth sibling (`end = next.pos.line - 1`), or to `lineCount` for the
 * last section. Absorbs the repeated next-sibling boundary math (the line→section map builder).
 */
export declare function sectionSpans(root: SectionNode, lineCount: number, opts?: {
    depth?: number;
}): SectionSpan[];
/**
 * The section's blocks of a given `kind`, narrowed to the matching `BlockNode` arm. With
 * `opts.recursive`, descends the section's subsection tree (`section.sections`) too, this
 * section's own blocks first. Absorbs both `section.blocks.find(b => b.kind === "table")`
 * (take `[0]`) and the recursive table walk over a section subtree.
 */
export declare function blocksOfKind<K extends BlockNode["kind"]>(section: SectionNode, kind: K, opts?: {
    recursive?: boolean;
}): Array<Extract<BlockNode, {
    kind: K;
}>>;
//# sourceMappingURL=navigate.d.ts.map