---
type: product
schema_version: '1'
id: PR-0002
status: open/draft
title: markdown-contract CLI
created: '2026-06-20'
related:
  - '[[PR-0001-markdown-contract]]'
  - '[[vision]]'
tags:
  - cli
  - markdown
  - quality
need_human_review: true
---

# markdown-contract CLI

## Summary

- A general-purpose command-line tool for markdown structural and quality checking across a document
  tree — the `markdown-contract` bin over the library. ^summary
- A declarative dir → contract config validates a whole tree in one run, emitting CI-friendly output
  (human / JSON / SARIF) with a meaningful exit code.
- Corpus-agnostic: any project with structured markdown adopts it without writing a bespoke linter;
  SDLC is the flagship consumer, not the scope.

## What it is

markdown-contract CLI is the command-line offering built on the library
([[PR-0001-markdown-contract]]). It maps a file tree to the contracts that govern it, runs the
library's `runner` across the tree, aggregates the findings, and reports them for humans and CI. It is
a **thin shell**: argv → runner → format → exit code, with no validation logic of its own — that all
lives in the library. The why lives in [[vision]]; this entity is the *how*.

## Boundary

**Inside:** the `markdown-contract` bin; argv parsing; the dir → contract config format; the output
formatters (human / JSON / SARIF); exit codes; and CI / commit-hook integration.

**Outside:** the validation engine, the typed model, and the parse / projection — all the library
([[PR-0001-markdown-contract]]); the CLI is a *consumer* of it and holds no business logic. Markdown
generation and formatting are out of scope for the whole family.

This Product ships from the **same npm package** as the library — one package, two faces (the `bin`
over the `exports`), per the Package & CLI shape in
[`../../provenance/d0014/review-checklist.md`](../../provenance/d0014/review-checklist.md). It is a
distinct *offering*, not a distinct package. (Provisional name — open to a dedicated CLI name on
review.)

## Drivers & goals

The use-case Drivers scoped to this Product are catalogued under [Drivers](../drivers/) — the
CLI-facing ones: a general markdown-quality CLI, the reusable corpus runner, and CI integration.
Validating the SDLC corpus from the CLI is the flagship dogfood.

## Status

`open/draft` — Phase 0. Depends on the library reaching its corpus-runner milestone (L6); the CLI is a
thin layer once the `runner` API lands.

## References

- Library: [[PR-0001-markdown-contract]] · [[vision]]
- Plan: [`../../provenance/d0014/review-checklist.md`](../../provenance/d0014/review-checklist.md)
