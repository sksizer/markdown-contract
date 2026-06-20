---
type: product
schema_version: "1"
id: PR-0001
status: open/draft
title: markdown-contract
created: 2026-06-20
tags:
  - library
  - markdown
  - validation
related:
  - "[[vision]]"
---

# markdown-contract

## Summary

- A library that validates markdown *structure* and *content* as code and exposes a
  typed model to read — per-type contracts over a single parse.
- Two planes (tree-grammar structure + Zod content) plus a named-rule registry; one
  contract serves both `validate()` and `read()`.
- Ships a thin `markdown-contract` CLI over the same engine; generic and reusable
  outside any one repo.

^summary

## What it is

markdown-contract turns "is this document shaped right?" and "give me this document as
data" into one declarative contract per document type. A single remark/mdast parse
feeds a structure plane (a regular tree grammar over sections and block kinds), a
content plane (Zod over each block's data), and a registry of named rules for
cross-node and cross-file constraints. The same contract that reports findings also
infers a typed model the caller can read.

## Boundary

**Inside:** parsing the Obsidian-flavoured dialect (`^block-id`, `[[wikilink]]`,
`![[transclusion]]`), structural and content validation with source positions, the
typed read model, and a dir→contract corpus runner plus CLI.

**Outside:** generating markdown from templates (we validate the rendered document,
not author it); formatting and whitespace normalisation (a separate concern); and any
single corpus's domain schemas — those are *consumers* of this engine, not part of it.
The SDLC planning corpus is the flagship such consumer, not a dependency.

## Drivers & goals

Use-case drivers are catalogued under [`../drivers/`](../drivers/) (Phase 1). The
flagship is validating a live SDLC planning corpus end-to-end; others cover
author-time structural feedback, typed consumption, Obsidian-dialect fidelity, and a
reusable corpus runner.

## Status

Phase 0 — scaffolding. The API design is settled (38 decisions) and recorded under
[`../../provenance/d0014/`](../../provenance/d0014/); implementation begins at
milestone L0.

## References

- [[vision]]
- Design spec: [`../../provenance/d0014/proposed-shape.md`](../../provenance/d0014/proposed-shape.md)
- Decision record and plan: [`../../provenance/d0014/review-checklist.md`](../../provenance/d0014/review-checklist.md)
