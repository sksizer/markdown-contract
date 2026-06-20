---
type: driver
schema_version: '1'
id: DR-0005
kind: use-case
product: '[[PR-0001-markdown-contract]]'
status: open/proposed
title: Validate an arbitrary document tree from one config
created: '2026-06-20'
related: []
tags:
  - cli
  - reusable
  - ci
need_human_review: true
---

# Validate an arbitrary document tree from one config

## Statement

The value isn't one corpus — it's that any project with structured markdown can adopt the same
guarantees without re-implementing a validator. The use-case is a declarative config that maps
directories / globs to the contract that governs them, validates a whole tree in one run, and emits
CI-friendly output (human / JSON / SARIF) with a meaningful exit code — the engine carrying no
knowledge of any particular repo.

^summary

## Who/what it affects

Any team with a structured-markdown tree (docs sites, ADR collections, knowledge bases) that wants
enforceable structure in CI without writing a bespoke linter — and the CI pipelines that need a
pass/fail signal.

## Evidence

- The design separates the single-doc engine from the corpus runner deliberately: the engine
  validates one doc × one contract; the runner maps a file tree → contracts and aggregates (the
  deferred CLI-runner item and `M·corpus-runner` in `provenance/d0014/review-checklist.md`).
- The same engine is meant to power both this CLI and in-process consumers (e.g. an SDLC
  `entities validate`), so the runner is library API, not a CLI-only path (the Package & CLI shape in
  the plan).

## Toward resolution

`M·corpus-runner` (L6) — the `runner` library API plus the `markdown-contract` CLI (dir → contract
config, SARIF / CI output). Plan: `provenance/d0014/review-checklist.md`.
