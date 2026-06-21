---
type: driver
schema_version: '1'
id: DR-0001
kind: use-case
product: '[[PR-0001-markdown-contract]]'
status: open/proposed
title: Validate any structured-markdown corpus as code
created: '2026-06-20'
related: []
tags:
  - validation
  - library
  - structure
need_human_review: true
---

# Validate any structured-markdown corpus as code

## Statement

Teams keep growing bodies of structured markdown — docs sites, ADR collections, knowledge bases, planning corpora — each with real rules: required sections in order, typed frontmatter, typed tables, references that must resolve. Those rules are enforced, if at all, by bespoke per-project scripts that don't transfer. The use-case is a library that lets you declare each document type's structure once, as a contract, and validate any corpus — frontmatter, section grammar, and content — from one engine, with precise, source-located findings.

^summary

## Who/what it affects

Maintainers of any structured-markdown corpus, and the integrity of that corpus — malformed entries, missing sections, broken cross-links — whenever no machine checks structure.

## Evidence

- The validation tier grades the full range of structural and content findings against synthetic and real documents: missing / duplicate / out-of-order sections, typed tables, checkbox lists, code-fence language, and frontmatter enums. Index: `provenance/d0014/examples/validation/README.md` (cases 01–13, plus the real-corpus 19–21).
- Every finding carries a source position (the `Finding.pos` work, the `D·finding-model` ADR), so the feedback points at the offending line, not the document.

## Toward resolution

The structure and content planes (milestones L2–L3) emit positioned findings behind the library's `validate()` surface. Plan: `provenance/d0014/review-checklist.md`.
