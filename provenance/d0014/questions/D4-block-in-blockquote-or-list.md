> Question D4 for [[D-0014-markdown-structure-validation|D-0014]] — a block nested in a blockquote or
> list item. Part of the open-decision review (see ../review-checklist.md). Non-normative; records
> the decision, folded into proposed-shape.md at step H1.

# D4 · block in blockquote/list

**Surfaced by:** [[21a-table-inside-blockquote-or-list|21a]].

## The question

A `table` / `list` / `code` can be nested *inside* a blockquote or a list item rather than sitting
directly under a heading:

```text
## Files
> | Location | Kind |
> | -------- | ---- |
> | a.ts     | add  |
```

Does the projection promote that table to a section-level block (so `content: table(...)` matches),
or leave it nested — and what finding, if any?

## Part 1 — projection: do not hoist

A block whose nearest ancestor is a
**blockquote or list item is *not* promoted to a section-level `BlockNode`**. A blockquoted table is
quoted content; a table inside a list item is part of the list — silently hoisting either would
misrepresent the document. So `section.blocks` holds only heading-direct blocks; nested content
stays inside its wrapper (still in the section's flattened text). (A *top-level* list under a
heading is still a section-level `list` block — only blocks nested *inside* a blockquote/list-item
are excluded.) Hoisting a nested block up to section level is explicitly
**not supported at this time** — a possible future opt-in, not v1.

## Part 2 — finding: reuse `structure/block-missing`, with a self-explaining message

No new id. A declared `content: table(...)` over such a section finds no section-level table → it's
C5's **`structure/block-missing`** (error; reclassified from `content/table/missing` per F3-B). But
— same self-containment principle as D3 — a plain "none found" is confusing when the author *did*
write a table (just buried). So **enrich that message** when the section contains a same-kind block
nested in a blockquote/list:

> `Expected a table in "Files"; a table is present but nested in a blockquote/list — move it to the
> section level.`

That's message enrichment, not a new finding — the projection already knows the nested block is
there. (A dedicated `structure/block-nested` warn was considered and rejected: this is rarer than
the heading-depth cascade, and one clear, enriched `structure/block-missing` says it better than two
findings.)

## Decision

**Resolved (2026-06-19).** **Part 1:** do **not** hoist — a block nested in a blockquote or list
item is not promoted to a section-level `BlockNode`; `section.blocks` holds only heading-direct
blocks. Hoisting is explicitly **not supported at this time** (possible future opt-in). **Part 2:**
no new id — a declared `content: <leaf>(...)` over such a section finds no section-level block and
emits C5's `structure/block-missing` (error). The nested-aware message ("a table is present but
nested in a blockquote/list…") is a **deferrable nicety**, not required for v1. Fold into
proposed-shape.md at H1 (§2: blockquote/list-nested blocks are not section-level).
