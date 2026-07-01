import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import type { Root, Yaml } from "mdast";

// Minimal recognizer: same frontmatter extension parse() uses (remark-frontmatter
// wraps micromark-extension-frontmatter), without the gfm/section/wikilink projection.
const FRONTMATTER_PROCESSOR = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]);

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
export function bodyAfterFrontmatter(md: string, yamlNode: Yaml | undefined): string {
  const end = yamlNode?.position?.end?.offset;
  if (end === undefined) return md;
  let i = end;
  if (md[i] === "\r" && md[i + 1] === "\n") i += 2;
  else if (md[i] === "\n") i += 1;
  return md.slice(i);
}

/**
 * Pure, format-agnostic frontmatter/body split — no YAML parse, no section/wikilink
 * projection. `raw` is the fences-stripped inter-fence text (or null); `body` is the
 * verbatim tail. Agrees with `parse()` by construction (same recognizer, shared body helper).
 */
export function splitFrontmatter(md: string): FrontmatterSplit {
  const tree = FRONTMATTER_PROCESSOR.parse(md) as Root;
  const yamlNode = tree.children.find((c): c is Yaml => c.type === "yaml");
  return {
    raw: yamlNode ? yamlNode.value : null,
    body: bodyAfterFrontmatter(md, yamlNode),
  };
}
