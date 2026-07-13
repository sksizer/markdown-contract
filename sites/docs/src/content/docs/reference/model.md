---
title: Reading the typed model
description: The typed, navigable Doc that contract.read() returns and validate() hands back — frontmatter, body navigation, tables, and anchors.
---

Validation answers *"is this document well-formed?"*. Once the answer is yes, you usually want the second thing: the document's data, typed and navigable. That is the **typed model** — the `Doc` that [`contract.read()`](/reference/api/) returns and that a clean [`validate()`](/reference/api/) hands back on its `doc` field.

The model is a **lazy facade over the projection**: it reads the same `DocTree` the validator produced, preserving positions, and is built only for a valid document. The validator never consults it — findings come from the projection, Zod, and the grammar — so the model is purely additive on top of a passing document.

## validate() vs read(): the two doors

A `Contract` exposes two doors onto one engine, mirroring Zod's `safeParse` / `parse`.

| Door | Signature | On an error-level finding | Returns |
| --- | --- | --- | --- |
| `validate` | `validate(source, ctx)` / `validate(tree, ctx)` | never throws | `ValidationResult` |
| `read` | `read(source, ctx)` | throws `ContractError` | `Doc<F, B>` |

`validate()` is the "show me everything" door: findings as data, never throws.

```ts
const { findings, doc, tree } = contract.validate(source, { path: "doc.md" });
```

- `findings` — every plane's findings, merged and deterministically sorted.
- `doc` — the typed model, **present iff no error-level finding**. Absent (`undefined`) when the document has an error, so a `doc` in hand means the document validated.
- `tree` — the raw projection, always returned (see [projection](#doctree-the-projection-underneath) below).

`read()` is the "give me the data or fail" door: it returns the `Doc` directly, or throws `ContractError` on an error-level finding.

```ts
const doc = contract.read(source, { path: "doc.md" }); // Doc<F, B> or throws
```

`read()` takes a `source` string (there is no `read(tree, …)` overload — only `validate()` accepts a pre-parsed tree). The `Doc` `validate().doc` hands back and the one `read()` returns are the same shape. Full call signatures live in the [API reference](/reference/api/).

## Doc: frontmatter and body

```ts
type Doc<F, B> = {
  frontmatter: F;
  body: B;
  byAnchor(id: string): BlockView | undefined;
  inlineSpans(row: Record<string, string>, col: string): InlineSpan[];
};
```

`doc.frontmatter` is `tree.frontmatter.data` — the document's parsed YAML frontmatter (the `yaml` package's parse of the block) — typed by the contract's frontmatter schema (`F`).

`doc.body` is the **dual-key section group** over the document's top-level sections, partitioned against the body grammar (`def.body`). That group is where body navigation happens.

`doc.byAnchor(id)` resolves a `^block-id` anywhere in the document; `doc.inlineSpans(row, col)` is a doc-wide companion for recovering inline-code spans inside a table cell. Both are covered under [Anchors](#anchors) below.

:::note
`doc` exposes `frontmatter`, `body`, `byAnchor`, and `inlineSpans` — there is no top-level `doc.anchors`. A section's own anchor ids live on [`SectionView.anchors`](#sectionview).
:::

## Body navigation

`doc.body` is a `SectionGroup`: one section resolves through several keys, and the group is deliberately shaped so that an empty group deep-equals `{}`.

### Dual keys: camelCase alias and exact heading

A declared-and-present section is reachable two ways — its **exact heading text** and a generated **lowerCamelCase alias**:

```ts
doc.body["Summary"]        // exact heading text
doc.body.summary           // generated lowerCamelCase alias
doc.body.section("Summary") // explicit accessor — always the SectionView
```

The exact-name key and the camel alias both resolve to the same section. The camel alias is what you reach for in code (`doc.body.summary`); the exact key and `.section(name)` handle headings whose text is dynamic or does not form a clean identifier.

`.section(name)` is the accessor for edge cases: it takes the exact heading text and **always** returns the underlying `SectionView` (see the [table-promotion](#tables) note — dual-key access can hand back a `TableView`, but `.section()` never does). It resolves over *every* section, declared or unknown.

### What each key resolves to

| Section in the grammar | Present in the document? | How it reads |
| --- | --- | --- |
| declared | present | a dual-key key → `SectionView` (or a promoted `TableView`) |
| declared | absent | not a key ⇒ reads as `undefined` |
| matches no slot (`gap()` / `allowUnknown`) | present | lands in `body.unknown`, not an enumerable key |

`body.unknown` is always present (`[]` when none) and holds gap-admitted / `allowUnknown` sections in document order:

```ts
for (const s of doc.body.unknown) console.log(s.name);
```

`unknown` and `section` are **non-enumerable**, so a group with no declared-and-present section compares `toEqual({})`. The only enumerable own keys are the dual-key keys of declared, present sections.

### SectionView

Each section resolves to a `SectionView` — a lazy facade over one projected section node.

| Member | Type | What it is |
| --- | --- | --- |
| `name` | `string` | the trimmed heading text |
| `pos` | `SourcePos` | the heading's source position |
| `anchors` | `string[]` | the section's `^block-id`s, in document order |
| `text(scope?)` | `(scope?: "prose" \| "all") => string` | prose text — see below |
| `table` | `TableView?` | the sole table, present only when the section has exactly one |
| `tables` | `TableView[]` | every table block in the section |
| `lists` | `ListView[]` | every list block in the section |
| `byAnchor(id)` | `(id) => BlockView \| undefined` | a block in this section by its anchor |
| `sections` | `SectionGroup` | nested subsections — the same dual-key shape |

`text()` defaults to `"prose"`: the section's own heading-direct paragraphs, with soft line-wraps collapsed to single spaces. `text("all")` returns the full subtree — own prose plus every descendant section's prose.

```ts
doc.body.summary.text();      // this section's own paragraphs
doc.body.summary.text("all"); // plus every subsection's prose
```

`sections` recurses uniformly: it is the same dual-key `SectionGroup` as `doc.body`, partitioned against this section's declared `children` grammar, so nested navigation reads identically at every depth:

```ts
doc.body.operations.sections.rollback.text();
```

:::note
`SectionView` surfaces **tables and lists** directly (`.tables`, `.table`, `.lists`). Code and paragraph blocks are reached by their anchor — `section.byAnchor(id)` returns a `.kind`-discriminated `BlockView` — or from the projection's `section.blocks` (see [below](#doctree-the-projection-underneath)).
:::

When a section's `content` names tables by `^anchor` (a record of leaves), each named table also surfaces as a field on the view — e.g. `doc.body.decision.components` is the `TableView` for the block at that anchor.

### Repeatable slots are positional arrays

A slot declared `repeatable: true` may recur as peers at one level. Its dual-key key then binds an **array** of the per-occurrence value, in document order — the first occurrence establishes the key and position, later peers append:

```ts
// section("Risk", { repeatable: true, ... })
for (const risk of doc.body.risk) {   // SectionView[]
  console.log(risk.text());
}
```

If the repeatable slot's sole content is a single table, each occurrence promotes (see [Tables](#tables)) and the key binds a `TableView[]` instead. A non-repeatable slot binds a single value, exactly as above.

## Tables

`TableView` is the typed, iterable view over a table block.

```ts
interface TableView<Row = Record<string, string>> extends Iterable<Row> {
  kind: "table";
  columns: string[];
  rows: Row[];
  rowCount: number;
  pos: SourcePos;
  column<K extends keyof Row>(name: K): Row[K][];
  find(p: (row: Row, i: number) => boolean): Row | undefined;
  rowPos(i: number): SourcePos;
  cellPos(row: Row, name: string): SourcePos;
}
```

Each row is a record keyed by column name. Iterate it directly, or reach for a row / column:

```ts
const files = doc.body.changedFiles.table!;
for (const row of files) console.log(row.Path, row.Status); // TableView is iterable

files.column("Path");                          // one column, as an array
files.find((r) => r.Status === "removed");     // the first matching row
files.rowPos(0);                               // source line of the first body row
files.cellPos(files.rows[0], "Path");          // precise position of one cell
```

`column(name)` returns that column's values across all rows; `find(p)` returns the first row satisfying the predicate (or `undefined`). `rowPos(i)` is the i-th body row's source line; `cellPos(row, name)` takes a row **object** (from `rows`) and a column name and returns the cell's content-start position, or `{ line: 0 }` when the row or column is not found.

A cell reads back the **typed** value when a declared, transforming `cells` schema produced one — e.g. a `Location` column that transforms `path#symbol` into `{ path, symbol? }` — and the **raw string** otherwise. The typed value rides only through this model; the projection's rows stay raw strings.

:::note[Table promotion — "the heading is the table"]
A section whose **sole** `content` is a single `table(...)` leaf promotes: its dual-key key binds the `TableView` directly, not a `SectionView`. So `doc.body.changedFiles` may itself be the table. `.section("Changed Files")` still returns the underlying `SectionView` if you need the section wrapper.
:::

### The other block views

`byAnchor()` (on the doc or a section) returns a `BlockView` — a four-way union discriminated on `.kind`:

| `kind` | View | Fields beyond `kind` / `pos` |
| --- | --- | --- |
| `"table"` | `TableView` | `columns`, `rows`, `rowCount`, `column`, `find`, `rowPos`, `cellPos` |
| `"list"` | `ListView` | `ordered`, `items`, `length` (iterable) |
| `"code"` | `CodeView` | `lang` (`string \| null`), `value` |
| `"paragraph"` | `ParagraphView` | `text` |

`ListView` is iterable over its items; a list declared with a transforming `everyItem` schema reads each item back as its typed value, a plain list stays raw `ListItem`s.

```ts
const block = doc.byAnchor("summary");
if (block?.kind === "code") console.log(block.lang, block.value);
```

## Anchors

`doc.byAnchor(id)` resolves a `^block-id` anywhere in the document (depth-first, first match wins) to a `BlockView`, or `undefined`:

```ts
doc.byAnchor("decision-table"); // TableView | ListView | CodeView | ParagraphView | undefined
```

Within a section, `SectionView.byAnchor(id)` resolves an anchor bound to a block in *that* section, and `SectionView.anchors` lists the section's own ids (section-level anchors followed by each block-bound anchor, in document order).

`doc.inlineSpans(row, col)` is a doc-wide companion to `TableView.cellPos`: given a row object and a column name, it finds the table holding that row and returns the cell's inline-code spans (`[]` when the cell has none, or the row is not found) — useful for masking or recovering the backticks that flattening drops.

## DocTree: the projection underneath

Both doors also expose the raw projection. `validate()` returns it on `tree`; [`parse()`](/reference/api/) returns it on its own. The typed model is a facade over exactly this structure, so when you need untyped, position-first access — or want to navigate before (or without) validating — you work against the `DocTree` directly.

```ts
interface DocTree {
  frontmatter: { raw; data; pos; lineForPath } | null;
  body: string;          // verbatim source after the frontmatter block
  root: SectionNode;     // root.sections are the top-level H2s
  mdast: Root;           // the raw layer-0 tree
}
```

A `SectionNode` is the untyped counterpart of a `SectionView`:

| Field | Type | Meaning |
| --- | --- | --- |
| `name` | `string` | trimmed heading text (exact, case-sensitive) |
| `depth` | `number` | 1..6 |
| `pos` | `SourcePos` | the heading's source position |
| `sections` | `SectionNode[]` | nested subsections, by heading depth |
| `blocks` | `BlockNode[]` | heading-direct content (no hoisting) |
| `anchors` | `string[]` | section-level `^block-id`s |

Navigating `root.sections` by hand is common enough that the package ships standalone helpers over the section tree, re-exported from the package root:

| Helper | What it finds |
| --- | --- |
| `findSection(root, name, opts?)` | the first top-level section matching `name` (with `depth` / `ci` options) |
| `sectionsAt(root, depth)` | the sections at a given heading depth |
| `sectionForLine(root, line, opts?)` | the section enclosing a source line |
| `sectionSpans(root, lineCount, opts?)` | each section paired with its body line extent |
| `blocksOfKind(section, kind, opts?)` | a section's blocks of one kind (`recursive` descends subsections) |

These are pure functions over the existing shapes — they parse, mutate, and reshape nothing.

### Source-faithful table cells

The projection **flattens** inline markup: a `` `sdlc x new` `` cell reads back as the bare text `sdlc x new`, backticks dropped (the same flattening `inlineSpans` lets you recover). When you need the verbatim cell text — a cell that must keep its backticks, a `path#symbol` reference — two helpers re-split a projected table's rows straight from the raw source lines:

| Helper | What it returns |
| --- | --- |
| `rawTableRow(table, source, i)` | the i-th data row's literal, unpadded cell array (`string[]`), split from its source line |
| `rawTableRows(table, source, opts?)` | `{ header, rows }` — the header and every data row re-split verbatim; `opts.pad` (`"header"` or a number) pads short rows |

Both take the projection's table `BlockNode` (from `section.blocks`) and the document `source` — the whole string or its pre-split lines — not a `TableView`.

## See also

- [Consume as data](/examples/consume-as-data/) — worked examples reading a document's tables, sections, and frontmatter through the model.
- [Dialect](/examples/dialect/) — anchors and wikilinks in the projection.
- [API reference](/reference/api/) — the full `Contract`, `validate`, `read`, and `parse` signatures.
- [Glossary](/reference/glossary/) — definitions for the terms this page leans on (projection, SectionView, dual-key, dialect anchors).
