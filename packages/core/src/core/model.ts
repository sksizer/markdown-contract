/**
 * Out-of-model (OOM) — builds the typed, navigable `Doc` from a projected tree
 * and a compiled contract. `read()` and `validate().doc` hand this model back
 * (C-0002 / D-0005). It is a **lazy facade over the layer-1 projection** (no second
 * copy, positions preserved): the validator never depends on it (findings come from
 * projection + Zod + grammar), it is built only on demand, and only for a valid doc.
 *
 * The model reads `def.body` (the body grammar) to know, at each level, which heading
 * names are **declared** slots and which sections match no slot (the `gap()` /
 * `allowUnknown` admissions). Declared-and-present sections become the dual-key keys of
 * the `SectionGroup` (exact heading text, generated lowerCamelCase, `.section(name)`);
 * sections matching no slot land in `unknown` (always present, `[]` when none, document
 * order); a declared-and-absent section is simply not a key (so it reads as `undefined`).
 *
 *   - `doc.frontmatter` — the parsed `tree.frontmatter?.data`;
 *   - `doc.body` — the dual-key `SectionGroup` over `tree.root.sections` against `def.body`,
 *     recursing into each declared section's `children` grammar;
 *   - `SectionView` — `name`, `pos`, `anchors`, `text(scope?)`, `tables`/`table`, `lists`,
 *     `byAnchor(id)`, nested dual-key `sections`;
 *   - `doc.byAnchor(id)` — doc-wide anchor lookup → a `.kind`-discriminated `BlockView`.
 *
 * A table row is keyed by column name; a declared transforming `cells` schema reads its cell back
 * as the CACHED transform output (`node.typed(...)`, T-SCTC's overlay), an undeclared / no-transform
 * cell stays the raw string (T-SCRB). The *static typing* of rows / section keys is `Infer`'s job
 * (top-level). The model is **additive**: the validator never consults it, and the typed value
 * rides only here — the projected `tree` rows stay raw strings (AC-1).
 */
import { toCamelKey } from "./camel.js";
import type {
  BlockNode,
  BlockView,
  CodeView,
  ContractDef,
  Doc,
  DocTree,
  GapSpec,
  LeafSpec,
  ListView,
  OneOfSpec,
  OptionalSpec,
  ParagraphView,
  SectionGroup,
  SectionNode,
  SectionOpts,
  SectionSeq,
  SectionSpec,
  SectionView,
  Spec,
  TableView,
  ValidateCtx,
} from "./types.js";

// ── BlockNode → BlockView (the four-way union, discriminated on `.kind`) ──────────

/**
 * A `TableView` over a projected table block. Each row is keyed by column name; a cell reads back
 * the CACHED transform output when a declared `cells` schema produced one (`node.typed(row, col)`,
 * the sparse overlay T-SCTC filled from the content plane's per-cell `safeParse`), falling back to
 * the RAW cell string otherwise — so a declared transforming cell (e.g. `Location` → `{ path,
 * symbol? }`) reads back the parsed object while an undeclared / no-transform column stays a string
 * (T-SCRB, AC-1/AC-3). The typed value flows ONLY through this model; `node.rows` (the projected
 * tree) is untouched and stays raw strings (AC-5). `Infer`'s `TableView<Row>` types the rows
 * statically for a declared table; at runtime the row map is `Record<string, unknown>`.
 */
function tableView(node: Extract<BlockNode, { kind: "table" }>): TableView {
  const rows: Record<string, unknown>[] = node.rows.map((cells, r) => {
    const row: Record<string, unknown> = {};
    node.columns.forEach((col, i) => {
      const typed = node.typed(r, col);
      row[col] = typed !== undefined ? typed : (cells[i] ?? "");
    });
    return row;
  });
  const view: TableView = {
    kind: "table",
    columns: node.columns,
    rows: rows as Record<string, string>[],
    rowCount: rows.length,
    pos: node.pos,
    column(name) {
      return rows.map((r) => r[name as string]) as never;
    },
    find(p) {
      return rows.find((r, i) => p(r as never, i)) as never;
    },
    rowPos(i) {
      return node.rowPos(i);
    },
    [Symbol.iterator](): Iterator<Record<string, string>> {
      return rows[Symbol.iterator]() as Iterator<Record<string, string>>;
    },
  };
  return view;
}

/** A `ListView` over a projected list block. */
function listView(node: Extract<BlockNode, { kind: "list" }>): ListView {
  const items = node.items;
  const view: ListView = {
    kind: "list",
    ordered: node.ordered,
    items,
    length: items.length,
    pos: node.pos,
    [Symbol.iterator]() {
      return items[Symbol.iterator]();
    },
  };
  return view;
}

/** A `CodeView` over a projected code block. */
function codeView(node: Extract<BlockNode, { kind: "code" }>): CodeView {
  return { kind: "code", lang: node.lang, value: node.value, pos: node.pos };
}

/** A `ParagraphView` over a projected paragraph block. */
function paragraphView(node: Extract<BlockNode, { kind: "paragraph" }>): ParagraphView {
  return { kind: "paragraph", text: node.text, pos: node.pos };
}

/** Project one `BlockNode` into its discriminated `BlockView`. */
function blockView(node: BlockNode): BlockView {
  switch (node.kind) {
    case "table":
      return tableView(node);
    case "list":
      return listView(node);
    case "code":
      return codeView(node);
    case "paragraph":
      return paragraphView(node);
  }
}

// ── Grammar inspection: the declared name set of a level ──────────────────────────

/** Unwrap `optional(spec)` to its inner tagged spec. */
function unwrapInner(spec: Spec): SectionSpec | OneOfSpec | GapSpec {
  return spec.kind === "optional" ? unwrapInner((spec as OptionalSpec).spec) : spec;
}

/**
 * The declared heading names of a level's grammar — every spelling of every `section` /
 * `oneOf` slot (alias sets flattened). Gaps contribute nothing. Used to partition a level's
 * sections into declared (a dual-key key) vs unknown (a `body.unknown` entry).
 */
function declaredNames(seq: SectionSeq | undefined): Set<string> {
  const names = new Set<string>();
  if (!seq) return names;
  for (const spec of seq.specs) {
    const inner = unwrapInner(spec);
    if (inner.kind === "section") for (const n of (inner as SectionSpec).names) names.add(n);
    else if (inner.kind === "oneOf") for (const n of (inner as OneOfSpec).names) names.add(n);
  }
  return names;
}

/** The declared `SectionOpts` for a heading at this level (content / children / anchor / rules). */
function optsFor(seq: SectionSeq | undefined, name: string): SectionOpts | undefined {
  if (!seq) return undefined;
  for (const spec of seq.specs) {
    const inner = unwrapInner(spec);
    if (inner.kind === "section" && (inner as SectionSpec).names.includes(name)) {
      return (inner as SectionSpec).opts;
    }
    if (inner.kind === "oneOf" && (inner as OneOfSpec).names.includes(name)) {
      return (inner as OneOfSpec).opts;
    }
  }
  return undefined;
}

/** Structural type-guard: a single `LeafSpec` vs a `Record<string, LeafSpec>` content record. */
function isLeafSpec(c: LeafSpec | Record<string, LeafSpec>): c is LeafSpec {
  return typeof (c as LeafSpec).kind === "string";
}

// ── SectionNode → SectionView ─────────────────────────────────────────────────────

/** The full subtree text of a section: own prose plus every descendant's prose. */
function subtreeText(node: SectionNode): string {
  const parts: string[] = [ownProse(node)];
  for (const child of node.sections) parts.push(subtreeText(child));
  return parts.filter((p) => p.length > 0).join("\n\n");
}

/**
 * A section's own paragraph prose (heading-direct paragraphs), joined by blank lines.
 * Each paragraph's soft line wraps (newlines inside one paragraph) collapse to single spaces —
 * a paragraph is one continuous line of prose — while separate paragraphs stay `\n\n`-joined.
 */
function ownProse(node: SectionNode): string {
  return node.blocks
    .filter((b): b is Extract<BlockNode, { kind: "paragraph" }> => b.kind === "paragraph")
    .map((b) => unwrapSoftBreaks(b.text))
    .join("\n\n");
}

/** Collapse a paragraph's soft line wraps (intra-paragraph newlines + surrounding spaces) to one space. */
function unwrapSoftBreaks(text: string): string {
  return text.replace(/[ \t]*\n[ \t]*/g, " ");
}

/**
 * Every `^block-id` of a section, in document order: the section-level anchors (`node.anchors`)
 * followed by each heading-direct block's bound anchor (`block.anchor`). Nested subsections' ids
 * are reached through `.sections`, not folded in here.
 */
function sectionAnchors(node: SectionNode): string[] {
  const ids = node.anchors.slice();
  for (const b of node.blocks) if (b.anchor !== undefined) ids.push(b.anchor);
  return ids;
}

/**
 * Build a `SectionView` (lazy facade) over one projected `SectionNode`. `opts` is the section's
 * declared `SectionOpts` (if any) — its `children` grammar drives the nested `sections` group's
 * partition, and a `content` *record* of `^anchor`-bound tables surfaces each as a named field
 * on the view (proposed-shape §6 "Naming a table as a field", record row).
 */
function sectionView(node: SectionNode, opts: SectionOpts | undefined): SectionView {
  const tables = node.blocks
    .filter((b): b is Extract<BlockNode, { kind: "table" }> => b.kind === "table")
    .map(tableView);
  const lists = node.blocks
    .filter((b): b is Extract<BlockNode, { kind: "list" }> => b.kind === "list")
    .map(listView);

  const view: SectionView = {
    name: node.name,
    pos: node.pos,
    // The section's `^block-id`s (§6): section-level anchors plus every block-bound anchor in this
    // section, in document order. (A `^id` terminating the section's prose binds to that paragraph
    // block in the projection, not to `node.anchors`, but it is still one of the section's ids.)
    anchors: sectionAnchors(node),
    text(scope: "prose" | "all" = "prose"): string {
      return scope === "all" ? subtreeText(node) : ownProse(node);
    },
    tables,
    lists,
    byAnchor(id: string): BlockView | undefined {
      const block = node.blocks.find((b) => b.anchor === id);
      return block ? blockView(block) : undefined;
    },
    // `sections` is the same dual-key group shape as `doc.body` — recursion is uniform,
    // partitioned against this section's declared `children` grammar.
    sections: sectionGroup(node.sections, opts?.children),
  };
  // The sole table, when exactly one. (Dynamic `Record<string,string>` rows — a one-table
  // section is not auto-typed, since that would make its type depend on content count.)
  if (tables.length === 1) view.table = tables[0];

  // A `content` record of `^anchor`-bound tables → each becomes a named field on the view
  // (`doc.body.decision.components` / `.risks`), the `TableView` for the block at that anchor.
  if (opts?.content !== undefined && !isLeafSpec(opts.content)) {
    for (const [fieldName, leaf] of Object.entries(opts.content)) {
      if (leaf.kind !== "table") continue;
      const anchor = (leaf.config as { anchor?: string } | undefined)?.anchor;
      const block = anchor ? node.blocks.find((b) => b.anchor === anchor) : undefined;
      if (block && block.kind === "table" && !(fieldName in view)) {
        (view as unknown as Record<string, TableView>)[fieldName] = tableView(block);
      }
    }
  }
  return view;
}

// ── SectionNode[] → SectionGroup (the dual-key access object) ──────────────────────

/**
 * Build the dual-key `SectionGroup` over a sibling list of sections, partitioned against the
 * level's grammar `seq`:
 *   - a section whose heading matches a declared slot is a DUAL-KEY key — its exact heading
 *     text and its generated lowerCamelCase alias both resolve to one `SectionView` (these are
 *     the only ENUMERABLE own keys, so an empty group deep-equals `{}`);
 *   - a section matching no declared slot (`gap()` / `allowUnknown` admission) lands in
 *     `unknown` (document order), reachable by index / iteration and by `.section(name)`, but
 *     never an enumerable key;
 *   - `unknown`, `section`, and the internal exact-name lookup are NON-ENUMERABLE, so a group
 *     with no declared-present sections compares `toEqual({})` (c08's `whatWorked.sections`).
 *
 * A declared-but-absent section is simply not a key here ⇒ it reads as `undefined` (an absent
 * optional section's `undefined`; a required absent section blocks `doc` upstream anyway).
 */
function sectionGroup(nodes: SectionNode[], seq: SectionSeq | undefined): SectionGroup {
  const declared = declaredNames(seq);

  // Build each section's view, partitioning declared vs unknown in document order. The value a
  // declared key binds is normally the `SectionView`, but a declared section whose sole `content`
  // is a single `table(...)` leaf PROMOTES to that table's `TableView` — the "heading is the
  // table" case (proposed-shape §6 "Naming a table as a field", first row). The `.section(name)`
  // accessor always hands back the underlying `SectionView`, promoted or not.
  const declaredKeyed: { view: SectionView; value: SectionView | TableView }[] = [];
  const unknown: SectionView[] = [];
  // Exact-name → SectionView, over EVERY section (declared and unknown) for `.section(name)`.
  const byExact = new Map<string, SectionView>();
  for (const node of nodes) {
    const opts = optsFor(seq, node.name);
    const view = sectionView(node, opts);
    if (!byExact.has(view.name)) byExact.set(view.name, view); // first occurrence wins
    if (declared.has(node.name)) {
      declaredKeyed.push({ view, value: promotedTable(view, opts) ?? view });
    } else {
      unknown.push(view);
    }
  }

  // Start from a bare object so its OWN enumerable keys are only the dual-key section keys.
  const group = {} as SectionGroup;

  // Non-enumerable invariants: `unknown` (always present) + the `.section()` accessor (always the
  // SectionView) + the internal exact-name index. Non-enumerable ⇒ an empty group is `toEqual({})`.
  Object.defineProperty(group, "unknown", {
    value: unknown,
    enumerable: false,
    writable: false,
    configurable: true,
  });
  Object.defineProperty(group, "section", {
    value: (name: string): SectionView | undefined => byExact.get(name),
    enumerable: false,
    writable: false,
    configurable: true,
  });

  // Enumerable dual-key keys — exact heading text + generated lowerCamelCase alias — for the
  // declared-and-present sections only. First occurrence wins; a camel key never clobbers a
  // reserved member, an exact-name key, or a prior alias (collisions are a structure-plane
  // error, so first-wins keeps the access object stable).
  for (const { view, value } of declaredKeyed) {
    if (!(view.name in group)) group[view.name] = value;
    const key = toCamelKey(view.name);
    if (key !== "" && key !== view.name && !(key in group)) group[key] = value;
  }

  return group;
}

/**
 * The `TableView` a section promotes to, or `undefined`. A section whose sole declared `content`
 * is a single `table(...)` leaf and which holds exactly one table block is the "heading is the
 * table" case — its dual-key key binds the `TableView` directly (proposed-shape §6).
 */
function promotedTable(view: SectionView, opts: SectionOpts | undefined): TableView | undefined {
  if (!opts || opts.content === undefined) return undefined;
  if (!isLeafSpec(opts.content) || opts.content.kind !== "table") return undefined;
  return view.table;
}

// ── Public entry ─────────────────────────────────────────────────────────────────

/**
 * Build the typed model for a validated document — a lazy facade over the projection.
 * `frontmatter` is the parsed YAML; `body` is the dual-key group over the top-level sections
 * (partitioned against `def.body`); `byAnchor` resolves a `^anchor` anywhere in the document.
 */
export function buildModel<F, B>(
  tree: DocTree,
  def: ContractDef<F, B>,
  _ctx: ValidateCtx,
): Doc<F, B> {
  const frontmatter = (tree.frontmatter ? tree.frontmatter.data : undefined) as F;
  const body = sectionGroup(tree.root.sections, def.body as SectionSeq | undefined) as unknown as B;

  return {
    frontmatter,
    body,
    byAnchor(id: string): BlockView | undefined {
      return findAnchor(tree.root.sections, id);
    },
  };
}

/** Walk the section tree depth-first for a block carrying anchor `id`. */
function findAnchor(nodes: SectionNode[], id: string): BlockView | undefined {
  for (const node of nodes) {
    const block = node.blocks.find((b) => b.anchor === id);
    if (block) return blockView(block);
    const nested = findAnchor(node.sections, id);
    if (nested) return nested;
  }
  return undefined;
}
