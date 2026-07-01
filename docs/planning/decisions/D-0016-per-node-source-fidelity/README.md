> Supporting examples for [[D-0016-per-node-source-fidelity|D-0016]] — worked API use cases for the
> proposed per-node source-fidelity model. Non-normative; the decision (and M-0011 for cell/inline)
> win. Names are illustrative and may change.

# D-0016 · example suite

This directory is the peer companion to [[D-0016-per-node-source-fidelity]] — nine worked API cases
that motivate and pin the proposed shape.

The first four walk the **depth ladder** — the same primitive (a per-node source range) at each
granularity, each retiring a real downstream workaround. The last five are the **cross-cutting
mechanics** — how the views attach, serialize, stay immutable, and coexist with the contract-typed
model.

## Depth ladder

- [01 · Document body — frontmatter read-modify-write](./01-document-body-frontmatter-rewrite.md)
- [02 · Section — verbatim source slice](./02-section-verbatim-slice.md)
- [03 · Cell — verbatim table cells](./03-verbatim-table-cells.md)
- [04 · Inline — placeholder span offsets](./04-inline-span-offsets.md)

## Cross-cutting mechanics

- [05 · Fallthrough — typed → mdast → raw](./05-fallthrough-typed-mdast-raw.md)
- [06 · Composition, not inheritance](./06-composition-not-inheritance.md)
- [07 · `range` as the serializable primitive](./07-range-serialization.md)
- [08 · Immutability](./08-immutability.md)
- [09 · Structured cells — three views on one cell (M-0011)](./09-structured-cells-three-views.md)

## Proposed API surface (illustrative)

Used across the examples. The decision and M-0011 (PR #100, the in-flight cell/inline embodiment)
are the source of truth — names may change; this is a reading aid, not a spec.

```ts
// Every node (DocTree, SectionNode, BlockNode, cell, inline span):
node.range        // { start, end } source offsets — the serializable primitive
node.raw()        // string — verbatim source for range (lazy)
node.mdast()      // the node's mdast segment, precisely typed + readonly (lazy)
                  // …plus the node's existing typed fields (kind, name/depth, columns/rows, value)

// Document:
parse(md).body            // string — verbatim body after the frontmatter block
splitFrontmatter(md)      // { raw: string | null; body: string } — pure, no projection

// Table (flat default kept; richer per-cell accessors added):
table.rows                // string[][] — flattened cells (existing default)
table.cell(r, c)          // CellView — { raw(), range, mdast(): Mdast.TableCell, typed? }
table.cellPos(r, c)       // SourcePos with col (M-0011)
table.typed(r, c)         // z.output<cell schema> — contract-typed value (M-0011)

// Inline:
paragraph.spans()         // InlineSpan[] — { kind: "text" | "code" | …, value, range, raw() }

// Typed model (contract-inferred; via read() / validate().doc, not the raw tree):
doc.body.<section>        // typed sections / TableView<Row> (D-0005 / M-0011)
```

Two invariants hold in every example: `range` is plain data (it survives serialization); `raw()`
and `mdast()` are lazy and return **readonly** views (they do not).
