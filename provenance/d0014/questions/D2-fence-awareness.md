> Question D2 for [[D-0014-markdown-structure-validation|D-0014]] — fence-awareness as a §2 invariant.
> Part of the open-decision review (see ../review-checklist.md). Non-normative; records the
> decision, folded into proposed-shape.md at step H1.

# D2 · fence-awareness

**Surfaced by:** [[21b-fence-contains-heading-line|21b]].

## The question

A `## ` line *inside* a fenced code block is code, not a heading (likewise `^block-id`, `| a | b |`,
etc.). The §2 projection treats it correctly today only because mdast does — but the doc filed it as
an S6 *open question*. Promote it to a committed §2 **invariant**?

## Recommendation — yes, commit it

This isn't a feature to build; it's **intrinsic to the mdast parse** and the entire reason D-0014
uses a real parser instead of the line scanners it retires (those *do* mis-fire on `##` in fences —
exactly the bug the corpus has). So state it as a guarantee:

> **§2 invariant.** A fenced `code` node's value is **opaque** — never re-scanned for `#` headings,
> `^block-ids`, pipe tables, or any block/section syntax. The projection sees one `code` BlockNode;
> nothing inside it becomes a section or anchor.

(The example suite is the proof case: `21b` puts a `##` line in a fence and expects zero phantom
sections.) Promoting it from "open question" to "invariant" costs nothing and closes a correctness
question the line-scanner era couldn't.

## Decision

**Resolved (2026-06-19).** Committed as a §2 Layer-1 **invariant**: a fenced `code` node's value is
**opaque** — never re-scanned for `#` headings, `^block-ids`, pipe tables, or any block/section
syntax; the projection sees one `code` BlockNode and nothing inside it becomes a section or anchor.
Intrinsic to the mdast parse (the reason D-0014 replaces the line scanners, which mis-fire here).
Removed from the S6 open list. Fold into proposed-shape.md at H1 (§2 invariant).
