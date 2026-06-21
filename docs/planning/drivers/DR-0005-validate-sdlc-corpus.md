---
type: driver
schema_version: '1'
id: DR-0005
kind: use-case
product: '[[PR-0001-markdown-contract]]'
status: open/proposed
title: Validate a living SDLC planning corpus as code
created: '2026-06-20'
related:
  - '[[DR-0001-general-markdown-validation]]'
tags:
  - sdlc
  - dogfood
  - corpus
need_human_review: true
---

# Validate a living SDLC planning corpus as code

## Statement

The general drivers need a hard, living proof. An SDLC planning corpus — decisions, tasks, milestones, drivers — is exactly that: markdown + frontmatter entities with required sections in order, typed tables, conditional fields, and a cross-reference graph that must resolve. The use-case is to validate that whole corpus, end to end, from the same engine the general drivers describe — the flagship dogfood that keeps the library honest against real structure rather than synthetic fixtures.

^summary

## Who/what it affects

This project's own planning integrity (it self-hosts SDLC — `docs/planning/` is the corpus the library validates), and every prospective adopter weighing the general drivers, for whom this is the worked, real-world proof.

## Evidence

- The real-corpus example contracts validate live SDLC entities end to end: `provenance/d0014/examples/validation/19-real-decision-contract-end-to-end.md` (Decision), `…/20-real-task-contract-end-to-end.md` (Task), `…/21-real-milestone-or-skill-doctype.md` (Milestone) — three distinct entity types, one engine.
- This project self-hosts SDLC, so the use-case is dogfooded, not hypothetical; the originating repo already validates its corpus with per-type Zod schemas (the ajv → Zod migration), proving the demand — but per-corpus and non-reusable.

## Toward resolution

Closes when the corpus runner (`M·corpus-runner`, L6) validates `docs/planning/` end to end in CI, exercising [[DR-0001-general-markdown-validation]] against a real corpus. Plan: `provenance/d0014/review-checklist.md`.
