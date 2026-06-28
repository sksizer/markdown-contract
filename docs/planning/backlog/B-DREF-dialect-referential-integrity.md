---
type: backlog
schema_version: '1'
id: B-DREF
last_reviewed: '2026-06-28'
tags:
- test
- dialect
- docrule
- wikilinks
---
# Dialect referential-integrity docRules: dead in-doc anchors and dangling vault wikilinks

Two novel, currently-uncovered compositions the engine *allows* but no fixture exercises:

1. A `docRule` pairing `extractVaultRefs` with `byAnchor` to flag a `#^anchor` fragment that
   resolves nowhere **in the same document** (in-doc dead-anchor referential integrity).
2. A **cross-document** `docRule` over a vault (via `runCorpus`) checking that each wikilink
   target exists, emitting a `warn`-level finding when it doesn't.

Surfaced by catalog examples `DIALECT-10` (flag a dead anchor with a docRule) and
`DIALECT-11` (validate every wikilink across a vault) in
[[M-0004-example-use-case-catalog]]. Priority: medium. Open question (see the milestone):
whether vault-wide wikilink validation should become a first-class supported feature rather
than only a documented composition.
