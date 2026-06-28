---
type: capability
schema_version: '1'
id: C-0009
kind: feature
title: Declarative text constraints
status: open/planned
created: '2026-06-28'
parent_key: null
contains: []
related:
  - '[[D-0011-declarative-text-constraints]]'
  - '[[C-0006-declarative-yaml-contracts]]'
  - '[[C-0005-two-plane-contract-engine]]'
  - '[[C-0001-contract-validation]]'
  - '[[D-0004-content-plane]]'
  - '[[D-0008-declarative-contract-dsl]]'
tags:
  - yaml
  - declarative
  - rules
  - text-match
  - authoring
need_human_review: true
---

# Declarative text constraints

## Summary

- Author **required / forbidden phrase checks** as plain YAML — `requires:` / `forbids:` lists on any section node (scoped to that section's subtree) or on the body root (the whole document) — with no TypeScript. ^summary
- Each entry asserts a literal or regex is **present** or **absent**, with an optional occurrence count and an author note; it compiles to the engine's existing `rule` / `docRule` machinery, so findings and the typed model are identical to a hand-written predicate.
- v1 scope is **text presence / absence with a count** — a closed vocabulary, not a general predicate language. Realizes [[D-0011-declarative-text-constraints]]; extends the authoring surface of [[C-0006-declarative-yaml-contracts]].

## Statement

A consumer adds `requires` / `forbids` to a section node or the body root of a declarative contract, and the loader compiles each entry into a node-local `rule` (section-scoped) or a whole-document `docRule` (body-root) over the bound scope's text ([[C-0005-two-plane-contract-engine]]). The check is "does this literal-or-regex appear, or not, the right number of times", scoped either to a section's subtree or the whole document. The engine is unchanged; this is a declarative front-end over the rule machinery it already runs, the same way [[C-0006-declarative-yaml-contracts]] is a front-end over the structure and content planes. It is closed and finite by design — the general `when` / `require` predicate DSL and the `$ref` code escape hatch stay deferred ([[D-0008-declarative-contract-dsl]]).

## What it provides

- Two new optional keys — `requires` / `forbids` — on every section node and on the body root, recognized by the declarative loader.
- A closed per-entry **match-spec vocabulary**: `pattern` | `regex`, `normalize`, `ignoreCase`, `min` / `max`, `id`, `note`, `level`.
- **TS-API parity** — a predicate builder so a combinator-authored contract gets the same checks without hand-writing the rule.
- `text/*` findings (default `error`, overridable per entry via `level`), positioned at the section heading (a `requires` miss) or the offending line (a `forbids` hit).

## Inputs

- A section node or the body root of a `*.contract.yaml`, carrying `requires` / `forbids`. Both are **lists** — multiple constraints are multiple list items, each an independent check.

```yaml
body:
  # document scope (body root): each list item is one whole-document check
  forbids:
    - pattern: "}scripts/"          # must appear nowhere in the document
      normalize: false              # exact bytes
    - pattern: "}validators/"       # a second, independent entry
      normalize: false
  requires:
    - pattern: "sdlc task close-commit"

  sections:
    - section: Output contract
      # section scope: each list item is one check over this section's subtree
      requires:
        - pattern: "DONE pr="       # must appear in this section's subtree
          note: "primary success signal"
        - pattern: "ALREADY-CLOSED"
        - regex: "LEASE-(CONFLICT|MISSING) ref="   # one regex entry = OR of two markers
      forbids:
        - pattern: "WARNING"        # absence is its own key — never max:0 inside requires
    - section: Notes
```

**Authoring multiple entries.** `requires` / `forbids` are lists, so N phrases is N items, each emitting its own finding (at the section heading for a `requires` miss, the offending line for a `forbids` hit). A list is **conjunctive** — every entry must hold; for "any one of" use a single `regex` entry's alternation (`regex: "X|Y"`), the OR escape until a first-class `anyOf` group lands. The two keys stay **pure** — `requires` is presence, `forbids` is absence — so a `requires` entry may not express absence via `max: 0` (that is a `forbids`; the compiler rejects it, along with duplicate and contradictory entries). The same keys work on a **section node** (matches that section's subtree) and on the **body root** (matches the whole document). Per entry: `pattern` (literal) or `regex`; `min` / `max` for the occurrence count (`requires` defaults `min: 1`); plus `normalize` / `ignoreCase` / `note`, and an optional `id`. Each entry's finding carries its own stable id — synthesized from scope + pattern unless `id` is set — so individual requirements stay addressable downstream (SARIF `ruleId`, suppression). This is a 1:1 map from the `invariants.yaml` lists it replaces.

## Outputs

- The same `Finding[]` the engine emits for a hand-written `rule` / `docRule` — `text/requires`, `text/forbids`, `text/count` — merged and sorted into the standard finding stream, rendered by the CLI's `--format human|json|sarif` unchanged. YAML authorship is invisible downstream.

## Hook points

- The match-spec vocabulary is a **closed, versioned surface** (like the schema vocabulary and the leaf set); each new key is a deliberate additive change within `mcVersion: 1` ([[D-0008-declarative-contract-dsl]] § Versioning).
- The general predicate DSL and the `$ref` code escape hatch remain the deferred extension surface for anything beyond text presence / absence.

## Underlying implementation

- A `requires` / `forbids` compiler in `src/declarative/body.ts`, validating each entry against the closed vocabulary and emitting library-built `rule` / `docRule` specs; the predicate matches the bound scope's rendered text (including code spans and fenced blocks). The engine ([[C-0005-two-plane-contract-engine]]) is untouched and imports stay one-way.
- Not yet built. The surface is fixed by [[D-0011-declarative-text-constraints]] to **(A) — `requires` / `forbids` node attributes** (over a `text` content leaf or a general rule).

## Notes

- Driven by the SDLC plugin's need to retire its `invariants.yaml` SKILL.md prose linter onto contracts ([[DR-0005-validate-sdlc-corpus]]); that linter is entirely required / forbidden-phrase, required-section, and required-tool-ref checks.
- The package already does this via hand-written rules — fixture `17-node-level-custom-rule.ts` is exactly a "section must mention X" check; this capability makes that authorable as data.
