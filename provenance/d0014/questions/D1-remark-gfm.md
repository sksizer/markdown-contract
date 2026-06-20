> Question D1 for [[D-0014-markdown-structure-validation|D-0014]] — committing `remark-gfm`. Part of
> the open-decision review (see ../review-checklist.md). Non-normative; records the decision, folded
> into proposed-shape.md at step H1.

# D1 · remark-gfm

**Surfaced by:** [[10-table-leaf-columns-minrows|10]], [[12-list-leaf-checkbox-minitems|12]],
[[21a-table-inside-blockquote-or-list|21a]].

## The question

The repo's parser today is `remark-parse` + `remark-frontmatter` only — **no `remark-gfm`** — so a
pipe table is a `paragraph` and a `- [ ]` item is plain text. Promote `remark-gfm` from an S6 open
question to a committed dependency?

## Recommendation — yes, commit `remark-gfm`

It is the dependency that makes the entire leaf layer real:

- `table` / `tableRow` / `tableCell` nodes — without them every `content/table/*` finding (C1, C2,
  C5) is unreachable;
- `listItem.checked` (GFM task-list items) — required for `list({ everyItem: "checkbox" })` (12,
  20b).

It's a single, decade-stable, pure-ESM package in the **same unified ecosystem** the engine already
uses — no new toolchain, no native binary. That fits the D-0014 "narrowest owned-risk surface"
thesis better than hand-rolling a table/checkbox parser (which the corpus currently does, and which
this library exists to retire). It also brings strikethrough / autolinks / footnotes — harmless; we
only consume tables + task-list items.

- **id** n/a (a dependency decision, no finding).
- The §2 projection's `table`/`list` `BlockNode`s and `ListItem.checked` depend on this.

## Ecosystem — staying on unified/remark (current majors)

unified/remark/micromark is the right base, not just the incumbent. It's actively maintained (remark
15 / micromark 4 era), produces a real, *specified* AST (mdast — the basis of structural
validation), and is the **only** ecosystem with the micromark extension model we require for the
Obsidian dialect (`^block-id`, wikilinks, transclusion). Pure-ESM (Bun-friendly with direct deps,
per S2); the same stack the round-trip gate and the wider content-tooling world (Astro, MDX,
Docusaurus) use. Pin current majors: `remark-parse`^11 / `unified`^11 (already in the repo),
`remark-gfm`^4, `micromark`^4, current `mdast-util-*`.

Considered and not chosen: `markdown-it` / `marked` (token streams / render-focused — no clean
mdast, no extension model); `comrak` / `pulldown-cmark` (Rust, non-mdast ASTs, native binaries). The
one genuinely newer option is **markdown-rs** (Titus Wormer's Rust port of micromark —
mdast-compatible, faster), but it's Rust-first with immature JS/WASM bindings, and WASM-under-Bun is
already a flagged risk. It's the natural parser for the *rust-ontogen* plane (D-DX1Q/D-WAKO) if that
ever parses bodies — not for this TS validator. Keep the document-side engine on remark.

## Decision

**Resolved (2026-06-19).** Bring in **`remark-gfm`** (^4) as a core `markdown-contract` dependency —
it yields `table`/`tableRow`/`tableCell` and `listItem.checked` (GFM task-lists), without which the
whole leaf layer (C1–C5) and checkbox lists (12) are unreachable. Stay on the **unified/remark**
ecosystem at current majors (`remark-parse`^11 / `unified`^11 / `micromark`^4 / current
`mdast-util-*`) — it's the only base with a specified mdast AST *and* the micromark extension model
the Obsidian dialect needs. `markdown-rs` (Rust) is noted as the rust-ontogen-plane option, not for
this TS validator. Fold into proposed-shape.md at H1 (§2: parser is `remark-parse` +
`remark-frontmatter` + `remark-gfm`; drop the "no gfm" caveat; §1 names the current majors).
