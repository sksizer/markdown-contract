---
type: capability
schema_version: '1'
id: C-0001
kind: feature
title: Contract validation
status: open/planned
created: '2026-06-20'
parent_key: null
contains: []
related:
  - '[[DR-0001-general-markdown-validation]]'
  - '[[DR-0004-validate-sdlc-corpus]]'
  - '[[C-0004-dialect-aware-projection]]'
  - '[[C-0005-two-plane-contract-engine]]'
tags:
  - validation
  - contract
  - findings
need_human_review: true
---

# Contract validation

## Summary

- Validate a markdown document against a declared per-type contract, producing positioned findings
  across frontmatter, section structure, and block content. ^summary
- The core feature the library exists to deliver; serves general validation and the SDLC-corpus
  dogfood.

## Statement

A consumer declares a contract for a document type — its frontmatter shape, its section grammar, and
its block content — and the library validates any document against it in a single pass, returning a
flat list of findings, each carrying a source position and a stable registry id. Validation never
depends on the typed model; findings are the primary product.

## What it provides

- A `validate(source, contract)` call returning `{ findings, doc?, tree }`.
- Findings spanning all three planes (frontmatter, structure, content), each with a `pos` and a
  registry id, merged in a stable order.
- A strict `read()` door that throws `ContractError` when an error-level finding is present.

## Notes

Serves [[DR-0001-general-markdown-validation]] and [[DR-0004-validate-sdlc-corpus]]; realized by the
[[C-0005-two-plane-contract-engine]] over the [[C-0004-dialect-aware-projection]]. The finding model
is the `D·finding-model` ADR. Status `open/planned`.
