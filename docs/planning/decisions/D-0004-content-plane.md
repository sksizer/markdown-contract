---
type: decision
schema_version: '1'
id: D-0004
status: open/accepted
title: Content plane — Zod leaves over projected blocks
created: '2026-06-20'
related:
  - '[[C-0005-two-plane-contract-engine]]'
tags:
  - content-plane
  - zod
  - leaves
  - engine
need_human_review: true
---
# Content plane — Zod leaves over projected blocks

## Summary

- Block data is validated by a finite, closed leaf vocabulary — `table()` / `list()` / `code()` /
  `maxWords()` — each compiling to Zod over the projected node.
- A `LeafSpec` is **two parts**: a structural kind-gate (owned by [[D-0003-structure-plane]]) plus a
  content Zod schema; a leaf is therefore never "pure Zod".
- Table cells are typed from a `cells` map; `extraColumns: "ignore" | "error"` (default `ignore`, C2);
  per-row diagnostics survive via `rowPos(i)` (C3); `code` carries `lang` (C4).
- Content findings are namespaced `content/<leaf>/<check>` (C1); raw `z.*` rides *inside* a leaf for
  anything richer than the closed vocabulary.
- The boundary line: **kind and presence are structure; data shape is content** (F3).

^summary

## Context

Once the structure plane has confirmed a block is present and of the right kind, something must validate
the block's *data* — a table's columns and cell values, a list's item shape, a code block's language, a
paragraph's length. This is the axis Zod is the right tool for (and the engine the corpus already
standardized on for frontmatter). The content plane is that Zod layer, projected over the positioned
block nodes so its issues remap to source lines rather than schema paths.

## Decision

### The leaf vocabulary

```ts
type BlockKind = "table" | "list" | "code" | "paragraph";
interface LeafSpec { kind: BlockKind; schema: ZodType }   // F3 — structural kind-gate + content Zod

function table(s: {
  columns: string[]; anchor?: string; minRows?: number;
  cells?: Record<string, ZodType>;
  extraColumns?: "ignore" | "error";        // C2 — default "ignore"; "error" ⇒ content/table/column-extra
}): LeafSpec;
function list(s: { ordered?: boolean; everyItem?: "checkbox" | ZodType; minItems?: number }): LeafSpec;
function code(s: { lang?: string }): LeafSpec;            // C4
function maxWords(n: number): LeafSpec;                   // a paragraph-kind leaf
```

The vocabulary is **finite and closed** — `table` columns, `list` item shape, `code` lang, `maxWords`. It
is deliberately not a config DSL that reinvents a schema language; anything richer (a conditional, a cell
grammar, a cross-cell constraint) is a raw `z.*` schema riding *inside* a leaf (e.g. a table's `cells`
map), not a new config keyword.

### A leaf is a kind-gate plus a content schema (F3)

Each leaf contributes **two** parts. The structural kind-gate — checked first, owned by
[[D-0003-structure-plane]] — fires `structure/block-missing` if no block of that kind fills the slot and
`structure/block-kind` if the slot's block is the wrong kind. Only once that passes does the **content Zod
schema** run over the projected node's data. So a leaf is *not* "pure Zod": the block's kind is a
tree-grammar (structure) concern; only its data shape is schema (content). This is the load-bearing
boundary — **kind and presence = structure; data shape = content**.

### Tables — typed cells, extra-column policy, per-row position

```ts
table({
  columns: ["Location", "Kind", "Change"],
  cells: { Kind: z.enum(["new", "modify", "delete"]) },   // G1 — matches the live VALID_KINDS
});
```

`cells` maps a column name to a Zod type; declared cells take their Zod type, undeclared columns default
to string. `extraColumns` (C2) governs columns the document carries beyond `columns` — default `"ignore"`,
or `"error"` to fire `content/table/column-extra`. Per-element position survives: `rowPos(i)` (C3) lets a
cell-level content finding point at the offending row's source line rather than the table's heading. Cell
enums are sourced from live values where the consumer defines them (G1).

### Content-plane findings (C1)

Content findings are namespaced `content/<leaf>/<check>` — e.g. `content/table/column-missing`,
`content/table/min-rows`, `content/table/column-extra`, `content/list/min-items`, `content/code/lang`. The
content plane keeps *only* data-shape checks; everything about presence and kind is structure.

## Why

- **Zod for data, because data is what Zod is for.** Murata's incomparability cuts both ways: just as a
  schema language cannot express section sequence, a tree grammar is datatype-poor. Leaf data — enums,
  patterns, ranges, cell types — is exactly the value-shape-at-a-node axis Zod owns, and the engine the
  corpus already adopted for frontmatter, so the leaf layer reuses one engine end to end.
- **A finite closed vocabulary, with `z.*` as the escape hatch.** Keeping the leaf helpers to a small fixed
  set (and pushing anything richer into a raw Zod schema *inside* a leaf) is the guard against the content
  plane accreting into a config-grows-a-language DSL.
- **Kind-gate before data, by construction.** Validating a table's columns presupposes a table. Splitting
  the leaf into a structural kind-gate plus a content schema makes "you can't check data you don't have" a
  structural property, not a per-check guard.

## Consequences

- Per-section content checks become declared leaf specs on the contract, not bespoke scanners; the leaf set
  is the design checklist (word count, tables, lists, code-block language).
- Table-row diagnostics localize to the offending row via `rowPos(i)`, so a bad cell points at its line, not
  the table heading.
- The structure/content split binds every leaf author to answer the kind-vs-data question, which keeps the
  content plane purely about data and the structure plane purely about shape.
- `extraColumns` defaulting to `"ignore"` keeps hand-formatted tables that carry extra columns valid by
  default, with `"error"` available where a contract wants to lock the column set.

## Open questions

- **S6 — leaf-set-v1 (shared with [[D-0003-structure-plane]]).** Which leaf assertions ship v1 versus defer
  to a named Zod schema — the closed-but-extensible boundary of the leaf vocabulary.
- **S7 — Zod-native vs companion.** Whether leaf nodes are literal `ZodType`s (one schema end to end,
  `z.infer` for free) or a companion type embedding Zod only at the leaves. The Zod `issues[].path` →
  projection `line` remap (line granularity) is already committed; S7 only proves the plumbing.

## References

- [[C-0005-two-plane-contract-engine]] — the capability this plane realizes.
- [[D-0001-finding-model]] — the `content/<leaf>/<check>` finding shape.
- [[D-0002-projection-and-dialect]] — the projected `BlockNode` (and `rowPos`) the leaves read.
- [[D-0003-structure-plane]] — the kind-gate half of every `LeafSpec`.
- `provenance/d0014/questions/C1-content-namespace-levels.md` — the `content/<leaf>/<check>` id scheme.
- `provenance/d0014/questions/C2-table-extra-columns.md` — `extraColumns` policy.
- `provenance/d0014/questions/C3-per-element-pos-aggregation.md` — per-row `pos` via `rowPos(i)`.
- `provenance/d0014/questions/C4-code-lang.md` — `code` language assertion.
- `provenance/d0014/questions/G1-kind-enum.md` — cell enum from live `VALID_KINDS`.
- `provenance/d0014/proposed-shape.md` §3–§4 — leaf helpers, output over both planes.
