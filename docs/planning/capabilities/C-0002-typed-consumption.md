---
type: capability
schema_version: '1'
id: C-0002
kind: feature
title: Typed consumption
status: open/planned
created: '2026-06-20'
parent_key: null
contains: []
related:
  - '[[DR-0002-typed-consumption]]'
  - '[[C-0001-contract-validation]]'
  - '[[C-0005-two-plane-contract-engine]]'
tags:
  - consumption
  - typed-model
  - oom
need_human_review: true
---

# Typed consumption

## Summary

- Read a validated document as a typed, navigable model — named sections, typed table rows, anchor
  lookups — without re-parsing or hand-rolling selectors. ^summary
- The reward for validity: the same contract that checks a document also types it.

## Statement

Once a document passes its contract, a consumer reads it as data: `read()` returns a typed model whose
shape is inferred from the contract. Sections are reachable by name, tables yield typed rows, anchors
resolve to blocks. Report ops and summaries consume structure, not an AST.

## What it provides

- `read()` / `validate().doc` returning a contract-typed model (`Infer<Contract>`).
- `SectionView` (text, tables, lists, nested sections), `TableView<Row>` (typed rows, `column`,
  `find`, `rowPos`), and `byAnchor`.
- Dual-key section access — typed key, bracket, lowerCamelCase, and `.section()`.

## Notes

Serves [[DR-0002-typed-consumption]]; additive over [[C-0001-contract-validation]] (the validator
never depends on it) and rests on [[C-0005-two-plane-contract-engine]]. The model surface is the
`D·consumption-oom` ADR. Status `open/planned`.
