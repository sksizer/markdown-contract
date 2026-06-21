---
type: capability
schema_version: '1'
id: C-0005
kind: technical
title: Two-plane contract engine
status: open/planned
created: '2026-06-20'
parent_key: null
contains: []
related:
  - '[[C-0001-contract-validation]]'
  - '[[C-0004-dialect-aware-projection]]'
tags:
  - engine
  - structure-plane
  - content-plane
need_human_review: true
---

# Two-plane contract engine

## Summary

- Match a projected document against a contract on two formally-incomparable planes — a regular tree
  grammar over structure and Zod over content — plus a named-rule registry for cross-node /
  cross-file constraints. ^summary
- The core mechanism behind contract validation and the typed model.

## Statement

The engine validates a `DocTree` against a contract by running a structure plane (a tree grammar over
section sequence and block kinds — required / optional, alias-sets, ordering, gap windows) and a
content plane (Zod over each block's data), then a registry of named rules including cross-plane
`docRule`s. Schema languages and tree grammars are formally incomparable (Murata), so neither plane is
forced to do the other's job.

## What it provides

- A structure-plane matcher emitting `structure/*` findings (section grammar, the block / anchor
  family, key collisions).
- A content-plane validator emitting `content/*` and `frontmatter/*` findings via Zod, with issue
  paths remapped to source lines.
- A named-rule registry — per-node `rule()` plus cross-plane / cross-file `docRule()`.

## Notes

The mechanism behind [[C-0001-contract-validation]] and [[C-0002-typed-consumption]], running over
[[C-0004-dialect-aware-projection]]. Designed across the `D·structure-plane`, `D·content-plane`, and
`D·finding-model` ADRs. Status `open/planned`.
