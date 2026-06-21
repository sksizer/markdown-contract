---
type: capability
schema_version: '1'
id: C-0004
kind: technical
title: Dialect-aware projection
status: open/planned
created: '2026-06-20'
parent_key: null
contains: []
related:
  - '[[C-0001-contract-validation]]'
  - '[[C-0002-typed-consumption]]'
tags:
  - projection
  - parsing
  - obsidian
need_human_review: true
---

# Dialect-aware projection

## Summary

- Parse a document once into a typed tree (`DocTree`), recognising the Obsidian dialect — `^block-id`
  anchors, `[[wikilinks]]`, `![[transclusions]]` — and GFM tables / lists as addressable structural
  nodes. ^summary
- The single parse every other capability reads from; the home of the Obsidian-dialect support.

## Statement

The projection turns raw markdown + frontmatter into a stable, typed tree of sections and block nodes
that contracts address. It extends the unified / remark parse for the constructs validation needs —
most sharply the `^block-id` anchor, which binds a block to a name a contract resolves — and enforces
the projection invariants (fence opacity, heading depth-jump handling, no block hoisting).

## What it provides

- One remark / mdast parse → a `DocTree` projection: sections, block kinds, and frontmatter with
  per-key line mapping.
- Obsidian-dialect nodes: `^block-id` anchors (bindable), wikilinks, and transclusions, alongside GFM
  tables and lists.
- The committed projection invariants (fenced code is opaque; depth jumps attach as direct children).

## Inputs

- Raw markdown + frontmatter, with optional micromark extensions for dialect constructs. `remark-gfm`
  ^4 is a committed dependency (it yields the `table` / task-list `list` nodes a pipe table would
  otherwise collapse into paragraph text).

```ts
parse(markdown: string, opts?: { extensions?: MicromarkExtension[] }): DocTree
```

## Outputs

- One positioned, typed `DocTree` — the single substrate both planes read. Every node carries a
  `SourcePos`, so findings localize to `<file>:<line>` (named `SourcePos`, not `Position`, to avoid
  the unist/mdast clash).

```ts
interface SourcePos { line: number; col?: number }   // single point; grows `end?` when LSP/SARIF lands

interface DocTree {
  frontmatter: {
    raw: string; data: unknown; pos: SourcePos;
    lineForPath(path: (string | number)[]): number | undefined;   // Zod issue path → key line
  } | null;
  root: SectionNode;   // synthetic; root.sections are the top-level H2s
  mdast: Root;         // the raw layer-0 parse, exposed for analysis (not hidden)
}

interface SectionNode {
  name: string; depth: number; pos: SourcePos;
  sections: SectionNode[];   // nested subsections, by heading depth
  blocks: BlockNode[];       // heading-direct, non-heading content
  anchors: string[];         // section-level ^block-ids
}

interface ListItem { text: string; checked?: boolean; pos: SourcePos }

type BlockNode =
  | { kind: "table"; columns: string[]; rows: string[][]; rowPos(i: number): SourcePos; anchor?: string; pos: SourcePos }
  | { kind: "list"; ordered: boolean; items: ListItem[]; anchor?: string; pos: SourcePos }
  | { kind: "code"; lang: string | null; value: string; anchor?: string; pos: SourcePos }
  | { kind: "paragraph"; text: string; anchor?: string; pos: SourcePos };
```

- Committed projection invariants: fenced code is opaque (a `##` / `^id` / pipe line inside a fence is
  never re-scanned); a skipped heading level attaches to the nearest ancestor and emits
  `structure/heading-depth-jump` (warn); a block nested in a blockquote / list item is not hoisted to
  `section.blocks`; frontmatter is parsed position-aware so `lineForPath` can localize a Zod issue.

## Hook points

- `opts.extensions: MicromarkExtension[]` — the dialect-plugin seam. The Obsidian dialect (`^block-id`
  anchors, `[[wikilinks]]`, `![[transclusions]]`) is delivered through it; other dialects attach the
  same way.

## Underlying implementation

- Planned: `src/core/projection.ts` (mdast → positioned section tree) on unified / remark at current
  majors + `remark-gfm` ^4 + `remark-frontmatter`. The Obsidian dialect ships as
  `micromark-extension-obsidian` (independent package vs in-repo module — `D·fidelity-and-packaging`).
- Build-vs-adopt for the dialect parser, and the invariants above, are the `D·projection` ADR. Not
  yet built — lands in an implementation milestone.

## Notes

Underpins [[C-0001-contract-validation]] and [[C-0002-typed-consumption]]. **Build-vs-adopt** the
dialect parser — adopt a wikilink / OFM remark plugin and add only the missing `^block-id` extension,
versus a focused in-house micromark extension — is the open `D·projection` ADR. This capability
absorbs the former Obsidian "driver" (reclassified per review). Status `open/planned`.
