---
type: decision
schema_version: '1'
id: D-0005
status: open/accepted
title: Consumption — the typed object model over a validated document
created: '2026-06-20'
related:
  - '[[C-0002-typed-consumption]]'
tags:
  - typed-model
  - oom
  - consumption
  - inference
need_human_review: true
---
# Consumption — the typed object model over a validated document

## Summary

- `Infer<Contract>` is a typed, navigable object model of the document: `Doc = { frontmatter, body,
  byAnchor }`, with `SectionView`, `TableView<Row>`, `ListView` / `CodeView` / `ParagraphView`, and a
  `kind`-discriminated `BlockView` (U2).
- Sections are reachable three ways — exact bracket, lowerCamelCase (Unicode-aware), and
  `.section()` — and `SectionGroup` repeats that dual-key shape at every depth (U3).
- `unknown: SectionView[]` is always present (U5); an absent optional section reads as `undefined`
  (U6); the `doc` ↔ `tree` boundary is explicit (U9).
- Two doors: `read()` (model only, throws on error) and `validate().doc` (model on success).
- The model is a **lazy facade over the projection — additive, optional, and the validator never
  depends on it.**

^summary

## Context

A validated document is worth reading as data, not re-walking as an AST. The same contract that checks a
document already knows its section names, its table columns, and its cell types — so it can *type* the
document, turning section names into keys, columns into row fields, and cell schemas into field types.
That typed view is the reward for validity, and the consumption half of the engine.

## Decision

### Shape

```ts
type Decision = Infer<typeof DecisionContract>;
// {
//   frontmatter: { ... };
//   body: {
//     summary: SectionView;
//     decision: { components: TableView<{ "#": string; Component: string; Resolution: string }> };
//     why?: SectionView;            // U6 — optional ⇒ SectionView | undefined
//     unknown: SectionView[];       // U5 — gap()/allowUnknown sections; always present ([] if none)
//   };
//   byAnchor(id: string): BlockView | undefined;   // U7 — doc-wide; doc = { frontmatter, body, byAnchor }
// }
```

### Dual-key section access

```ts
doc.body["Files to touch"]          // exact heading text — always available
doc.body.filesToTouch               // lowerCamelCase — generated alongside
doc.body.section("Files to touch")  // explicit accessor for dynamic / edge names
```

All three resolve to the same `SectionView`. The camelCase rule is Unicode-aware (`/[^\p{L}\p{N}]+/u`,
locale-independent); a heading yielding an invalid identifier or a caseless script gets no dotted alias
(exact bracket + `.section()` still reach it). The dual-key invariant is *guaranteed* by the structure
plane's `structure/duplicate-section` and `structure/key-collision` findings, and a contract declaring two
camelCase-colliding names is a build-time `contract/key-collision` throw (see [[D-0003-structure-plane]]).

### TableView and the BlockView union (U1, U2)

```ts
interface TableView<Row = Record<string, string>> extends Iterable<Row> {  // U8 — default Row = dynamic
  kind: "table"; columns: string[]; rows: Row[]; rowCount: number; pos: SourcePos;
  column<K extends keyof Row>(name: K): Row[K][];
  find(p: (row: Row, i: number) => boolean): Row | undefined;
  rowPos(i: number): SourcePos;
}
interface ListView extends Iterable<ListItem> {   // U1
  kind: "list"; ordered: boolean; items: ListItem[]; length: number; pos: SourcePos;
}
interface CodeView      { kind: "code";      lang: string | null; value: string; pos: SourcePos }
interface ParagraphView { kind: "paragraph"; text: string;                       pos: SourcePos }

type BlockView = TableView | ListView | CodeView | ParagraphView;   // U2 — discriminated on .kind
```

`byAnchor("x")` returns `BlockView | undefined`, narrowed idiomatically (`if (b?.kind === "table") b.rows`).
Types come only from the contract: a declared `^anchor`-bound table is `TableView<Row>` with typed rows; an
undeclared anchor is reachable via `byAnchor` as the dynamic `Record<string, string>` case (U8). A section's
lone unnamed table is `doc.body.<section>.table` (same dynamic type) — a one-table section is *not*
auto-promoted, since that would make its type depend on content count.

### SectionView, SectionGroup, and absence

```ts
interface SectionView {
  name: string; pos: SourcePos; anchors: string[];
  text(scope?: "prose" | "all"): string;             // U4 — default "prose"
  table?: TableView<Record<string, string>>; tables: TableView<Record<string, string>>[];
  lists: ListView[];
  byAnchor(id: string): BlockView | undefined;
  sections: SectionGroup;                             // U3 — same dual-key shape as doc.body
}
```

- **`SectionGroup` (U3).** `doc.body` and every `SectionView.sections` are the *same* generated dual-key
  structure — typed keys + exact bracket + lowerCamelCase + `.section()` + `unknown` — so nesting reads
  identically at every depth, no idiom switch.
- **`unknown` (U5).** `body.unknown` is **always** present (`[]` when none, never `undefined`), positional,
  in document order; each element is a full `SectionView`. It holds both `gap()` and `allowUnknown`
  admissions.
- **Absent optional (U6).** A missing optional section reads as `undefined` (the `?` key on all three
  access paths); present-but-empty is a real `SectionView` with empty `text()`. Required sections get a
  non-optional key — their absence is an error that blocks `doc`.
- **`doc` vs `tree` (U9).** `doc` is the contract-typed read surface and exists only for a *valid*
  document; `validate().tree` is the raw projection (`tree.mdast`, `lineForPath`, unmodelled blocks) and is
  **always** returned, even when `doc` is absent. Reach for `doc` for typed data; `tree` for AST /
  unmodelled structure / analysis of invalid docs.

### Two doors

```ts
const { findings, doc } = Contract.validate(source, { path });  // findings + model (doc on success)
const doc = Contract.read(source, { path });                    // model only (throws on error-level)
```

## Why

- **The contract is the single source for validation *and* the model.** Because the same declaration drives
  both, section names become keys, columns become row fields, and cell schemas become field types — no
  second declaration, no drift.
- **A lazy facade, never a dependency of the validator.** The model is built on demand over the same layer-1
  projection (no second copy, positions preserved). The validator's findings come from projection + Zod +
  grammar alone; the model is additive and deferrable, so it can ship after the validator and nothing in the
  finding path depends on it.
- **Two doors mirror a known idiom.** `read()` / `validate().doc` is the `parse` / `safeParse` split
  consumers already understand — strict-throw versus inspect-the-findings.

## Consequences

- Consumers and the deterministic skills read `doc.body.filesToTouch` instead of hand-walking mdast; report
  ops consume structure, not an AST.
- Because the model is additive, the validator can land and gate the corpus before the typed surface exists —
  the consumption layer is never on the validator's critical path.
- The dual-key and absence contracts bind the structure plane: the model's guarantees (unique keys, `unknown`
  always present, optional-as-`undefined`) are exactly what the structure-plane findings enforce.
- `doc` existing only for valid documents draws a clean line — typed reads presuppose validity; invalid-doc
  analysis goes through `tree`.

## Open questions

- The `text("prose" | "all")` flattening scope (U4) and whether further view helpers are warranted are
  refinements, not blockers; the core surface above is settled.

## References

- [[C-0002-typed-consumption]] — the capability this ADR governs.
- [[D-0001-finding-model]] — the error-level rule that gates `doc` and `read()`.
- [[D-0002-projection-and-dialect]] — the projection the model is a lazy facade over.
- [[D-0003-structure-plane]] — the duplicate / key-collision findings that guarantee dual-key uniqueness.
- [[D-0004-content-plane]] — the leaf cell types that flow into `TableView<Row>`.
- `provenance/d0014/questions/F1-read-and-value.md`, `F2-byanchor-types.md`, `F3-anchor-unresolved.md`,
  `F4-camelcase-collision.md` — read doors, `byAnchor` typing, dual-key collisions.
- `provenance/d0014/questions/U1-listview-shape.md` … `U9-tree-vs-doc.md` — the consumption review (U1–U9).
- `provenance/d0014/proposed-shape.md` §6 — the typed document model (OOM).
