/**
 * `[[wikilink]]` / `![[transclusion]]` recognition (BUNDLED dialect, default-on).
 *
 * Recognized so they survive projection intact and their targets are extractable.
 * Implemented as a post-parse string recognition pass over already-flattened text (NOT a
 * micromark syntax extension): remark already parses these as ordinary text, so a
 * recognition pass is sufficient and avoids owning a micromark `syntax` + `mdast-util` pair
 * for a construct the projection only needs to recognize (see `./index.ts` for the D-0002
 * sourcing resolution). The validation corpus does not exercise these, so this is
 * deliberately a recognition pass, not a full grammar.
 */
/** A recognized `[[wikilink]]` or `![[transclusion]]` reference, extracted from flattened text. */
interface VaultRef {
    /** `"wikilink"` for `[[…]]`, `"transclusion"` for `![[…]]`. */
    kind: "wikilink" | "transclusion";
    /** The link target: the part before any `|alias`, `#heading`, or `#^block` suffix. */
    target: string;
    /** The display alias after `|`, if present. */
    alias?: string;
    /** The heading or `^block` fragment after `#`, if present. */
    fragment?: string;
    /** The full matched token, verbatim, e.g. `[[target|alias#anchor]]`. */
    raw: string;
}
/**
 * Recognize every `[[wikilink]]` / `![[transclusion]]` in already-flattened text. Light,
 * correct recognition (BUNDLED dialect) — the targets are parsed out of the
 * `target|alias#fragment` form, tolerating remark-stringify's backslash escaping.
 */
export declare function extractVaultRefs(text: string): VaultRef[];
export {};
//# sourceMappingURL=wikilinks.d.ts.map