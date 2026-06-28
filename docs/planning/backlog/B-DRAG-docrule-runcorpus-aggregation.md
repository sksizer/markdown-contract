---
type: backlog
schema_version: '1'
id: B-DRAG
last_reviewed: '2026-06-28'
tags:
- test
- runner
- docrule
- corpus
---
# Aggregate docRule findings through runCorpus into exitCode (multi-rule, mixed levels)

Every existing corpus test uses **rule-less** contracts; `docRule` is only exercised through
single-document `validate()` (fixture 16). Untested: a contract carrying `docRule`(s) routed
through `runCorpus` so cross-document findings aggregate into the run's `findings` /
`exitCode`, including **multiple** `docRule`s in one contract and a **warn-level** `docRule`
that must NOT bump the exit code to 1.

Surfaced by catalog examples `REAL-WORLD-SCHEMAS-12` (dangling `depends_on`) and
`REAL-WORLD-SCHEMAS-13` (membership / supersession graph) in
[[M-0008-example-use-case-catalog]]. Priority: medium.
