---
type: driver
schema_version: '1'
id: DR-0004
kind: use-case
product: '[[PR-0002-markdown-contract-cli]]'
status: open/proposed
title: Check a document tree's markdown quality from the command line
created: '2026-06-20'
related: []
tags:
  - cli
  - quality
  - ci
need_human_review: true
---

# Check a document tree's markdown quality from the command line

## Statement

Most projects want enforceable markdown quality without writing and maintaining a bespoke linter. The
use-case is a command-line tool that takes a declarative directory → contract config, validates a
whole tree in one run, and emits CI-friendly output (human / JSON / SARIF) with a meaningful exit
code — so structure and content rules become a pass/fail gate in CI or a commit hook, for any repo.

^summary

## Who/what it affects

Any team with a structured-markdown tree (docs sites, ADR collections, knowledge bases) that wants
quality gates without a bespoke linter — and the CI pipelines that need a pass/fail signal.

## Evidence

- The design separates the single-doc engine from the corpus runner: the engine validates one
  document × one contract; the runner maps a file tree → contracts and aggregates findings (the
  `M·corpus-runner` milestone in `provenance/d0014/review-checklist.md`).
- The CLI is a thin shell over that runner — argv → runner → format (human / JSON / SARIF) → exit
  code — holding no validation logic of its own (the Package & CLI shape in the plan).

## Toward resolution

`M·corpus-runner` (L6) — the `runner` library API plus the `markdown-contract` CLI (dir → contract
config, SARIF / CI output). Plan: `provenance/d0014/review-checklist.md`.
