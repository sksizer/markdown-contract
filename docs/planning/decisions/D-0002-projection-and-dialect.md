---
type: decision
schema_version: '1'
id: D-0002
status: open/accepted
title: Projection and dialect — one parse into a positioned DocTree
created: '2026-06-20'
related:
  - '[[C-0004-dialect-aware-projection]]'
tags:
  - projection
  - parsing
  - obsidian
  - mdast
need_human_review: true
---
# Projection and dialect — one parse into a positioned DocTree

## Summary

- One unified/remark parse projects each document into a `DocTree` — a position-carrying section tree (`SectionNode`, `BlockNode`, `ListItem`) over a single-point `SourcePos`.
- `remark-gfm` ^4 is committed as the dependency that yields `table` and `list` nodes (D1); the raw mdast is retained and exposed as `tree.mdast` for fidelity and analysis (F1).
- Three projection invariants are fixed: fenced code is opaque (D2), no depth-jump node synthesis plus a `structure/heading-depth-jump` warn (D3), and no hoisting of blockquote/list-item blocks (D4).
- Frontmatter is parsed position-aware so `lineForPath` maps a Zod issue path to its key's source line (E2).
- `^block-id` anchors and GFM are **base** projection — the contract model's addressing primitive and its table/list support, always on; the `[[wikilink]]` / `![[transclusion]]` vault-reference constructs ship as a **bundled dialect, enabled by default**, with `opts.extensions` reserved for *further* dialects.
- **Resolved — build in-house.** The bundled dialect is *sourced* in-house: `^block-id` anchors and a light `[[wikilink]]` / `![[transclusion]]` recognition pass are owned (`src/core/dialect/`), with no `remark-wiki-link` / OFM dependency adopted. The anchor has no npm package in either arm so it is owned regardless; the projection needs only *recognition* of vault refs, so an owned pass beats adopting a second parser to reconcile (T-2HF6 AC-6).

^summary

## Context

Everything downstream — the structure grammar, the content leaves, the typed model — reads one substrate. mdast as parsed is hostile to direct use three ways: headings are flat siblings with no section containment; a table cell is an inline subtree, not a value; and every node carries verbose `{start,end}` positions. The projection is the single layer that fixes all three. The corpus also uses Obsidian constructs — line-terminal `^block-id` anchors (the addressing primitive a contract binds a leaf to, so **base**, not an opt-in dialect feature), `[[wikilink]]`, and `![[transclusion]]` — and a prior 2026 ecosystem sweep established that **no maintained npm package parses the `^block-id` anchor**, while the `remark-wiki-link` / OFM family does cover wikilinks, embeds, and callouts. That asymmetry is what makes *sourcing* the bundled wikilink/transclusion dialect a build-vs-adopt decision rather than a foregone in-house build.

## Decision

### One parse, one projection

```ts
parse(markdown: string, opts?: { extensions?: MicromarkExtension[] }): DocTree  // GFM + anchors + Obsidian on by default

interface SourcePos { line: number; col?: number }   // single point; grows end? when LSP/SARIF lands

interface DocTree {
  frontmatter: {
    raw: string;
    data: unknown;
    pos: SourcePos;
    lineForPath(path: (string | number)[]): number | undefined;  // E2 — Zod issue path → key line
  } | null;
  root: SectionNode;     // synthetic; root.sections are the top-level H2s
  mdast: Root;           // F1 — the raw layer-0 tree, exposed (not hidden)
}

interface SectionNode {
  name: string; depth: number; pos: SourcePos;
  sections: SectionNode[]; blocks: BlockNode[]; anchors: string[];
}

interface ListItem { text: string; checked?: boolean; pos: SourcePos }   // C3 — items carry pos

type BlockNode =
  | { kind: "table"; columns: string[]; rows: string[][]; rowPos(i: number): SourcePos; anchor?: string; pos: SourcePos }
  | { kind: "list"; ordered: boolean; items: ListItem[]; anchor?: string; pos: SourcePos }
  | { kind: "code"; lang: string | null; value: string; anchor?: string; pos: SourcePos }
  | { kind: "paragraph"; text: string; anchor?: string; pos: SourcePos };
```

Every node carries a `SourcePos`, so findings localize to `<file>:<line>`. The type is deliberately **not** named `Position`: unist/mdast already use `Position` for a start–end range and `Point` for a single point, so a new name avoids the clash with the very ecosystem the package imports.

### What is base, what is bundled, what is an extension

The projection ships useful out of the box; `opts.extensions` is *additive*, not the switch that turns the defaults on:

- **Base (always on).** GFM tables / lists (via `remark-gfm`, below) and `^block-id` anchors. Anchors are not an "Obsidian feature" here — they are the contract model's addressing primitive (`byAnchor`, content-binding, and the `structure/anchor-missing` finding all depend on them), so they belong in base regardless of dialect.
- **Bundled dialect (enabled by default).** The vault-reference constructs `[[wikilink]]` and `![[transclusion]]`. On by default so the parser is useful with no configuration, but conceptually a swappable layer — which is what makes its *sourcing* (Options considered) a real choice.
- **Extensions (opt-in).** `opts.extensions: MicromarkExtension[]` layers *further* dialects (a foreign callout grammar, a custom embed) on top of the base set; it never re-enables the defaults.

### Committed dependency (D1)

`remark-gfm` ^4 is committed. Without it a pipe table parses as a single `paragraph` of pipe text and a task-list item is plain text; with it the projection gets real `table` and `list` (checkbox) nodes. The package stays on unified/remark at current majors.

### Projection invariants

| Invariant | Decision | Rule |
|---|---|---|
| Fenced code is opaque | D2 | a `##` / `^id` / pipe line *inside* a fenced `code` block is never re-scanned as a heading / anchor / table — the fence value is verbatim |
| No depth-jump synthesis | D3 | a skipped heading level (H2→H4) attaches as a direct child of the nearest ancestor; no intermediate node is synthesized, and the skip emits `structure/heading-depth-jump` (warn) |
| No hoisting | D4 | a block nested in a blockquote or list item is not promoted to a section-level `BlockNode`; `section.blocks` holds heading-direct blocks only |
| Position-aware frontmatter | E2 | frontmatter is parsed with a position-retaining YAML pass so `lineForPath` maps a Zod issue path to its key's line |

### Fidelity (F1)

The raw mdast is **retained and exposed** as `tree.mdast`, not discarded. It is the round-trip-fidelity layer and the escape hatch for analysis of constructs the projection does not model.

## Why

- **One parse, addressed three ways.** The projection is the recursive, positioned form of a body model: it nests flat siblings into sections, flattens cells to strings, and keeps a single-point position on every node — the substrate both the structure grammar and the content leaves read, without a second pass.
- **`remark-gfm` is the cheapest path to real tables/lists.** The alternative — a second structure-native parser (tree-sitter) — was rejected upstream as mis-published on npm, buggy in exactly the `section` and `pipe_table` nodes it sells, and undocumented under Bun. Staying on remark keeps one parser the fidelity gate already depends on.
- **Naming `SourcePos`, not `Position`, prevents an ecosystem clash.** Importing unist/mdast means `Position` already has a meaning; reusing it would create a silent type collision.

## Options considered

The one genuinely open question is how the **bundled dialect is sourced** — build vs adopt — *not* whether it (or anchors, or GFM) ships by default; those are settled as base / bundled above. The prior sweep is settled on the facts: **no npm package exposes the `^block-id` anchor**, while the `remark-wiki-link` / OFM family covers `[[wikilink]]`, `![[transclusion]]`, callouts, and tags (with varying recency and bus factor). Since `^block-id` is base and owned in either arm, the spike decides only the wikilink / transclusion constructs' provenance.

### Option A: focused in-house `micromark-extension-obsidian`

Author one micromark extension pair (`syntax` + `mdast-util` from/to-markdown) covering all three constructs — line-terminal `^block-id`, pipe-alias `[[target|alias#anchor]]`, and `![[file#^anchor]]` transclusion — emitting dedicated nodes the projection lifts into `anchor` / wikilink / transclusion data. One owned unit, one dependency surface, round-trip provable by a single `parse → render → git diff` gate over the whole dialect. Cost: ~900–1200 LoC owned on a bus-factor-1 upstream substrate; benefit: nothing partial to reconcile and the `^block-id` anchor — the addressing contracts bind to — is first-class from day one.

### Option B: adopt a wikilink/OFM plugin + in-house `^block-id` anchor extension

Adopt an existing `remark-wiki-link` / OFM plugin for the wikilink and transclusion constructs it already covers, and author only the missing piece — the `^block-id` anchor extension — in house. Less owned code; but two parsers' node shapes to reconcile into one projection, the adopted plugin's recency / bus factor / dialect-fit to vet (several are stale, render-only, or default to a non-Obsidian divider), and round-trip fidelity now depends on a dependency the gate does not fully control. The `^block-id` extension is owned regardless, since nothing supplies it.

**Resolved: Option A (build in-house), in its lighter form.** Rather than author a full `micromark-extension-obsidian` pair, the dialect is owned as focused passes over the projected tree — `extractTrailingAnchor` / `isStandaloneAnchor` for `^block-id`, and `extractVaultRefs` for `[[wikilink]]` / `![[transclusion]]` (`src/core/dialect/`) — since remark already parses vault refs as ordinary text and the projection needs only to *recognize* them. No `remark-wiki-link` / OFM dependency was adopted (Option B rejected): one owned unit, one dependency surface, and the `^block-id` anchor first-class from day one. The projection contract, invariants, and `remark-gfm` dependency above hold as written.

## Consequences

- Every downstream capability ([[C-0001-contract-validation]], [[C-0002-typed-consumption]]) reads one stable `DocTree`; a parser change is absorbed behind the projection contract, not leaked.
- Exposing `tree.mdast` keeps a fidelity / round-trip escape hatch and lets unmodelled constructs be analysed without a re-parse.
- The depth-jump and fence-opacity invariants fix corpus edge cases (blockquoted headings, fenced pipe text) deterministically, so findings do not flicker on them.
- The bundled dialect's *sourcing* is left open and binds a downstream spike, but its default-on status and the base projection (anchors + GFM) are settled, so the rest of the projection proceeds in parallel.

## Open questions

- ~~**Bundled-dialect sourcing spike (build vs adopt).**~~ **Resolved** in T-2HF6: built in-house as recognition passes (`src/core/dialect/`); no wikilink/OFM plugin adopted. See *Options considered*.
- ~~Whether `mdast-util-to-markdown` / `-from-markdown` import cleanly under the runtime.~~ **Moot:** a byte-exact `parse → render → git diff` round-trip is not pursued — `remark-stringify` normalizes whitespace / list markers / emphasis regardless of dialect. The suite proves instead that the dialect *constructs* (`^anchor`, `[[wikilink]]`, `![[transclusion]]`) survive a parse → stringify → re-parse cycle (`src/core/projection.test.ts`). No open questions remain.

## References

- [[C-0004-dialect-aware-projection]] — the capability this ADR governs.
- [[D-0001-finding-model]] — the `SourcePos` / `Finding` shapes the projection feeds.
- [[D-0003-structure-plane]] — the grammar that reads `SectionNode` / `BlockNode`.
- [[D-0006-packaging]] — where the dialect's packaging (ships in-repo) is settled.
- [[D-0007-engine-scope-and-fidelity]] — where `tree.mdast` retention (fidelity) is decided.
- `provenance/d0014/questions/D1-remark-gfm.md` — the committed `remark-gfm` dependency.
- `provenance/d0014/questions/D2-fence-awareness.md` — fenced-code opacity.
- `provenance/d0014/questions/D3-heading-depth-jump.md` — depth-jump handling.
- `provenance/d0014/questions/D4-block-in-blockquote-or-list.md` — no hoisting.
- `provenance/d0014/questions/E2-per-key-lines.md` — position-aware frontmatter, `lineForPath`.
- `provenance/d0014/research/landscape.md` — the build-vs-adopt prior-art sweep.
- `provenance/d0014/proposed-shape.md` §2 — representations, mdast → projection → model.
