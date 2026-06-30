---
type: task
schema_version: "5"
id: T-FMSP
status: planning/proposed
created: 2026-06-30
related:
  - "[[T-2HF6-projection-engine]]"
depends_on: []
tags:
  - engine
  - frontmatter
  - api
  - dx
need_human_review: false
impact: medium
complexity: small
autonomy: supervised
last_reviewed: 2026-06-30
---
# Frontmatter/body split — retained on the `parse()` result for layered access

## Goal

Give consumers **layered access** to a parsed document from a single `parse()`
call: the raw frontmatter/body split, the parsed frontmatter, the structured
sections, and the raw mdast — every layer reachable off one rich object. This task
adds the one missing layer: the **verbatim body** string.

`parse()` (and the validate / consumption paths that run through it) already splits
the frontmatter from the body internally, then discards the body slice. `DocTree`
exposes `frontmatter.raw` / `.data` and the structured `root` / `mdast`, but never
the verbatim body — so a consumer that needs the untouched body (rewrite the
frontmatter and reattach a byte-identical body, or read a YAML head cheaply) has to
re-derive a `---`-fence regex. Retaining the split the parser already computed
removes that duplication and rounds out the layered object.

## Today

| Location | Role today |
|---|---|
| `src/core/projection.ts:417` (`parse`) | Splits frontmatter from body via `remark-frontmatter`, builds `frontmatter` (`buildFrontmatter`, `:332`) + the section projection, then returns `DocTree` — **discarding the body slice it just computed** |
| `src/core/types.ts:58` (`DocTree`) | Exposes `frontmatter {raw,data,pos,lineForPath} \| null` + `root: SectionNode` + `mdast` — **no verbatim `body` string**; the body is only available structurally |
| consumers (`sksizer/dev`) | `@lib/util/frontmatter` hand-rolls a `---`-fence regex for exactly this split; `markdown_extract.sectionBody` slices verbatim source by hand for the same "the projection flattens, I need the bytes" reason |

## Proposed

Two access patterns over **one** split primitive:

1. **Retain the split on the parse result (primary).** Add a verbatim `body` to
   `DocTree`, so the returned object exposes every layer:

   ```ts
   interface DocTree {
     frontmatter: { raw: string; data: unknown; pos; lineForPath } | null; // raw + parsed frontmatter (existing)
     body: string;        // NEW — verbatim source after the frontmatter block (whole doc when none)
     root: SectionNode;   // structured sections / blocks (existing)
     mdast: Mdast;        // layer-0 raw tree (existing)
   }
   ```

   The layers: **raw split** (`frontmatter.raw` + `body`) → **parsed**
   (`frontmatter.data`) → **structured** (`root`) → **layer-0** (`mdast`). A
   consumer picks the layer it needs; read-modify-write uses `frontmatter.raw` +
   `body` and reattaches a byte-identical tail with no second parse.

2. **Standalone convenience (secondary).** A cheap, projection-free
   `splitFrontmatter(md)` for consumers that only want the split without building
   the projection (a frontmatter read over hundreds of files, or a pure rewrite):

   ```ts
   export function splitFrontmatter(md: string): {
     raw: string | null;   // inter-fence YAML, fences stripped (null = none)
     data: unknown;         // parseDocument(raw); undefined when raw === null
     body: string;          // verbatim bytes after the closing fence (whole doc if none)
   };
   ```

   `parse()` uses this same primitive internally, so the split has one
   implementation and one definition of "what is frontmatter" — the second access
   pattern adds no divergent surface.

Design points: `body` is **byte-exact** (verbatim tail, no trim / re-serialize);
`data` stays raw `unknown` (the "empty → `{}`, non-mapping → null" normalization is
consumer policy); the standalone path does **not** build the section projection.

## Approach

1. Factor the frontmatter/body split out of `parse()` into a shared primitive
   (`src/core/frontmatter.ts`) — `splitFrontmatter(md) => { raw, data, body }`.
   `raw` / `data` exactly as `buildFrontmatter` computes today; `body` = the
   verbatim source after the `yaml` node's end (past its line terminator), or the
   whole input when there is no frontmatter.
2. Have `parse()` call the primitive and set `DocTree.body` from it — reusing the
   work it already does, no second parse, no extra cost.
3. Export `splitFrontmatter` from the core barrel and the package-root `index.ts`;
   add `body` to the `DocTree` type.
4. Peer unit tests (`src/core/frontmatter.test.ts`): no frontmatter, normal doc,
   empty frontmatter block, body byte-preservation (CRLF; a body that itself
   contains `---`); plus a `parse()` test asserting `parse(md).body ===
   splitFrontmatter(md).body` and that reattaching `frontmatter.raw` + `body`
   round-trips the source.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/core/frontmatter.ts` | new | the shared `splitFrontmatter` primitive (raw + data + verbatim body) |
| `src/core/frontmatter.test.ts` | new | peer unit test — input→output + body byte-preservation |
| `src/core/projection.ts` | modify | `parse()` calls the primitive and sets `DocTree.body`; `buildFrontmatter` shares the same split |
| `src/core/types.ts` | modify | add `body: string` to `DocTree` |
| `src/core/index.ts` | modify | re-export `splitFrontmatter` from the core barrel |
| `src/index.ts` | modify | add `splitFrontmatter` to the package-root named re-export list |

## Acceptance criteria

- [ ] AC-1: `DocTree` carries a verbatim `body: string` — `parse(md).body` is the source after the frontmatter block (the whole input when there is no frontmatter), byte-exact (a body containing `---` or CRLF is preserved unchanged).
- [ ] AC-2: `splitFrontmatter(md)` is exported from the package root and returns `{ raw, data, body }`; `parse()` uses the same primitive, so `parse(md).body === splitFrontmatter(md).body` and `(parse(md).frontmatter?.raw ?? null) === splitFrontmatter(md).raw` for any input.
- [ ] AC-3: Reattaching the split round-trips the source — for a doc with frontmatter, `"---\n" + raw + "\n---\n" + body` reproduces the original bytes (modulo the exact fence form the source used).
- [ ] AC-4: The standalone `splitFrontmatter` does not build the section / wikilink projection (it works without `DocTree.root`).
- [ ] AC-5: `npm run build`, `npm run test`, `npm run typecheck` are green; the peer test covers the no-frontmatter / present / empty / body-preservation cases.

## Out of scope

- Typed `data` (it stays `unknown`) and the empty / non-mapping normalization — consumer-side policy.
- The **other verbatim layers** the same philosophy implies — a verbatim `SectionNode` source-slice (consumer: `markdown_extract.sectionBody`, `sksizer/dev` #520) and verbatim table cells `table.rawRows` (consumers: `parseOperationsTable` + the merged `parse-touchpoints`, #518). They extend the same "retain what the parser saw, keyed by positions it already has" idea and should be their own tasks; this one establishes the pattern on the frontmatter/body layer.
- Inline-span character offsets within prose / cells (the harder D-0015 / PR #49 gap; consumer: `scan-placeholders` #519) — not addressed here.
- Migrating the downstream consumers (the requesting repo's follow-up).

## Dependencies

- none. Extends the frontmatter handling in the projection engine ([[T-2HF6-projection-engine]]); complements D-0015 / PR #49 (the typed-cell / inline-span layers) without depending on it.

## Discovery context

- Surfaced by `sksizer/dev` PR #523 (consolidating 17 private `FRONTMATTER_RE`
  copies). The read half is already on `parse().frontmatter`, but the **verbatim
  body** the read-modify-write sites need is discarded. Maintainer direction
  (2026-06-30): rather than only a standalone helper, **retain the split the parse
  / validate / consumption paths already compute on the returned object**, giving
  consumers a rich, multi-layer view (raw split → parsed → structured → mdast).
  Sibling analysis of `sksizer/dev` #518 / #520 confirmed the same "I need the
  verbatim source the projection flattened" theme at the section and table-cell
  layers, motivating the layered-access framing. Filed 2026-06-30.
