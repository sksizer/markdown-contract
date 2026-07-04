---
type: backlog
schema_version: '1'
id: B-L7EN
tags:
- declarative
- text-match
last_reviewed: '2026-07-04'
---

# Deferred M-0004 text-constraint follow-ups: when/require predicate DSL, anyOf disjunction, $ref escape hatch, link/inline constraints, repair/autofix

Intentionally deferred at M-0004 ([[M-0004-declarative-text-constraints]]) close, per [[D-0011-declarative-text-constraints]] § Out of scope — captured as one entry so the deferrals stay discoverable:

- The general `when` / `require` **predicate DSL** (boolean composition, cross-field conditions).
- **Disjunction across entries** — a first-class `anyOf` / OR group; v1 expresses OR only through a single `regex` entry's alternation.
- The **`$ref` code escape hatch** (bind a code-authored predicate from YAML).
- **Link / wikilink / inline-element constraints**.
- **Document repair / autofix**.

Not included here: migrating the SDLC plugin's `invariants.yaml` onto contracts — that is the consumer's work, tracked by [[DR-0005-validate-sdlc-corpus]].
