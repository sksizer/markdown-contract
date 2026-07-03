> Supporting examples for [[D-0016-per-node-source-fidelity|D-0016]] — worked API use cases for the
> proposed per-node source-fidelity model. Non-normative; the decision (and M-0011 for cell/inline)
> win. Names are illustrative and may change.

# D-0016 · example suite

This directory is the peer companion to [[D-0016-per-node-source-fidelity]] — nine worked API cases
that motivate and pin the proposed shape.

The first four are the **concepts** — the cross-cutting mechanics that hold at every depth: how the
views compose over mdast, fall through typed → mdast → raw, serialize, and stay immutable. The last
five are the **worked examples** — the depth ladder, the same primitive (a per-node source range) at
each granularity, each retiring a real downstream workaround, and closing with the M-0011
structured-cells convergence.

## Concepts

- [01 · Fallthrough — typed → mdast → raw](./01-fallthrough-typed-mdast-raw.md)
- [02 · Composition, not inheritance](./02-composition-not-inheritance.md)
- [03 · `range` as the serializable primitive](./03-range-serialization.md)
- [04 · Immutability](./04-immutability.md)

## Worked examples

- [05 · Document body — frontmatter read-modify-write](./05-document-body-frontmatter-rewrite.md)
- [06 · Section — verbatim source slice](./06-section-verbatim-slice.md)
- [07 · Cell — verbatim table cells](./07-verbatim-table-cells.md)
- [08 · Inline — placeholder span offsets](./08-inline-span-offsets.md)
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
