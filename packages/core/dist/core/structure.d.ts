import type { Ctx, Finding, SectionNode, SectionSeq } from "./types.js";
/**
 * Walk the projection's top-level sections against the body grammar, emitting every
 * `structure/*` finding. The result is returned in emission order; `validate()` applies
 * the deterministic sort (T-3NC8 finalizes the cross-plane merge).
 */
export declare function matchStructure(tree: {
    root: SectionNode;
}, body: SectionSeq, ctx: Ctx): Finding[];
/**
 * Emit `structure/heading-depth-jump` (warn) for a sub-heading nested more than one level
 * below its parent section — an H2 immediately followed by an H4 (D-0002 D3 / D-0003). The
 * projection attaches the deeper heading to its nearest ancestor with its TRUE depth preserved
 * (no synthesized intermediate), so the jump is re-derivable here as `child.depth > parent.depth + 1`.
 *
 * Contract-independent: it scans the whole projected tree, not the grammar, so a malformed
 * outline is flagged whether or not a contract declares those sections. The synthetic root's
 * direct children (the top-level H2s) are not checked against it — "H1-title → H2" is the normal
 * step, and the root's depth is a projection artifact, not an authored heading.
 */
export declare function scanHeadingDepthJumps(root: SectionNode, ctx: Ctx): Finding[];
//# sourceMappingURL=structure.d.ts.map