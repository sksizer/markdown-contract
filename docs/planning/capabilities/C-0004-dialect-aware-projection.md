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

## Notes

Underpins [[C-0001-contract-validation]] and [[C-0002-typed-consumption]]. **Build-vs-adopt** the
dialect parser — adopt a wikilink / OFM remark plugin and add only the missing `^block-id` extension,
versus a focused in-house micromark extension — is the open `D·projection` ADR. This capability
absorbs the former Obsidian "driver" (reclassified per review). Status `open/planned`.
