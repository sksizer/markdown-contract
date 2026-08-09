/**
 * `^block-id` anchors — the addressing primitive (BASE dialect, always on).
 *
 * A line-terminal `^identifier` token bound to the block it terminates: `BlockNode.anchor`
 * for block-bound ids, `SectionNode.anchors` for section-level ids. Every contract that
 * binds a leaf to an anchor (`byAnchor`, `structure/anchor-missing`) rests on this. Owned
 * in-house — the `^block-id` construct has no maintained npm package in either D-0002
 * sourcing arm, so it is owned regardless (see `./index.ts` for the full resolution).
 */
/**
 * If `text` ends with a line-terminal `^block-id`, return the id and the text with that
 * token removed; otherwise return `null`. Operates on the *last line* of the text so a
 * multi-line paragraph whose final line is `^summary` binds correctly.
 */
export declare function extractTrailingAnchor(text: string): {
    id: string;
    rest: string;
} | null;
/** True iff `text`, trimmed, is *only* a `^block-id` token (a standalone anchor paragraph). */
export declare function isStandaloneAnchor(text: string): string | null;
//# sourceMappingURL=anchors.d.ts.map