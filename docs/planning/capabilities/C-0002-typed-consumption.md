---
type: capability
schema_version: '1'
id: C-0002
kind: feature
title: Typed consumption
status: open/verified
created: '2026-06-20'
parent_key: null
contains: []
related:
  - '[[DR-0002-typed-consumption]]'
  - '[[C-0001-contract-validation]]'
  - '[[C-0005-two-plane-contract-engine]]'
tags:
  - consumption
  - typed-model
  - oom
need_human_review: true
---

# Typed consumption

## Summary

- Read a validated document as a typed, navigable model — named sections, typed table rows, anchor lookups — without re-parsing or hand-rolling selectors. ^summary
- The reward for validity: the same contract that checks a document also types it.

## Statement

Once a document passes its contract, a consumer reads it as data — the **same** typed model from either door: `validate()` hands it back as `doc?` (present only when the document is valid) and `read()` returns it directly (or throws). Its shape is inferred from the contract: sections reachable by name, tables yielding typed rows, anchors resolving to blocks. Report ops and summaries consume structure, not an AST.

## What it provides

- `read()` / `validate().doc` returning a contract-typed model (`Infer<Contract>`).
- `SectionView` (text, tables, lists, nested sections), `TableView<Row>` (typed rows, `column`, `find`, `rowPos`), and `byAnchor`.
- Dual-key section access — typed key, bracket, lowerCamelCase, and `.section()`.

## Inputs

- A valid document plus the `Contract` whose declared section names, table columns, and cell schemas drive the inferred type — read through one of two doors (mirroring Zod's `parse` / `safeParse`):

```ts
const doc = Contract.read(source, { path });          // model only; throws ContractError on error-level
const { doc } = Contract.validate(source, { path });  // model present iff valid
type Decision = Infer<typeof DecisionContract>;        // { frontmatter; body; byAnchor }
```

## Outputs

- A typed, navigable model — a lazy facade over the projection (no second copy; positions preserved). How the pieces relate: a `ValidationResult.doc` (or `read()`) **is** a `Doc`; `Doc.body` is the section tree, each entry a `SectionView`; a `SectionView` *contains* content blocks — its `tables`, `lists`, and `byAnchor` results — and nested `sections`; an addressed content block is a `BlockView`. A `SectionView` is a section, **not** a `BlockView`: sections hold blocks, they are not themselves one.

```ts
type Doc<F, B> = { frontmatter: F; body: B; byAnchor(id: string): BlockView | undefined };

interface SectionView {                            // a heading-delimited section — holds blocks; not itself a BlockView
  name: string; pos: SourcePos; anchors: string[];
  text(scope?: "prose" | "all"): string;          // default "prose" (own paragraphs); "all" = subtree
  table?: TableView<Record<string, string>>;       // the sole table, if exactly one (untyped)
  tables: TableView<Record<string, string>>[];
  lists: ListView[];
  byAnchor(id: string): BlockView | undefined;
  sections: SectionGroup;                           // same dual-key shape as doc.body
}

interface TableView<Row = Record<string, string>> extends Iterable<Row> {
  kind: "table"; columns: string[]; rows: Row[]; rowCount: number; pos: SourcePos;
  column<K extends keyof Row>(name: K): Row[K][];
  find(p: (row: Row, i: number) => boolean): Row | undefined;
  rowPos(i: number): SourcePos;
}
interface ListView extends Iterable<ListItem> { kind: "list"; ordered: boolean; items: ListItem[]; length: number; pos: SourcePos }
interface CodeView      { kind: "code"; lang: string | null; value: string; pos: SourcePos }
interface ParagraphView { kind: "paragraph"; text: string; pos: SourcePos }
type BlockView = TableView | ListView | CodeView | ParagraphView;   // discriminated on .kind
```

- Dual-key section access, generated from each declared heading; all three resolve to one `SectionView`:

```ts
doc.body["Files to touch"]          // exact heading text — always available
doc.body.filesToTouch               // lowerCamelCase — generated alongside (Unicode-aware)
doc.body.section("Files to touch")  // explicit accessor for dynamic / edge names
```

- `body.unknown: SectionView[]` is always present (`[]` when none) for gap-admitted sections; an absent optional section reads as `undefined`; required sections get a non-optional key.

## Hook points

- `byAnchor(id)` — doc-wide and per-section — reaches any `^anchored` block the contract doesn't declare, returning a dynamic `BlockView` (`Record<string,string>` rows) you narrow on `.kind`.
- `.section(name)` is the dynamic escape hatch for headings not known at author time.

## Underlying implementation

- Planned: `src/core/model.ts` — a lazy facade over the layer-1 projection, a submodule of the engine. **The validator never consults it**; it is built only on demand (`read`, or `validate().doc`), additive and deferrable behind the finding path.
- Fixed by the `D·consumption-oom` ADR. Not yet built.

## Notes

Serves [[DR-0002-typed-consumption]]; additive over [[C-0001-contract-validation]] (the validator never depends on it) and rests on [[C-0005-two-plane-contract-engine]]. The model surface is the `D·consumption-oom` ADR. Status `open/planned`.
