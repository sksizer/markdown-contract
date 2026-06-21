/**
 * Out-of-model (OOM) — builds the typed, navigable `Doc` from a projected tree
 * and a compiled contract. `read()` and `validate().doc` hand this model back
 * (C-0002 / D-0005). It is a **lazy facade over the layer-1 projection** (no second
 * copy, positions preserved): the validator never depends on it (findings come from
 * projection + Zod + grammar), it is built only on demand, and only for a valid doc.
 *
 * SCOPE (T-3NC8 — the BASIC model). This implements the functional core the docRules,
 * the `doc`-iff-valid gate, and the end-to-end fixtures need:
 *   - `doc.frontmatter` — the parsed `tree.frontmatter?.data`;
 *   - `doc.body` — a dual-key `SectionGroup` over `tree.root.sections` (exact heading,
 *     generated lowerCamelCase, and `.section(name)`), recursively at every depth;
 *   - `SectionView` — `name`, `pos`, `anchors`, `text(scope?)`, `tables`/`table`,
 *     `lists`, `byAnchor(id)`, nested `sections`;
 *   - `doc.byAnchor(id)` — doc-wide anchor lookup → a `BlockView`.
 *
 * DEFERRED to T-6PV4 (the rich typed consumption surface):
 *   - typed `TableView<Row>` rows from `cells` (here rows are untyped
 *     `Record<string, string>` — enough for docRules);
 *   - `Infer<Contract>` type-level inference (typed section keys, typed columns);
 *   - the consumption-fixture edge cases (`unknown` partitioning by the contract, the
 *     `CodeView`/`ParagraphView` narrowing surface beyond `byAnchor`, etc.).
 * `body.unknown` is present here (always `[]` for now — T-6PV4 partitions declared vs
 * gap-admitted sections); a clear marker comment flags each deferral.
 */
import { toCamelKey } from "./camel.js";
import type {
  BlockNode,
  BlockView,
  CodeView,
  ContractDef,
  Doc,
  DocTree,
  ListView,
  ParagraphView,
  SectionGroup,
  SectionNode,
  SectionView,
  TableView,
  ValidateCtx,
} from "./types.js";

// ── BlockNode → BlockView (the four-way union, discriminated on `.kind`) ──────────

/**
 * A `TableView` over a projected table block. T-6PV4 makes `Row` the contract-typed
 * shape (from the `cells` declaration); here every row is the dynamic
 * `Record<string, string>` keyed by column name — enough for docRules and the gate.
 */
function tableView(node: Extract<BlockNode, { kind: "table" }>): TableView {
  const rows: Record<string, string>[] = node.rows.map((cells) => {
    const row: Record<string, string> = {};
    node.columns.forEach((col, i) => {
      row[col] = cells[i] ?? "";
    });
    return row;
  });
  const view: TableView = {
    kind: "table",
    columns: node.columns,
    rows,
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
      return rows[Symbol.iterator]();
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

// ── SectionNode → SectionView ─────────────────────────────────────────────────────

/** The full subtree text of a section: own prose plus every descendant's prose. */
function subtreeText(node: SectionNode): string {
  const parts: string[] = [ownProse(node)];
  for (const child of node.sections) parts.push(subtreeText(child));
  return parts.filter((p) => p.length > 0).join("\n\n");
}

/** A section's own paragraph prose (heading-direct paragraphs), joined by blank lines. */
function ownProse(node: SectionNode): string {
  return node.blocks
    .filter((b): b is Extract<BlockNode, { kind: "paragraph" }> => b.kind === "paragraph")
    .map((b) => b.text)
    .join("\n\n");
}

/** Build a `SectionView` (lazy facade) over one projected `SectionNode`. */
function sectionView(node: SectionNode): SectionView {
  const tables = node.blocks
    .filter((b): b is Extract<BlockNode, { kind: "table" }> => b.kind === "table")
    .map(tableView);
  const lists = node.blocks
    .filter((b): b is Extract<BlockNode, { kind: "list" }> => b.kind === "list")
    .map(listView);

  const view: SectionView = {
    name: node.name,
    pos: node.pos,
    anchors: node.anchors.slice(),
    text(scope: "prose" | "all" = "prose"): string {
      return scope === "all" ? subtreeText(node) : ownProse(node);
    },
    tables,
    lists,
    byAnchor(id: string): BlockView | undefined {
      const block = node.blocks.find((b) => b.anchor === id);
      return block ? blockView(block) : undefined;
    },
    // `sections` is the same dual-key group shape as `doc.body` — recursion is uniform.
    sections: sectionGroup(node.sections),
  };
  // The sole table, when exactly one (untyped — T-6PV4 keeps it dynamic).
  if (tables.length === 1) view.table = tables[0];
  return view;
}

// ── SectionNode[] → SectionGroup (the dual-key access object) ──────────────────────

/**
 * Build the dual-key `SectionGroup` over a sibling list of sections: exact heading text,
 * generated lowerCamelCase alias, and a `.section(name)` accessor all resolve to one
 * `SectionView`. `unknown` is always present.
 *
 * T-6PV4 partitions `unknown` (gap-admitted / undeclared sections) against the contract;
 * here it is always `[]` (the basic model does not yet thread the contract's declared slot
 * set into the group), and dotted aliases are generated for every section's heading.
 */
function sectionGroup(nodes: SectionNode[]): SectionGroup {
  const views = nodes.map(sectionView);

  // Exact-name index (first occurrence wins — duplicates are a structure-plane error).
  const byExact = new Map<string, SectionView>();
  for (const v of views) if (!byExact.has(v.name)) byExact.set(v.name, v);

  const group = {
    unknown: [] as SectionView[], // T-6PV4: partition declared vs gap-admitted sections.
    section(name: string): SectionView | undefined {
      return byExact.get(name);
    },
  } as SectionGroup;

  // Exact heading text keys + generated lowerCamelCase aliases.
  for (const v of views) {
    if (!(v.name in group)) group[v.name] = v;
    const key = toCamelKey(v.name);
    // Don't clobber a reserved member, an exact-name key, or a prior alias (collisions
    // are a structure-plane error; first wins here so the access object stays stable).
    if (key !== "" && key !== v.name && !(key in group)) group[key] = v;
  }

  return group;
}

// ── Public entry ─────────────────────────────────────────────────────────────────

/**
 * Build the typed model for a validated document — a lazy facade over the projection.
 * `frontmatter` is the parsed YAML; `body` is the dual-key group over the top-level
 * sections; `byAnchor` resolves a `^anchor` anywhere in the document.
 */
export function buildModel<F, B>(
  tree: DocTree,
  _def: ContractDef<F, B>,
  _ctx: ValidateCtx,
): Doc<F, B> {
  const frontmatter = (tree.frontmatter ? tree.frontmatter.data : undefined) as F;
  const body = sectionGroup(tree.root.sections) as unknown as B;

  return {
    frontmatter,
    body,
    byAnchor(id: string): BlockView | undefined {
      return findAnchor(tree.root.sections, id);
    },
  };
}

/** Walk the section tree depth-first for a block (or section) carrying anchor `id`. */
function findAnchor(nodes: SectionNode[], id: string): BlockView | undefined {
  for (const node of nodes) {
    const block = node.blocks.find((b) => b.anchor === id);
    if (block) return blockView(block);
    const nested = findAnchor(node.sections, id);
    if (nested) return nested;
  }
  return undefined;
}
