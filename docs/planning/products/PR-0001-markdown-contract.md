---
type: product
schema_version: '1'
id: PR-0001
status: open/draft
title: markdown-contract (library)
created: '2026-06-20'
related:
  - '[[vision]]'
  - '[[PR-0002-markdown-contract-cli]]'
tags:
  - library
  - markdown
  - validation
need_human_review: true
---

# markdown-contract (library)

## Summary

- A general-purpose library that validates markdown *structure* and *content* as code and reads it back as a typed model — per-type contracts over a single parse. ^summary
- Two planes — a tree-grammar **structure** plane and a Zod **content** plane — plus a named-rule registry; one contract serves both `validate()` and `read()`.
- Corpus-agnostic and embeddable: it carries no knowledge of any project, so any structured-markdown corpus can adopt it. The SDLC planning corpus is the flagship proving consumer, not the scope.

## What it is

markdown-contract (the library) turns "is this document shaped right?" and "give me this document as data" into one declarative contract per document type. A single remark/mdast parse — extended for the Obsidian dialect — feeds a **structure** plane (a regular tree grammar over sections and block kinds), a **content** plane (Zod over each block's data), and a registry of **named rules** for cross-node / cross-file constraints. The same contract that reports findings infers a typed model the caller reads. It is a pure, importable package: no argv, no `process`, no I/O of its own. The why lives in [[vision]]; this entity is the *how*.

## Boundary

**Inside:** the contract API; the parse / projection (including the Obsidian-dialect extension — `^block-id`, `[[wikilink]]`, `![[transclusion]]`); structural and content validation with source positions; the named-rule registry; the typed read model; and the in-process corpus `runner` API (a dir → contract config aggregated in-process).

**Outside:** the command-line tool itself — argv, stdout, exit codes, CI output formatting — which is the sibling Product [[PR-0002-markdown-contract-cli]], built atop this library; generating markdown from templates (we validate the rendered document, not author it); whitespace / formatting normalisation; and any single corpus's domain schemas — those are *consumers* (the SDLC corpus is the first), not part of the library.

## Drivers & goals

The use-case Drivers scoped to this Product are catalogued under [Drivers](../drivers/) — the library-facing ones: general markdown validation, typed consumption, Obsidian-dialect fidelity, and author-time structural findings. The SDLC-corpus driver is the flagship dogfood that proves them.

## Status

`open/draft` — Phase 0 scaffolding. The API design is settled (38 decisions) and recorded under [`../../provenance/d0014/`](../../provenance/d0014/); implementation begins at milestone L0.

## References

- [[vision]] · sibling product [[PR-0002-markdown-contract-cli]]
- Design spec: [`../../provenance/d0014/proposed-shape.md`](../../provenance/d0014/proposed-shape.md)
- Decision record and plan: [`../../provenance/d0014/review-checklist.md`](../../provenance/d0014/review-checklist.md)
