---
type: driver
schema_version: '1'
id: DR-0002
kind: use-case
product: '[[PR-0001-markdown-contract]]'
status: open/proposed
title: Read a validated document as a typed model
created: '2026-06-20'
related: []
tags:
  - consumption
  - typed-model
  - oom
need_human_review: true
---

# Read a validated document as a typed model

## Statement

Having validated a document, a consumer wants to *use* it — pull a section's prose, iterate a typed table, follow an anchor — without re-parsing markdown or hand-rolling selectors. The use-case is that the same contract that checks a document also types it: one read returns a typed model with named sections, typed rows, and anchor lookups, so report ops and summaries read data, not an AST.

^summary

## Who/what it affects

Programs that consume a corpus — dashboards, report generators, summaries, migrations — which today re-parse markdown or scrape regex to extract what a contract already knows.

## Evidence

- The consumption tier exercises the typed read surface against the same contracts the validation tier checks: `read()` / `validate()` (`provenance/d0014/examples/consumption/01-…`, `02-…`), dual-key section access (`03-…`), `SectionView` content (`04-…`), typed `TableView` rows (`05-…`, `06-…`), `byAnchor` (`07-…`), nested subsections (`08-…`), and a real document read end-to-end (`11-real-task-consumed.md`).
- The model is additive — the validator never depends on it (consumption README) — so typed reads are a reward for validity, not a second parser.

## Toward resolution

The OOM / typed-model surface (milestone L5, `M·oom-consumption`; API in the `D·consumption-oom` ADR). Plan: `provenance/d0014/review-checklist.md`.
