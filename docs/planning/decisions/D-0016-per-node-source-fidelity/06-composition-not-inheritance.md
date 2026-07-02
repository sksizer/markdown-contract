> Example 06 for [[D-0016-per-node-source-fidelity|D-0016]] — the OOM composes over mdast; it does
> not extend it. Non-normative; the decision wins.

# 06 · Composition, not inheritance

## Affordance

An OOM node **references** its mdast segment through a precisely-typed accessor — it does **not**
`extends` the mdast interface. You get mdast's full types by composition (`t.mdast(): Mdast.Table`),
while the OOM node keeps its own semantic shape (`kind` / `columns` / `rows`, not `type` / `children`
/ `position`).

## Consumer code

```ts
const tree = parse(source);
const t = tree.root.sections[0].blocks.find((b) => b.kind === "table")!;

// the OOM node's own shape — semantic, reshaped
t.kind;        // "table"
t.columns;     // string[]
t.rows;        // string[][]          ← flattened projection
t.raw();       // string              ← verbatim source
t.mdast();     // Mdast.Table         ← full mdast typing, by composition
// t.type      // ✗ does not exist — the OOM node is not an mdast node
// t.children  // ✗ does not exist — reach the rows-as-nodes via t.mdast().children

// mdast typing through the reference is complete and precise:
const m = t.mdast();
m.type;        // "table"
m.align;       // ("left" | "right" | "center" | null)[]
m.children;    // Mdast.TableRow[]
m.position;    // unist Position (line / column / offset)
```

## Why not extend

The reshape and the vocabulary make inheritance incoherent, and one node has no peer at all:

```ts
// hypothetical — extending drags in a clashing, doubled surface:
interface TableBlock extends Mdast.Table {
  //                    ↑ brings type: "table", children: TableRow[], position: Position
  kind: "table";      // …now BOTH `type` and `kind`
  rows: string[][];   // …BOTH `children` (rows as nodes) and `rows` (flattened strings)
  pos: SourcePos;     // …BOTH `position` and `pos`
}

// and SectionNode is synthetic — mdast has no "section" node to extend:
section.name;         // "Goal"        ← a grouping the projection invents
section.mdast?.();     // Mdast.Heading | undefined  ← at most the heading; there is no section node
```

## Why it matters

This is the settled shape from the design discussion, and it matches the prior art: rowan's typed
AST wraps a `SyntaxNode`; Roslyn's `SemanticModel` sits beside the syntax tree — the typed overlay
*wraps* the untyped tree, it doesn't inherit its node classes. Composition gives every mdast type
we'd have wanted (via `mdast()`) without pinning the public OOM surface to `@types/mdast`, and without
the `type`/`kind`, `position`/`pos`, `children`/`rows` collisions.

## Notes

- The typed *values* (example 09) are a third, contract-inferred layer — also not mdast, and also
  reached by composition, so this decision and typed cells pull the same direction.
- Interop temptation ("pass an OOM node to `unist-util-visit`") is a mirage: synthetic sections and
  flattened tables aren't valid mdast anyway. Use `t.mdast()` for interop.
