/**
 * Projection — `parse(markdown) → DocTree` (T-2HF6).
 *
 * One unified/remark parse (`remark-parse` + `remark-gfm` + `remark-frontmatter`) yields
 * a layer-0 mdast `Root`; this module projects it into the layer-1 `DocTree` substrate
 * every other component reads (D-0002 / proposed-shape §2):
 *
 *   - flat headings → a nested `SectionNode` tree (H1 = document title, H2 = top-level
 *     body sections, H3/H4… nested by heading depth);
 *   - mdast blocks → flattened `BlockNode`s (table cells → strings, list items → text,
 *     code verbatim, paragraph text flattened), each carrying a single-point `SourcePos`;
 *   - position-aware frontmatter with `lineForPath` (E2);
 *   - the Obsidian dialect (D-0002 resolved in-house — see `./dialect`): `^block-id`
 *     anchors bind to their blocks / sections; `[[wikilink]]` / `![[transclusion]]`
 *     survive intact.
 *
 * Four invariants hold (each covered by a test in `tests/projection.test.ts`):
 *   D2  fenced code is opaque — a `##` / `^id` / pipe line inside a fence is verbatim
 *       (remark models a fence as one opaque `code` node, so this is structural);
 *   D3  no depth-jump synthesis — a skipped level (H2→H4) attaches to the nearest
 *       ancestor with its TRUE depth preserved, so a downstream pass can re-derive the
 *       jump; no intermediate node is synthesized and NO finding is emitted here;
 *   D4  no hoisting — only heading-direct (root-level) blocks become `section.blocks`;
 *       a block nested in a blockquote / list item is never promoted.
 */
import type {
  Code,
  List as MdList,
  ListItem as MdListItem,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
  Table,
  TableCell,
  Yaml,
} from "mdast";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { isMap, isSeq, parseDocument } from "yaml";
import { extractTrailingAnchor, isStandaloneAnchor } from "./dialect/index.js";
import { bodyAfterFrontmatter } from "./frontmatter.js";
import type {
  BlockNode,
  DocTree,
  InlineSpan,
  ListItem,
  ParseOptions,
  SectionNode,
  SourcePos,
} from "./types.js";

// ── mdast → SourcePos ───────────────────────────────────────────────────────────

/** Project an mdast node's `position.start` to a single-point `SourcePos` (line + col). */
function posOf(node: { position?: { start: { line: number; column: number } } }): SourcePos {
  const start = node.position?.start;
  return start ? { line: start.line, col: start.column } : { line: 0 };
}

// ── Inline flattening (cells, paragraphs, list-item text) ────────────────────────

/**
 * Flatten an inline phrasing subtree to its plain-text value. `text` and `inlineCode`
 * contribute their `value`; emphasis/strong/link/etc. contribute their children's text;
 * a hard `break` becomes a space. This is the `tableCell → inlineCode/text → "value"`
 * flattening the projection promises (proposed-shape §2).
 */
function flattenInline(nodes: readonly PhrasingContent[]): string {
  let out = "";
  for (const n of nodes) {
    switch (n.type) {
      case "text":
      case "inlineCode":
        out += n.value;
        break;
      case "break":
        out += " ";
        break;
      default:
        if ("children" in n && Array.isArray(n.children)) {
          out += flattenInline(n.children as PhrasingContent[]);
        } else if ("value" in n && typeof n.value === "string") {
          out += n.value;
        }
    }
  }
  return out;
}

// ── Inline-code spans (C1 / T-SCPP: the byte range flattening drops) ──────────────

/**
 * A single point projected to a clean `{ line, col }` — no `offset` key rides along, so the
 * `SourcePos` deep-equals what a fixture pins. `column` is 1-based (unist convention).
 */
function pointPos(point: { line: number; column: number }): SourcePos {
  return { line: point.line, col: point.column };
}

/**
 * Walk an inline phrasing subtree and collect every `inlineCode` run's `InlineSpan` into `out`,
 * in document order. The mdast node's NATIVE `position` is threaded through verbatim (start on
 * the opening backtick, end one column past the closing backtick — unist's half-open range); `raw`
 * is the exact source slice between the node's offsets, so the backticks round-trip. We recurse
 * into container nodes (emphasis / strong / link / …) so an `inlineCode` nested inside them still
 * registers. This runs BESIDE `flattenInline` — the flattened string it returns is untouched (AC-4).
 */
function collectInlineSpans(
  nodes: readonly PhrasingContent[],
  source: string,
  out: InlineSpan[],
): void {
  for (const n of nodes) {
    if (n.type === "inlineCode") {
      const p = n.position;
      if (p) {
        out.push({
          start: pointPos(p.start),
          end: pointPos(p.end),
          raw: inlineRaw(source, p, n.value),
        });
      }
    } else if ("children" in n && Array.isArray(n.children)) {
      collectInlineSpans(n.children as PhrasingContent[], source, out);
    }
  }
}

/** The inline spans of a phrasing subtree (`[]` when none) — the collector as an expression. */
function inlineSpansOf(nodes: readonly PhrasingContent[], source: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  collectInlineSpans(nodes, source, spans);
  return spans;
}

/**
 * The verbatim backticked source of an inline-code node: the slice between the node's byte offsets
 * (delimiters included). Falls back to a single-backtick reconstruction only if offsets are absent
 * (they never are from remark) — a defensive belt, not the live path.
 */
function inlineRaw(
  source: string,
  position: { start: { offset?: number }; end: { offset?: number } },
  value: string,
): string {
  const from = position.start.offset;
  const to = position.end.offset;
  if (typeof from === "number" && typeof to === "number") return source.slice(from, to);
  return `\`${value}\``;
}

/**
 * The cell's content-start position (with `col`): the source column of the cell's FIRST inline
 * child (its first non-whitespace content), falling back to the cell node's own start when empty.
 * GFM already trims a cell's surrounding whitespace off the child positions, so this lands on the
 * cell's real content column — for a `` `path` `` cell, the opening backtick.
 */
function cellContentPos(cell: TableCell): SourcePos {
  const first = cell.children[0];
  if (first?.position) return pointPos(first.position.start);
  return posOf(cell);
}

/** Flatten a list item's content to a single text string (its first paragraph's prose). */
function flattenListItem(item: MdListItem): string {
  const parts: string[] = [];
  for (const child of item.children) {
    if (child.type === "paragraph") {
      parts.push(flattenInline(child.children));
    }
  }
  return parts.join(" ").trim();
}

// ── Block projection (a root-level RootContent → BlockNode | null) ───────────────

/** Project a `paragraph` node to a `paragraph` BlockNode (anchor stripped by the caller). */
function projectParagraph(
  node: Paragraph,
  source: string,
): Extract<BlockNode, { kind: "paragraph" }> {
  // The inline-code spans are computed once here (C1 / T-SCPP) and closed over by the accessor,
  // so they never serialize onto the block. The flattened `text` is unchanged (AC-4).
  const spans = inlineSpansOf(node.children, source);
  return {
    kind: "paragraph",
    text: flattenInline(node.children).trim(),
    pos: posOf(node),
    inlineSpans: () => spans,
  };
}

/** Project a `code` node verbatim. `lang` is `null` for an unlabelled fence. */
function projectCode(node: Code): Extract<BlockNode, { kind: "code" }> {
  return { kind: "code", lang: node.lang ?? null, value: node.value, pos: posOf(node) };
}

/** Project a `list` node to a `list` BlockNode; task-list `checked` rides on each item. */
function projectList(node: MdList): Extract<BlockNode, { kind: "list" }> {
  const items: ListItem[] = node.children.map((li) => {
    const item: ListItem = { text: flattenListItem(li), pos: posOf(li) };
    if (li.checked === true || li.checked === false) item.checked = li.checked;
    return item;
  });

  // A1 — the sparse typed overlay (the list analogue of the table's `typedStore`). A closure-captured
  // `Map<itemIndex, value>` (NOT an enumerable property) so `typedItem`/`setTypedItem` are the only
  // way in and the cache never serializes onto the public `tree`. Starts empty; the content plane's
  // per-item `safeParse` pass fills it (a plain / `"checkbox"` list leaves it empty).
  const typedStore = new Map<number, unknown>();

  return {
    kind: "list",
    ordered: node.ordered === true,
    items,
    typedItem(i: number): unknown | undefined {
      return typedStore.get(i);
    },
    setTypedItem(i: number, value: unknown): void {
      typedStore.set(i, value);
    },
    pos: posOf(node),
  };
}

/**
 * Project a `table` node. The header row's cells flatten to `columns`; body rows flatten
 * to `rows` (`string[][]`). A trailing single-cell row that is *only* a `^block-id`
 * (GFM absorbs an anchor line directly under a table into an extra row) is lifted out as
 * the table's anchor, not kept as a data row. `rowPos(i)` returns the i-th *body* row's
 * source line.
 */
function projectTable(
  node: Table,
  source: string,
): {
  block: Extract<BlockNode, { kind: "table" }>;
  /** an anchor absorbed as a trailing single-cell `^id` row, if any */
  absorbedAnchor?: string;
} {
  const [headerRow, ...bodyRows] = node.children;
  const columns = headerRow
    ? headerRow.children.map((cell) => flattenInline(cell.children).trim())
    : [];

  // Detect a trailing single-cell row that is only a `^block-id`.
  let absorbedAnchor: string | undefined;
  let dataRows = bodyRows;
  const lastRow = bodyRows[bodyRows.length - 1];
  if (lastRow && lastRow.children.length === 1 && lastRow.children[0]) {
    const onlyCellText = flattenInline(lastRow.children[0].children).trim();
    const id = isStandaloneAnchor(onlyCellText);
    if (id) {
      absorbedAnchor = id;
      dataRows = bodyRows.slice(0, -1);
    }
  }

  const rows = dataRows.map((row) =>
    row.children.map((cell) => flattenInline(cell.children).trim()),
  );
  const rowLines = dataRows.map((row) => posOf(row));

  // C1 (T-SCPP) — per-cell overlays, indexed [bodyRow][col] exactly like `rows`. `cellPositions`
  // is each cell's content-start `SourcePos` (with `col`); `cellSpans` is each cell's inline-code
  // spans. Both are closure-captured below so they never serialize onto the public block (AC-4).
  const cellPositions: SourcePos[][] = dataRows.map((row) => row.children.map(cellContentPos));
  const cellSpans: InlineSpan[][][] = dataRows.map((row) =>
    row.children.map((cell) => inlineSpansOf(cell.children, source)),
  );

  // A1 — the sparse typed overlay. A closure-captured store (NOT an enumerable property on the
  // block) so `typed`/`setTyped` are the only way in and the cache never serializes onto the
  // public `tree`. Nested `Map<row, Map<col, value>>` keys by column NAME safely — a delimiter
  // join would collide when a column name itself contains the delimiter. Starts empty; the
  // content plane's per-cell `safeParse` pass fills it (a plain-string table leaves it empty).
  const typedStore = new Map<number, Map<string, unknown>>();

  const block: Extract<BlockNode, { kind: "table" }> = {
    kind: "table",
    columns,
    rows,
    rowPos(i: number): SourcePos {
      return rowLines[i] ?? { line: 0 };
    },
    cellPos(row: number, col: number): SourcePos {
      return cellPositions[row]?.[col] ?? { line: 0 };
    },
    inlineSpans(row: number, col: number): InlineSpan[] {
      return cellSpans[row]?.[col] ?? [];
    },
    typed(row: number, col: string): unknown | undefined {
      return typedStore.get(row)?.get(col);
    },
    setTyped(row: number, col: string, value: unknown): void {
      let byCol = typedStore.get(row);
      if (byCol === undefined) {
        byCol = new Map<string, unknown>();
        typedStore.set(row, byCol);
      }
      byCol.set(col, value);
    },
    pos: posOf(node),
  };
  return absorbedAnchor !== undefined ? { block, absorbedAnchor } : { block };
}

/**
 * Project one root-level content node to a `BlockNode`, or `null` if it carries no block
 * (a heading is handled by the section walker; a blockquote / nested list is NOT hoisted —
 * D4 — so it yields no section-level block).
 */
function projectBlock(node: RootContent, source: string): BlockNode | null {
  switch (node.type) {
    case "paragraph":
      return projectParagraph(node, source);
    case "code":
      return projectCode(node);
    case "list":
      return projectList(node);
    case "table":
      return projectTable(node, source).block;
    default:
      // blockquote, thematicBreak, html, definition, footnoteDefinition, …: D4 — not hoisted.
      return null;
  }
}

// ── Section tree assembly (flat headings → nested SectionNode tree) ──────────────

function newSection(name: string, depth: number, pos: SourcePos): SectionNode {
  return { name, depth, pos, sections: [], blocks: [], anchors: [] };
}

/**
 * Walk the flat root children, building the nested section tree.
 *
 * - A leading `# H1` is captured as the document title (`root.name`); it does not become
 *   a body section. (Only the *first* H1 is the title; a later H1 nests like any heading.)
 * - H2 are the top-level body sections (`root.sections`).
 * - H3/H4… nest under the nearest ancestor of smaller depth (D3: a skipped level attaches
 *   to the nearest ancestor with its TRUE `depth` preserved — no synthesized intermediate).
 * - Non-heading content attaches to the current section's `blocks` (D4: only root-level
 *   blocks; nested blockquote/list blocks are not hoisted).
 * - `^block-id` anchors bind to the block they terminate (`BlockNode.anchor`) or, when
 *   standalone with no preceding block in the section, to the section (`SectionNode.anchors`).
 */
function buildTree(
  root: Root,
  source: string,
): { docRoot: SectionNode; title: string | undefined } {
  // The synthetic root is depth 1 (the H1 level); its `sections` are the top-level H2s.
  const docRoot = newSection("", 1, { line: 0 });
  let title: string | undefined;
  let titleSeen = false;

  // The ancestor stack: docRoot plus the chain of open sections, deepest last.
  const stack: SectionNode[] = [docRoot];

  for (const node of root.children) {
    if (node.type === "yaml") continue; // frontmatter handled separately

    if (node.type === "heading") {
      const name = flattenInline(node.children).trim();
      if (node.depth === 1 && !titleSeen) {
        // The leading H1 is the document title — captured, not a body section.
        title = name;
        titleSeen = true;
        continue;
      }
      attachSection(stack, newSection(name, node.depth, posOf(node)));
      continue;
    }

    // Non-heading content → a BlockNode on the current (deepest open) section (D4: root-level only).
    attachContentNode(stack[stack.length - 1] as SectionNode, node, source);
  }

  return { docRoot, title };
}

/** Attach `child` under the nearest open ancestor whose depth is < child.depth (D3). */
function attachSection(stack: SectionNode[], child: SectionNode): void {
  // Pop the stack to the nearest ancestor of smaller depth (D3 nearest-ancestor attach).
  while (stack.length > 1 && (stack[stack.length - 1] as SectionNode).depth >= child.depth) {
    stack.pop();
  }
  (stack[stack.length - 1] as SectionNode).sections.push(child);
  stack.push(child);
}

/**
 * Project one non-heading root node and attach its block to `sec` (D4: root-level only). A table's
 * absorbed `^id` row becomes the table anchor; a standalone `^block-id` paragraph binds an anchor
 * and yields no block; a trailing `^id` on a paragraph / list item is stripped onto the block.
 */
function attachContentNode(sec: SectionNode, node: RootContent, source: string): void {
  // Table: project once; a trailing single-cell `^id` row becomes the table's anchor.
  if (node.type === "table") {
    const projected = projectTable(node, source);
    if (projected.absorbedAnchor !== undefined) {
      projected.block.anchor = projected.absorbedAnchor;
    }
    sec.blocks.push(projected.block);
    return;
  }

  const block = projectBlock(node, source);

  // Standalone `^block-id` paragraph: bind to the preceding block, else to the section.
  if (block && block.kind === "paragraph") {
    const standalone = isStandaloneAnchor(block.text);
    if (standalone !== null) {
      bindAnchor(sec, standalone);
      return; // the anchor paragraph itself is not a content block
    }
  }

  if (!block) return; // D4: blockquote / nested content yields no section-level block

  bindTrailingAnchor(block);
  sec.blocks.push(block);
}

/**
 * Strip a trailing `^id` off a paragraph or list block and bind it as the block's anchor. On a
 * paragraph the inline anchor (no blank line before it) is lifted; on a list the FIRST item
 * carrying one wins (Obsidian binds it to the block it sits in), and the token is stripped.
 */
function bindTrailingAnchor(block: BlockNode): void {
  if (block.kind === "paragraph") {
    const trailing = extractTrailingAnchor(block.text);
    if (trailing) {
      block.text = trailing.rest;
      block.anchor = trailing.id;
    }
    return;
  }

  if (block.kind === "list") {
    for (const item of block.items) {
      const trailing = extractTrailingAnchor(item.text);
      if (trailing) {
        item.text = trailing.rest;
        block.anchor = trailing.id;
        break;
      }
    }
  }
}

/**
 * Bind a standalone `^id` to a section: if the section already has a trailing block with
 * no anchor, the id binds to that block (`BlockNode.anchor`); otherwise it is a
 * section-level id (`SectionNode.anchors`).
 */
function bindAnchor(sec: SectionNode, id: string): void {
  const lastBlock = sec.blocks[sec.blocks.length - 1];
  if (lastBlock && lastBlock.anchor === undefined) {
    lastBlock.anchor = id;
  } else {
    sec.anchors.push(id);
  }
}

// ── Frontmatter (position-aware; lineForPath via the `yaml` CST) ─────────────────

/**
 * Build the position-aware frontmatter projection from the mdast `yaml` node.
 *
 * `lineForPath(path)` maps a key path (a Zod issue path: `["status"]`, `["prs", 0]`,
 * `["nested", "b"]`) to the source line of that **key** (for a map key) or **element**
 * (for an array index), using the `yaml` package's CST node ranges.
 *
 * The mdast `yaml` node's `value` omits the surrounding `---` fences and so begins on the
 * document line *after* the opening `---` (which sits on `pos.line`). A block-local 1-based
 * line `L` therefore maps to document line `pos.line + L`.
 */
function buildFrontmatter(node: Yaml): DocTree["frontmatter"] {
  const pos = posOf(node);
  const raw = node.value;
  const doc = parseDocument(raw);
  const data: unknown = doc.toJS();

  // Document line of the opening `---`; the YAML text begins on `pos.line + 1`, and a
  // block-local 1-based line L maps to document line `pos.line + L`.
  const blockBaseLine = pos.line;

  function lineForPath(path: (string | number)[]): number | undefined {
    if (path.length === 0) return blockBaseLine + 1; // the block itself → first key line
    const localOffset = keyOffset(doc.contents as unknown, path);
    if (localOffset === undefined) return undefined;
    return blockBaseLine + offsetToLine(raw, localOffset);
  }

  return { raw, data, pos, lineForPath };
}

/**
 * Walk the `yaml` CST along `path`, returning the char offset of the addressed **key**
 * node (map) or **element** node (sequence). Top-level keys resolve exactly; nested keys
 * and array indices are resolved best-effort along the same walk.
 */
function keyOffset(contents: unknown, path: (string | number)[]): number | undefined {
  let node: unknown = contents;
  let offset: number | undefined;
  for (const seg of path) {
    if (isMap(node)) {
      const pair = node.items.find((p) => scalarKey(p.key) === seg);
      if (!pair) return undefined;
      offset = rangeStart(pair.key);
      node = pair.value;
    } else if (isSeq(node)) {
      if (typeof seg !== "number") return undefined;
      const el: unknown = node.items[seg];
      if (el === undefined) return undefined;
      offset = rangeStart(el);
      node = el;
    } else {
      return undefined;
    }
  }
  return offset;
}

/** The scalar value of a map key node (or the node itself if it is already a primitive). */
function scalarKey(key: unknown): unknown {
  if (key && typeof key === "object" && "value" in key) {
    return (key as { value: unknown }).value;
  }
  return key;
}

/** The 0-based start offset of a CST node's source range, if it carries one. */
function rangeStart(node: unknown): number | undefined {
  const range = (node as { range?: readonly number[] } | undefined)?.range;
  return range && typeof range[0] === "number" ? range[0] : undefined;
}

/** Convert a 0-based char offset in `text` to a 1-based line number. */
function offsetToLine(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") line++;
  }
  return line;
}

// ── parse() — the public entry point ─────────────────────────────────────────────

const PROCESSOR = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter, ["yaml"]);

/**
 * Parse raw markdown (frontmatter + body) into a positioned `DocTree`.
 *
 * GFM tables / lists and `^block-id` anchors are base (always on); the Obsidian
 * `[[wikilink]]` / `![[transclusion]]` dialect is recognized by default (see `./dialect`).
 * `opts.extensions` is an additive hook for *further* dialects — a no-op pass-through for
 * now (the base set is never re-enabled through it).
 */
export function parse(markdown: string, opts?: ParseOptions): DocTree {
  void opts?.extensions; // additive hook; base dialect is always on (no-op pass-through)

  const mdast = PROCESSOR.parse(markdown) as Root;

  // Frontmatter: the first `yaml` root child, if any.
  const yamlNode = mdast.children.find((c): c is Yaml => c.type === "yaml");
  const frontmatter = yamlNode ? buildFrontmatter(yamlNode) : null;

  const body = bodyAfterFrontmatter(markdown, yamlNode);
  const { docRoot, title } = buildTree(mdast, markdown);
  docRoot.name = title ?? "";

  return { frontmatter, body, root: docRoot, mdast };
}
