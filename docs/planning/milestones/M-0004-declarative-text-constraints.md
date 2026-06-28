---
type: milestone
schema_version: '1'
id: M-0004
status: open/planned
title: Declarative text constraints — requires / forbids
created: '2026-06-28'
related:
  - '[[D-0011-declarative-text-constraints]]'
  - '[[C-0009-declarative-text-constraints]]'
  - '[[D-0008-declarative-contract-dsl]]'
  - '[[C-0006-declarative-yaml-contracts]]'
  - '[[C-0005-two-plane-contract-engine]]'
  - '[[D-0001-finding-model]]'
  - '[[DR-0005-validate-sdlc-corpus]]'
  - '[[M-0002-declarative-yaml-contracts-v1]]'
contains:
  - '[[T-TXSC-text-constraint-fixture-scaffold]]'
  - '[[T-TXMC-text-match-core]]'
  - '[[T-TXAP-text-predicate-builders]]'
  - '[[T-TXYL-declarative-requires-forbids]]'
  - '[[T-TXFX-text-constraint-fixtures]]'
tags:
  - yaml
  - declarative
  - text-match
  - rules
  - milestone
need_human_review: true
---

# Declarative text constraints — requires / forbids

## Summary

- Ship the declarative text-match vocabulary decided in [[D-0011-declarative-text-constraints]] and realized as [[C-0009-declarative-text-constraints]]: `requires:` / `forbids:` lists on any **section node** (scoped to that section's subtree) and on the **body root** (scoped to the whole document), each entry asserting a literal or regex is present/absent the right number of times. It compiles to the engine's existing `rule` / `docRule` machinery ([[C-0005-two-plane-contract-engine]]) — a declarative front-end, not a second engine — and is additive within `mcVersion: 1`.
- Surface is fixed to **(A)** by D-0011: `requires` / `forbids` as node attributes (over a `text` content leaf or a general rule). This milestone is the first additive extension to [[M-0002-declarative-yaml-contracts-v1]].

^summary

## Outcome

A contract author can write required / forbidden phrase checks entirely in YAML — `requires:` / `forbids:` on a section or the document — and get `text/*` findings and a typed model identical to a hand-written `rule` / `docRule`. The same checks are available to combinator authors through a TS predicate builder. The feature lands over the existing engine and declarative loader with no engine change, proven by a fixture corpus that shows YAML-authored text constraints behave exactly like their TS-authored equivalents, and dogfooded by at least one in-repo `*.contract.yaml`.

## Scope

**In**

- A **text-match predicate core** over a bound scope's rendered text (including inline code spans and fenced blocks): literal `pattern` / `regex`, `normalize` / `ignoreCase`, occurrence-count bounds (`min` / `max`).
- The **`text/*` finding area** (`text/requires`, `text/forbids`, `text/count`) registered in the finding model with a default `error` level and its own plane in the merged/sorted finding stream, plus **stable per-entry finding-id synthesis** (`text/<kind>/<scopeKey>/<patternHash>`, author-overridable via `id`).
- The **TS-API predicate builders** (`requires` / `forbids` / `textRule`) in `src/core` that bind a list of match specs to a section scope (node-local `rule`) or document scope (`docRule`).
- The **declarative front-end**: `requires` / `forbids` recognition on section nodes and the body root in `src/declarative/body.ts`, validated against the closed match-spec vocabulary and compiled to the TS-API builders.
- **Compile-time consistency**: duplicate entries and literal `requires` / `forbids` contradictions (and `max < min`) raise a `DeclarativeError`; contradiction detection is literal-only.
- A **fixture corpus + peer unit tests** proving YAML/TS parity, and a dogfooded `*.contract.yaml`.

**Out** (per [[D-0011-declarative-text-constraints]] § Out of scope)

- The general `when` / `require` **predicate DSL** (boolean composition, cross-field conditions) — still deferred.
- **Disjunction across entries** (a first-class `anyOf` / OR group) — deferred; v1 expresses OR-of-literals through a single `regex` entry's alternation.
- The **`$ref` code escape hatch**; **document repair / autofix**; **link / wikilink / inline-element** constraints.
- Migrating the SDLC plugin's `invariants.yaml` onto contracts — that is the consumer's work ([[DR-0005-validate-sdlc-corpus]]), unblocked by this milestone but not part of it.

## Workstreams

Decomposed into the task set below (minted as `T-*` docs). Fixtures come **first**, gated off and greened slice-by-slice as each component lands — the T-9XB3 / `infer-*` pattern — so every implementation task has a target to green:

1. **Fixture scaffold + `text-*` enable gates** ([[T-TXSC-text-constraint-fixture-scaffold]]). Author the gated text-constraint fixtures up front (skipped-green via `IMPLEMENTED["text-api"]` / `["text-yaml"]`) plus a stub of the public builders so they type-check.
2. **Text-match predicate core + `text/*` finding area** ([[T-TXMC-text-match-core]]). The pure matcher and the finding area / plane / id-synthesis scheme everything else emits through (peer-unit-tested).
3. **TS-API predicate builders** ([[T-TXAP-text-predicate-builders]]). `requires` / `forbids` / `textRule` over the core, binding specs to section / document scope, enforcing requires-vs-forbids purity and per-entry id default/override; flips `text-api` to green the TS fixtures.
4. **Declarative front-end** ([[T-TXYL-declarative-requires-forbids]]). Recognize `requires` / `forbids` on section nodes and the body root, validate the closed vocabulary, compile to the builders, enforce compile-time consistency; adds the `.contract.yaml` parity peers and flips `text-yaml`.
5. **Dogfood + closeout** ([[T-TXFX-text-constraint-fixtures]]). Exercise the vocabulary on a live in-repo contract and confirm zero `text-*` fixtures remain skipped.

## Success criteria

- [ ] A section-scoped `requires` / `forbids` block compiles to a node-local `rule` and a body-root block to a `docRule`, producing `text/*` findings identical to the equivalent hand-written predicate.
- [ ] The closed match-spec vocabulary (`pattern` / `regex` / `normalize` / `ignoreCase` / `min` / `max` / `id` / `note` / `level`) is validated; a malformed entry is a `DeclarativeError`.
- [ ] A `requires` miss positions at the section heading (section scope) or document-level (body root); a `forbids` hit positions at the offending line; counts report `found N times, expected …`.
- [ ] Each entry's finding carries its own stable id — synthesized from scope + pattern, overridable via `id` — so individual requirements are addressable as distinct SARIF `ruleId`s.
- [ ] Duplicate entries and literal `requires` / `forbids` contradictions (and `max < min`) are rejected at compile time.
- [ ] `requires` is presence and `forbids` is absence: a `requires` entry with `max: 0` (or `max < min`) is rejected.
- [ ] A `*.contract.yaml` with `requires` / `forbids` yields the same findings as its TS-authored equivalent on a shared fixture, and at least one in-repo contract dogfoods the feature.
- [ ] The text-constraint fixtures are authored up front and gated (`text-api` / `text-yaml` in `IMPLEMENTED`), greening slice-by-slice as each component lands, with zero left skipped at milestone close.
- [ ] The engine (`src/core` validate/structure/content) needs no change beyond the new `text/*` plane registration; imports stay one-way.

## Dependencies

- The declarative loader and engine this compiles to — [[D-0008-declarative-contract-dsl]] (now accepted and adopted) and [[C-0005-two-plane-contract-engine]] — landed via [[M-0002-declarative-yaml-contracts-v1]] and [[M-0001-initial-contract-engine-and-cli]].

## References

- [[D-0011-declarative-text-constraints]] — the decision (surface fixed to A; multi-entry semantics, finding identity, compile-time consistency, requires/forbids purity).
- [[C-0009-declarative-text-constraints]] — the capability this milestone delivers.
- [[D-0008-declarative-contract-dsl]] — the declarative format this additively extends.
- [[C-0005-two-plane-contract-engine]] — the runtime `rule` / `docRule` machinery the feature compiles to.
- [[D-0001-finding-model]] — the findings a compiled text constraint emits.
- [[DR-0005-validate-sdlc-corpus]] — the concrete driver this unblocks.
- Fixture `tests/fixtures/validation/17-node-level-custom-rule.ts` — the hand-written shape this promotes to a declarative attribute.
