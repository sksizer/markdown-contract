> Example 06 for [[D-0016-per-node-source-fidelity|D-0016]] — section-depth raw: the verbatim source
> slice. Non-normative; the decision wins.

# 06 · Section — verbatim source slice

## Affordance

`section.raw()` returns the **byte-exact source of a section** — from its heading through the block
before the next same-or-shallower heading — with all markup intact, including a GFM table rendered
verbatim. Contrast the structured view: `section.blocks` gives parsed/flattened content
(`paragraph.text` has no backticks; a table is `columns`/`rows`), while `section.raw()` gives the
bytes.

## Input

```md
## Goal

Ship `splitFrontmatter` and wire `parse()` through it.

| Location | Kind |
|----------|------|
| `core/x` | new  |

## Approach

Later.
```

## Consumer code

```ts
const tree = parse(source);
const goal = tree.root.sections.find((s) => s.depth === 2 && s.name === "Goal")!;

// the structured view — flattened, lossy for round-trip
goal.blocks[0];              // { kind: "paragraph", text: "Ship splitFrontmatter and wire parse() through it.", … }
                            //   ↑ backticks gone
goal.blocks[1];              // { kind: "table", columns: ["Location","Kind"], rows: [["core/x","new"]], … }
                            //   ↑ the "| … |" source is gone

// the raw view — verbatim bytes of the whole section body
goal.raw();
// "## Goal\n\nShip `splitFrontmatter` and wire `parse()` through it.\n\n| Location | Kind |\n|----------|------|\n| `core/x` | new  |\n"
// backticks, pipes, and column padding all preserved; ends before "## Approach"
```

## Before / after

```ts
// before — hand-rolled offset slice over the raw mdast (what markdown_extract.sectionBody does today)
function sectionBody(src: string, name: string): string {
  const tree = parse(src);
  const h = tree.mdast.children.find((n) => n.type === "heading" && headingText(n) === name)!;
  const next = nextSameOrShallowerHeading(tree.mdast, h);        // find the boundary by hand
  return src.slice(h.position!.end.offset!, next?.position!.start.offset ?? src.length);
}

// after — the boundary + slice are the node's job
const body = tree.root.sections.find((s) => s.name === name)!.raw();
```

## Why it matters

The `sdlc`/`dev` `markdown_extract.sectionBody` (PR #520) needs the byte-exact section source — it
has a test that round-trips a GFM table inside a section *verbatim*. It currently drops to
`parse().mdast` and slices by offset by hand. `section.raw()` is exactly that boundary-find + slice,
built into the node: the heading's `range.start` to the next sibling's `range.start`.

## Notes

- Consumes the same section model as [04](./04-immutability.md); consumed by any source-extraction /
  round-tripping tool.
- The synthetic document root has no single heading; `tree.body` (example 05) is the whole-document
  analog of `section.raw()`.
