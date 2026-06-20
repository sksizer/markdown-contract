---
type: driver
schema_version: '1'
id: DR-0001
kind: use-case
product: '[[PR-0001-markdown-contract]]'
status: open/proposed
title: Validate a living SDLC planning corpus as code
created: '2026-06-20'
related: []
tags:
  - sdlc
  - corpus
  - dogfood
need_human_review: true
---

# Validate a living SDLC planning corpus as code

## Statement

A planning corpus — decisions, tasks, milestones, drivers — is markdown with real structural rules:
required sections in order, typed frontmatter, typed tables, cross-references that must resolve. Today
those rules are enforced by hand-written per-type validators, one corpus at a time; the moment a
second corpus wants the same guarantees it re-implements them. The use-case is to declare each
document type's structure once, as a contract, and validate the whole corpus — frontmatter, section
grammar, and content — from a single engine.

^summary

## Who/what it affects

Maintainers of any markdown + frontmatter knowledge base (the SDLC planning corpus is the first), and
the integrity of that corpus — malformed entities, missing sections, broken cross-links — whenever no
machine checks structure.

## Evidence

- The real-corpus example contracts validate live SDLC entities end-to-end:
  `provenance/d0014/examples/validation/19-real-decision-contract-end-to-end.md` (Decision),
  `…/20-real-task-contract-end-to-end.md` (Task), and `…/21-real-milestone-or-skill-doctype.md`
  (Milestone) — three distinct entity types, one engine.
- This project self-hosts SDLC: `docs/planning/` is the corpus the library is built to validate, so
  the use-case is dogfooded, not hypothetical.
- The originating repo already validates its corpus with per-type Zod schemas (the ajv → Zod
  migration), proving the demand — but per-corpus and non-reusable.

## Toward resolution

The milestone ladder, culminating in `M·corpus-runner` (L6) — a dir → contract config that validates
a whole tree end-to-end — closes this driver. See the plan in
`provenance/d0014/review-checklist.md` and the API record (the Phase 2 ADRs).
