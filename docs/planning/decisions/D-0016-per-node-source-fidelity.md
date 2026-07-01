---
type: decision
schema_version: '1'
id: D-0016
status: open/proposed
title: Per-node source fidelity — raw text, mdast segment, and typed model at every projection node
created: '2026-06-30'
related:
  - '[[D-0007-engine-scope-and-fidelity]]'
  - '[[D-0002-projection-and-dialect]]'
  - '[[D-0005-consumption-oom]]'
tags:
  - architecture
  - projection
  - fidelity
  - api
need_human_review: true
---
# Per-node source fidelity — raw text, mdast segment, and typed model at every projection node

## Summary

- Proposal: expose, at **every projection node**, three views of the same span — the
  **raw source** bytes, the **mdast segment**, and the **typed model** — instead of
  today's split where `mdast` is root-only, raw source is nowhere, and the typed
  projection flattens the source away.
- The enabling primitive is a per-node source **`range`** (start/end offset). `raw` is a
  lazy slice of the retained source; the `mdast` segment is a retained reference. Ranges
  are cheap; the two derived views cost nothing until read.
- This is the **convergent design of serious source-tooling stacks** — lossless /
  full-fidelity syntax trees with a typed overlay (tree-sitter, Roslyn,
  rust-analyzer/rowan, LibCST, PostCSS). markdown-contract already sits on unist/mdast,
  whose nodes carry offsets, so the capability is latent one layer down.
- It is a **pure, additive extension of [[D-0007-engine-scope-and-fidelity]]'s posture**
  — read-only, retain-don't-rewrite — moving retained fidelity from a single root-level
  `tree.mdast` escape hatch to a per-node one. No existing behavior changes.
- It **collapses four separately-requested consumer features into one**: whole-doc body,
  section-body slice, verbatim table cells, and inline-span offsets are the same
  primitive (a per-node source range) exposed at four depths.

^summary

## Context

The typed projection ([[D-0002-projection-and-dialect]]) deliberately flattens: a
`paragraph.text` and table cells drop inline markup (a `` `code` `` cell becomes bare
`code`), `SourcePos` is a single point with no `end`, and the raw `mdast` is exposed only
at the root (`tree.mdast`). For validation that is the right default — findings want a
line, not bytes.

But a wave of downstream consumers keeps hitting the same wall. The `sdlc`/`dev` corpus
uses markdown-contract as its entity validator, and in a single migration cycle four
independent consumers each needed the **verbatim source the projection flattened**, and
each could only get it by leaving the projection and re-reading or re-scanning the raw
file:

| Consumer | Needs | Today's workaround |
|---|---|---|
| frontmatter read-modify-write (`dev` #523) | the verbatim body after the fence | hand-rolled `---`-fence regex (→ the `DocTree.body` proposal) |
| section extractor (`dev` #520, `markdown_extract.sectionBody`) | byte-exact source of a section | walks mdast, slices `source` by offset by hand |
| operations-table reader (`dev` #518, and the merged `parse-touchpoints`) | cells with backticks preserved | re-splits the raw line via `rowPos(i)` because `columns`/`rows` are flattened |
| placeholder scanner (`dev` #519, `scan-placeholders`) | inline-span column offsets + inline-code awareness | re-scans raw lines with its own inline-code masking |

Every case is the same shape: *the projection gave me structure but discarded the exact
bytes or positions I need, so I dropped back to the raw source.* The pattern recurs at
every granularity — document, section, cell, inline — which is the tell that this is one
missing capability, not four features.

## Prior art

Two established patterns from language tooling, together, describe exactly what is
proposed. This is well-trodden ground, not a novel design.

### 1. Lossless / full-fidelity syntax trees

A tree that can regenerate the original source in its entirety, because every node maps
to an exact source span.

- **tree-sitter** produces concrete (lossless) syntax trees; each node stores its
  position as **raw byte offsets** (`start_byte`/`end_byte`) plus row/column, and a
  node's text is obtained by **slicing the source** with those offsets — the source
  buffer is the source of truth, nodes are ranges into it.
- **Roslyn** (C#) syntax trees are **full-fidelity**: every character — whitespace,
  comments, trivia — is represented, and any node round-trips to its exact text
  (`ToFullString`).
- **LibCST** (Instagram/Python) is explicitly "a compromise between an AST and a CST" —
  lossless, retaining enough (whitespace in prefix properties) to reprint the exact
  input, for codemods and linters. Its framing: "Like a JPEG, the AST is lossy."
- **PostCSS** keeps a `source` (start/end positions) plus a `raws` bag per node so a
  stylesheet round-trips byte-for-byte when unchanged.

### 2. Untyped positioned tree + typed overlay

The layered separation the third view names.

- **Roslyn** splits the syntax tree (`SyntaxNode`/`Token`/`Trivia`) from the
  `SemanticModel` — structure vs meaning.
- **rust-analyzer**'s **rowan** (inspired by Swift's libsyntax) is three layers:
  `GreenNode` (untyped, lossless CST) → `SyntaxNode` / red tree (on-demand, absolute
  offsets, parent pointers) → a **typed AST overlay** — "a structurally typed AST view
  into a dynamically typed CST." Biome/Rome and Lezer (CodeMirror) use the same
  lossless-CST shape.

### The mapping is one-to-one

| this proposal | prior-art analog |
|---|---|
| raw source per node | tree-sitter `node.text` / Roslyn `ToFullString` / LibCST reprint |
| mdast segment per node | the untyped CST / green tree (rowan `GreenNode`, Roslyn green) |
| typed model per node | the typed overlay (rowan AST, Roslyn `SemanticModel`) |
| `range` primitive, `raw` lazy | tree-sitter byte-range + lazy text; red-green cheap node + on-demand view |

And the enabling fact: markdown-contract is built on **unist/mdast**, whose nodes already
carry a `position` with a 0-indexed **`offset`** — the byte range is already computed one
layer down; the projection simply discards it above the root. This is not inventing
positional tracking (the hard part in a from-scratch parser); it is **threading up ranges
the layer below already has**.

### Two cautions the prior art also teaches

- **Don't store text eagerly.** tree-sitter and the red-green designs store cheap
  positional data and derive text/positions on demand — eager per-node source copies are
  O(depth × size). The primitive is the range; `raw` is a getter.
- **The typed overlay stays a view, not a rewrite.** rowan's AST and Roslyn's semantic
  model are lazily-projected views over the lossless tree; they never replace it. Here the
  typed OOM ([[D-0005-consumption-oom]]) stays primary and opinionated; `mdast` + `raw`
  are the fallthrough beneath it.

## Decision

Adopt a per-node **three-view** model, additive over the current projection.

1. Every projection node carries a source **`range`** (`{ start, end }`, offsets and/or
   `SourcePos`). This is the primitive — the one thing that must be stored and serialized.
2. **`raw: string`** — a lazy slice of the retained source for the node's range. The
   document, a section, a table cell, a list item, an inline span each answer "give me my
   exact bytes."
3. **`mdast` segment** — a reference to the node's layer-0 subtree, so a consumer can
   analyse constructs the typed model does not cover (links, images, nested emphasis)
   **locally**, without re-walking from the root.
4. The existing **typed fields** (`name`/`depth`, `columns`/`rows`, `value`, …) —
   unchanged; still primary.

This yields a **fallthrough guarantee** at every node:

> typed model → (if unmodelled) mdast segment → (if that is not enough) raw bytes

A consumer is structurally never forced to leave the tree and re-read the file.

Scope is staged **by depth**, matching cost (and the difficulty ladder the consumers hit):

| Depth | Adds | Resolves | Cost |
|---|---|---|---|
| Document | `DocTree.body` | frontmatter body (`dev` #523) | trivial — already in flight |
| Section | `SectionNode` range/`raw` | section-body slice (`dev` #520) | cheap — heading pos → next-sibling pos |
| Block & cell | table/list/paragraph/code + per-cell range/`raw` | verbatim cells (`dev` #518) | bounded — mdast already has per-cell positions |
| Inline | positioned inline spans (text vs code) | inline offsets (`dev` #519) | costly — the projection flattens phrasing today |

The inline tier is the only expensive one: the projection currently flattens inline
phrasing to a single string, so surfacing spans means keeping their positions and growing
`SourcePos` with `end` (already anticipated in the D-0002 type comment). It may land as an
on-demand `spans()` accessor on paragraph/cell rather than promoting every inline node, to
keep the always-on surface small.

**Consistency with [[D-0007-engine-scope-and-fidelity]].** This is read-only and
retain-don't-rewrite — it exposes *more* of what the parser already saw; it never mutates
or re-serializes source. It generalizes D-0007's F1 fidelity ("the raw mdast is retained
and exposed as `tree.mdast`") from a single root escape hatch to a per-node one. Nothing
existing changes; every point is an addition.

## Why

- **One capability, not four.** The document / section / cell / inline requests are the
  same primitive at four depths. Solving them piecemeal grows four bespoke accessors
  (`body`, `sourceText`, `rawRows`, span offsets) that will drift; solving it once is
  smaller and coherent.
- **Consumers stop leaving the tree.** Every current workaround — re-reading the file,
  re-splitting rows via `rowPos`, re-masking inline code — exists only because the exact
  bytes are unreachable from the node. Per-node `raw` removes the whole class.
- **It is the proven shape.** Lossless-CST + typed-overlay is what tree-sitter, Roslyn,
  rowan, LibCST, and PostCSS all converged on; adopting it follows a well-worn path.
- **Cheap because mdast already has offsets.** The positional data exists one layer down;
  we thread it up rather than compute it.
- **Fits the posture.** Purely additive to D-0007's read-only / retain stance; no risk to
  the determinism the CLI exit code and CI gate depend on.

## Consequences

- **Additive API growth.** Every node gains `range` and (lazy) `raw` / `mdast`. Typed
  fields are unchanged; existing consumers are unaffected.
- **`range` is the serializable source of truth.** Over the daemon / JSON API (the
  [[D-0012-distribution-single-exec-and-web-ui]] direction), `raw` and `mdast` are
  live-only conveniences reconstructable from `range` + the source string; a rehydrated
  tree without the source can still carry ranges but not `.raw`. The JSON shape must be
  decided accordingly.
- **mdast becomes public API at every node** (today it is public only at the root).
  Swapping the layer-0 parser becomes a wider breaking surface — an accepted,
  already-partial coupling (D-0002 / D-0007 expose `tree.mdast`).
- **Memory stays O(nodes)** for ranges + one retained source; per-node eager `raw` copies
  are explicitly rejected.
- **The typed-cell / structured-cell design becomes a special case** of this: typed cells
  are the *typed-model* view of a positioned cell whose *raw* view is the verbatim cell;
  the two should share the cell's `range`.

## Open questions

- **`raw` as a lazy getter vs an explicit helper** (`raw()` / `sliceOf(source, range)`).
  Getters do not survive serialization; a helper keeps the serialized shape clean.
- **Inline shape:** promote inline spans to first-class positioned nodes, or expose an
  on-demand `spans()` on paragraph/cell? (always-on surface vs granularity.)
- **`SourcePos.end`:** add it globally now (D-0002 anticipated it) or carry a per-node
  `range` only?
- **Offsets vs line/col in `range`:** offsets slice directly; line/col are what findings
  already use. Store offset and derive line/col, or carry both?
- **Consumption model:** does `read()` ([[D-0005-consumption-oom]]) also expose `raw` /
  `mdast` per view, or only the projection tree?

## References

- [[D-0007-engine-scope-and-fidelity]] — the read-only / retain-fidelity posture this extends from root-only to per-node.
- [[D-0002-projection-and-dialect]] — the projection and `SourcePos` this adds `range` to.
- [[D-0005-consumption-oom]] — the typed object model = the third view.
- `provenance/d0014/` — the framework shape; the typed-cell / structured-cell design is the cell-level special case of this decision.
- Prior art: tree-sitter — <https://tree-sitter.github.io/tree-sitter/using-parsers/2-basic-parsing.html>; Roslyn red-green trees — <https://github.com/dotnet/roslyn/blob/main/docs/compilers/Design/Red-Green%20Trees.md>; rust-analyzer/rowan — <https://github.com/rust-analyzer/rowan>; LibCST — <https://libcst.readthedocs.io/en/latest/why_libcst.html>; PostCSS syntax — <https://github.com/postcss/postcss/blob/main/docs/syntax.md>; unist positions — <https://github.com/syntax-tree/unist>.
