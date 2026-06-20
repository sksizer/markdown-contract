---
type: driver
schema_version: '1'
id: DR-0003
kind: use-case
product: '[[PR-0001-markdown-contract]]'
status: open/proposed
title: Parse the Obsidian-flavoured dialect that nothing on npm handles
created: '2026-06-20'
related: []
tags:
  - obsidian
  - parsing
  - anchors
need_human_review: true
---

# Parse the Obsidian-flavoured dialect that nothing on npm handles

## Statement

Many corpora are written in Obsidian-flavoured markdown — `^block-id` anchors,
`[[wikilink|alias#anchor]]` references, `![[transclusion#^anchor]]` embeds. No off-the-shelf parser
understands these constructs, yet they carry real structure: anchors bind tables, wikilinks form the
dependency graph. The use-case is a parser that recognises the dialect as first-class nodes so
contracts can address and validate them.

^summary

## Who/what it affects

Any contract that needs to bind a block by `^anchor`, resolve a `[[wikilink]]`, or follow a
transclusion — i.e. most real entity contracts — and the integrity of the cross-reference graph the
corpus depends on.

## Evidence

- Anchor-bound structure is exercised throughout the suite: required `^anchor` presence
  (`…/09b-anchor-missing.md`), anchored-table content records
  (`…/15-multiple-anchored-tables-one-section.md`, `…/15a-…`, `…/15b-…`), and `byAnchor` consumption
  (`provenance/d0014/examples/consumption/07-byanchor-declared-vs-dynamic.md`).
- The design record names the in-house micromark extension as load-bearing precisely because nothing
  on npm parses the dialect (`provenance/d0014/proposed-shape.md`; the decision `README.md`).

## Toward resolution

The projection milestone (L1, `M·projection`) commits the Obsidian micromark extension and remark-gfm;
the structure plane (L2) consumes its anchor nodes. Plan: `provenance/d0014/review-checklist.md`.
