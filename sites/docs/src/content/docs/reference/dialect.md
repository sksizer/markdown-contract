---
title: Dialect reference
description: The Obsidian-flavored constructs the parser understands — line-terminal ^block-id anchors, [[wikilinks]], and ![[transclusions]] — and how they surface through the model.
---

markdown-contract parses one document with remark (GitHub-flavored markdown plus
YAML frontmatter) and extends it with a small, in-house **Obsidian dialect**. The
dialect is two constructs: line-terminal `^block-id` **anchors**, which make blocks
and sections addressable, and `[[wikilink]]` / `![[transclusion]]` **vault
references**, which are recognized so they survive a parse intact.

Both are on by default — there is no flag to turn them on. See
[How it works](/how-it-works/) for where the dialect sits in the pipeline, and
[Dialect examples](/examples/dialect/) for worked documents.

:::note
The low-level parse helpers in `dialect/*.ts` are **internal**. This page documents
the *syntax the parser recognizes* and how anchors and links surface through the
parsed model and contracts — not a public dialect API. See
[What is exported](#what-is-exported) below.
:::

## Anchors

An **anchor** is a line-terminal `^identifier` token bound to the block or section
it terminates. The identifier is `[A-Za-z0-9_-]+` — letters, digits, underscore,
hyphen. The token must sit at the **end of a line**, with whitespace (or the line
start) before the `^`; a `^id` in the middle of a line is ordinary text, not an
anchor.

```md
The API must never rewrite a document. ^readonly-invariant
```

Anchors bind to **blocks**, not to heading text. A `^id` written on a heading line
is not stripped or bound — the projection walks headings separately and never lifts
an anchor off them. To anchor a *section*, put a standalone `^id` line under the
heading (see below).

Two positions are recognized:

| Form | Where it binds | Surfaces as |
|---|---|---|
| Trailing on a block's last line (`prose… ^id`) | the block it terminates | `BlockNode.anchor` |
| Standalone paragraph (`^id` alone) | the preceding block, or the section | block anchor, else `SectionNode.anchors` |

### Block anchors vs section anchors

The projection binds an anchor as low as it can:

- A **trailing** anchor on a paragraph is stripped off the block's text and becomes
  that block's anchor. On a list, the first item carrying a trailing `^id` wins and
  the token is stripped from that item.
- A **standalone** `^id` paragraph binds to the immediately preceding block *if that
  block has no anchor yet*; otherwise it is recorded as a **section-level** anchor on
  the enclosing section.
- A table absorbs a special case: GFM parses a bare `^id` line directly under a table
  as an extra single-cell row. The projection lifts that trailing `^id` row out as the
  **table's** anchor rather than keeping it as a data row.

A standalone `^id` with no block ahead of it in the section becomes a section anchor:

```md
## Decision

^decided
```

Here `^decided` binds to the **Decision** section (`SectionNode.anchors`), because no
block precedes it inside that section.

A trailing `^id` row under a table binds to the table:

```md
## Components

| name | owner |
|------|-------|
| api  | kelly |
^components
```

Here `^components` binds to the table, not to a phantom data row.

### How anchors become addressable

Anchors are the addressing primitive every anchor-bound contract rests on. In the
projected tree, a section-level `^id` lands in that section's `anchors`, while a
block-bound `^id` rides on its block as `BlockNode.anchor`. Through the typed model:

- a section's `anchors` surfaces its section-level `^block-id`s; block-bound anchors
  surface on the `BlockView` they terminate;
- `doc.byAnchor(id)` resolves a `^anchor` **anywhere in the document** to a
  `.kind`-discriminated `BlockView`; a `SectionView` also exposes `byAnchor(id)`
  scoped to its own blocks.

A contract can also *require* an anchor. Declaring `anchor` on a section (or
declarative-DSL node) asks the structure plane to check that the matching `^block-id`
is present; a declared anchor with no matching block-id in the document is a
`structure/anchor-missing` finding. See the [model reference](/reference/model/) for
`byAnchor` and the [findings reference](/reference/findings/) for `anchor-missing`.

## Wikilinks

A **wikilink** is `[[target]]`. The recognizer parses out three optional parts:

| Syntax | Part | Example | Parsed |
|---|---|---|---|
| `[[target]]` | target only | `[[Decision Record]]` | target `Decision Record` |
| `[[target\|alias]]` | display alias after `\|` | `[[D-9001\|the decision]]` | target `D-9001`, alias `the decision` |
| `[[target#heading]]` | heading fragment after `#` | `[[D-9001#Decision]]` | target `D-9001`, fragment `Decision` |
| `[[target#^anchor]]` | block-anchor fragment after `#` | `[[D-9001#^decided]]` | target `D-9001`, fragment `^decided` |

The `#fragment` distinguishes a **heading** reference from a **block-anchor**
reference only by a leading `^`: `#Decision` targets a heading, `#^decided` targets a
`^block-id`. The recognizer captures the fragment verbatim either way — a leading `^`
is what marks it as a block-anchor fragment.

Splitting is order-sensitive: the recognizer peels the `|alias` off first, then the
`#fragment` off what remains. So the canonical order is `[[target#fragment|alias]]`
(the fragment before the alias); a `#` that appears *after* the `|` is captured as
part of the alias, not as a fragment.

### What the parser recognizes vs ignores

Recognition is a light post-parse pass over already-flattened text, not a full
grammar. remark parses `[[…]]` as ordinary text; the pass recognizes the construct so
its target survives intact and can be reasoned about later.

- It **recognizes** the `[[…]]` / `![[…]]` shape and splits `target`, `alias`, and
  `fragment`. It tolerates remark-stringify's backslash-escaping of brackets
  (`\[\[…]]`), so the construct is still recognized after a parse → stringify →
  re-parse cycle.
- It does **not** resolve targets, follow links, or check that a target document or
  heading exists — recognition is not referential-integrity checking.
- A `[[…]]` inside a fenced code block is opaque: remark models a fence as one code
  node, so nothing inside it is recognized as a link (or an anchor).

## Transclusions

A **transclusion** is a wikilink with a leading `!`: `![[target]]`. It takes the same
optional `|alias` and `#fragment` parts, including block-anchor fragments:

```md
![[Style Guide]]
![[D-9001#Decision]]
![[D-9001#^decided]]
```

The only difference from a wikilink is the kind — `![[…]]` is a transclusion,
`[[…]]` is a wikilink. Like wikilinks, transclusions are recognized so they survive
projection; the parser does not inline or expand the referenced content.

## Round-trip fidelity

A **byte-exact** round-trip is not achievable on this substrate and is not claimed:
remark-stringify normalizes whitespace, list markers, table padding, and emphasis
delimiters regardless of the dialect. What is guaranteed is that the dialect
**constructs** — `^anchor`, `[[wikilink]]`, and `![[transclusion]]` — survive a
parse → stringify → re-parse cycle: after the round-trip the anchor still binds to its
block and the link targets are still recognized.

## What is exported

The dialect's parse helpers are **internal to `core`**. In particular, the
vault-reference harvester (`extractVaultRefs`) is **not re-exported at the package
root** today — it stops at the internal `core/dialect` barrel. There is no shipped,
public API for enumerating the `[[wikilinks]]` / `![[transclusions]]` in a document.

:::note
Wikilinks and transclusions are **recognized** — they survive a parse without
corrupting the tree — but harvesting their targets is not part of the public surface
yet. Reach anchors through the model instead: a section's `anchors`, `doc.byAnchor(id)`,
and the `structure/anchor-missing` rule are the supported ways anchors surface. See the
[API reference](/reference/api/) for the exact package-root exports.
:::

## See also

- [Model reference](/reference/model/) — `anchors`, `byAnchor`, and the `BlockView` an
  anchor resolves to.
- [Findings reference](/reference/findings/) — `structure/anchor-missing`.
- [Dialect examples](/examples/dialect/) — worked documents that use anchors and links.
- [Glossary](/reference/glossary/) — anchor, wikilink, transclusion.
