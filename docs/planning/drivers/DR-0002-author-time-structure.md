---
type: driver
schema_version: '1'
id: DR-0002
kind: use-case
product: '[[PR-0001-markdown-contract]]'
status: open/proposed
title: Give authors structural feedback at edit and commit time
created: '2026-06-20'
related: []
tags:
  - validation
  - authoring
  - dx
need_human_review: true
---

# Give authors structural feedback at edit and commit time

## Statement

When a contributor writes a structured document, the mistakes that bite later are structural: a
required section missing or out of order, a duplicated heading, a table missing a column, a checklist
that isn't checkboxes. Caught at edit or commit time, each is a one-line fix; caught downstream, they
corrupt the tooling that assumed the shape. The use-case is fast, precise, source-located findings
while the document is being written.

^summary

## Who/what it affects

Document authors and reviewers, and every downstream tool that reads the document assuming a shape it
was never mechanically held to.

## Evidence

- The validation tier grades exactly these author-time findings against synthetic and real documents:
  missing / duplicate / out-of-order sections (`…/01a-…`, `…/03a-…`, `…/04a-…`), table column and
  min-row rules (`…/10b-…`, `…/10c-…`, `…/10a-…`), checkbox lists (`…/12a-…`, `…/20b-…`), and
  code-fence language (`…/13a-…`). Index: `provenance/d0014/examples/validation/README.md`.
- Every finding carries a source position (the `Finding.pos` work, Phase 2 ADR `D·finding-model`), so
  the feedback points at the offending line rather than the document.

## Toward resolution

The structure and content planes (milestones L2–L3) emit positioned findings; `M·corpus-runner` (L6)
wires them to CI and commit hooks. Plan: `provenance/d0014/review-checklist.md`.
