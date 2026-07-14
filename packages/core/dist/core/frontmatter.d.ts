import type { Yaml } from "mdast";
export interface FrontmatterSplit {
    /** inter-fence YAML text, fences stripped (matches DocTree.frontmatter.raw); null = no frontmatter */
    raw: string | null;
    /** verbatim source after the closing fence's line terminator (whole doc when no frontmatter) */
    body: string;
}
/**
 * Verbatim body after a leading frontmatter block, given the mdast `yaml` node the
 * recognizer produced (or `undefined` when there is none). Shared by `splitFrontmatter`
 * and `parse()` so the two never diverge. Skips exactly one line terminator (CRLF or LF)
 * after the closing fence; byte-exact otherwise.
 */
export declare function bodyAfterFrontmatter(md: string, yamlNode: Yaml | undefined): string;
/**
 * Pure, format-agnostic frontmatter/body split — no YAML parse, no section/wikilink
 * projection. `raw` is the fences-stripped inter-fence text (or null); `body` is the
 * verbatim tail. Agrees with `parse()` by construction (same recognizer, shared body helper).
 */
export declare function splitFrontmatter(md: string): FrontmatterSplit;
//# sourceMappingURL=frontmatter.d.ts.map