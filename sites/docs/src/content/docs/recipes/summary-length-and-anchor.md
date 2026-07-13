---
title: Cap the summary and make it addressable
description: Every note opens with a Summary that other pages excerpt. One contract keeps it under a word budget and guarantees the ^summary anchor those excerpts point at.
---

**The situation.** Every note in your vault opens with a **Summary** that other
pages excerpt and transclude — `![[caching#^summary]]` drops the summary of one
note into another. That only works while two things hold: the summary stays
short enough to embed cleanly, and the `^summary` block-id it's addressed by
actually exists. Both erode silently — summaries balloon, anchors get forgotten
on new notes — and every erosion breaks some *other* page. A contract can pin
both.

## 1. Write the contract

Two keys on one section carry the whole recipe: `anchor` requires a resolving
`^summary` block-id, and the `maxWords` content leaf caps the prose:

```yaml
# summary.contract.yaml
mcVersion: 1
kind: contract
body:
  order: recognized-relative
  allowUnknown: true                   # notes can have any sections after Summary
  sections:
    - section: Summary
      anchor: summary                  # a ^summary block-id must resolve here
      content: { maxWords: 60 }        # keep the excerpt short
```

Both keys are documented in the [Declarative YAML reference](/reference/yaml/):
`anchor` under section keys, `maxWords` under content leaves.

## 2. Run it

`notes/` holds three notes. One conforms. `retries.md` has a summary that has
grown to 71 words, and `queues.md` never got its `^summary` line:

```sh
markdown-contract validate notes --contract summary.contract.yaml
```

```text
Scanned 3 files; 3 matched, 0 unmatched

queues.md:3 error structure/anchor-missing — section ‘Summary’ is missing required block-id ^summary
retries.md:5 error content/max-words — paragraph runs to 71 words; expected at most 60

2 finding(s): 2 error, 0 warn, 0 report
```

Each finding lands where you'd fix it: `anchor-missing` points at the
**Summary** heading of the note that lacks the anchor, `max-words` points at
the over-long paragraph itself — and reports the actual count, so you know how
much to cut. Error-level findings flip the exit code to **1**, so this gates in
CI exactly like [Guard a folder of docs in CI](/recipes/guard-a-folder-in-ci/).

## 3. The conforming shape

A passing note is a short paragraph with a standalone `^summary` line under it:

```md
# Caching strategy

## Summary

Reads go through the edge cache; writes invalidate by tag. Anything not
covered by a tag falls back to a 5-minute TTL.
^summary

## Details

The cache sits in front of the API gateway...
```

The standalone `^summary` binds to the paragraph directly above it — so
`![[caching#^summary]]` transcludes exactly that paragraph, and the 60-word cap
is a promise about how much text arrives at the other end. With the two broken
notes fixed to this shape:

```text
Scanned 3 files; 3 matched, 0 unmatched

No findings.
```

Exit **0**.

:::tip
Three placements all satisfy `anchor: summary`: trailing on the paragraph's
last line (`…5-minute TTL. ^summary`), standalone after the paragraph (as
above), or standalone directly under the heading before any prose — the last
binds to the *section* rather than a block. The
[dialect reference](/reference/dialect/) spells out the binding rules; prefer
the after-the-paragraph form when the point is transcluding that paragraph.
:::

## What's happening

- **`anchor: summary`** is a structure-plane check: the section must contain a
  resolving `^summary` — block-bound or section-level both count. A declared
  anchor with no matching block-id is `structure/anchor-missing`. See
  [Require an anchor with a contract](/examples/dialect/dialect-09/) for the
  mechanism in isolation.
- **`maxWords: 60`** is a content-plane check with a **per-paragraph** budget:
  every paragraph in the section must fit under the cap. A one-paragraph
  summary — the shape that transcludes cleanly — therefore caps the whole
  excerpt. The rule ids and their default levels are in the
  [Findings reference](/reference/findings/).
- One parse feeds both planes — [how it works](/how-it-works/).

:::note
The contract guarantees the anchor **exists**; it does not follow the
`![[note#^summary]]` links that point at it. The parser recognizes wikilinks
and transclusions so they survive a parse, but recognition is not
referential-integrity checking — see the
[dialect reference](/reference/dialect/).
:::

## Next

- [Every vault note exposes a ^summary block](/recipes/require-a-summary-anchor/)
  — the vault-wide version of this contract, rolled out across a whole tree.
- [Guard a folder of docs in CI](/recipes/guard-a-folder-in-ci/) — wire the
  exit code into a one-line CI gate.
- [Dialect reference](/reference/dialect/) — the full `^block-id` syntax, where
  anchors bind, and how they surface through the model.
