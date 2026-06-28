---
type: task
schema_version: '5'
id: T-TXYL
status: planning/draft
created: '2026-06-28'
related:
- '[[M-0004-declarative-text-constraints]]'
- '[[D-0011-declarative-text-constraints]]'
- '[[C-0009-declarative-text-constraints]]'
- '[[D-0008-declarative-contract-dsl]]'
depends_on:
- '[[T-TXAP-text-predicate-builders]]'
tags:
- text-match
- declarative
- yaml
need_human_review: true
impact: high
complexity: medium
autonomy: supervised
---
# Declarative front-end — `requires` / `forbids` in YAML

## Goal

Make the text constraints authorable as data: recognize `requires:` / `forbids:` on section nodes and the body root of a `*.contract.yaml`, validate each entry against the closed match-spec vocabulary, compile to the TS-API builders ([[T-TXAP-text-predicate-builders]]), and reject the authoring mistakes D-0011 specifies at compile time. This is the surface (A) the decision fixed, and the 1:1 migration target for the SDLC plugin's `invariants.yaml`.

## Today

The declarative loader compiles three planes from YAML but has no recognition of text constraints; `requires` / `forbids` keys would be unknown.

| Location | Role today |
|---|---|
| `src/declarative/body.ts#compileNode` | Compiles a section node (`section` / `oneOf` / `gap` / `optional` / `anchor` / `children` / content leaf) |
| `src/declarative/body.ts#compileBody` | Compiles the body root (`order` / `allowUnknown` / `sections`) |
| `src/declarative/schema.ts#compileSchema` | The closed-vocabulary compiler the match-spec validator mirrors |
| `src/declarative/errors.ts#DeclarativeError` | The error a malformed entry raises |
| `src/core/text-constraints.ts` | The builders this compiles onto (from [[T-TXAP-text-predicate-builders]]) |

## Proposed

A match-spec compiler (`src/declarative/text.ts`, sibling to `schema.ts`) validates a `requires` / `forbids` list against the closed vocabulary (`pattern` | `regex`, `normalize`, `ignoreCase`, `min`, `max`, `id`, `note`, `level`) and compiles it to `requires(...)` / `forbids(...)` / `textRule(...)`. `compileNode` recognizes the two keys on a section node (→ node-local rule over the subtree); `compileBody` recognizes them on the body root (→ `docRule` over the document). The compiler enforces compile-time consistency: duplicate entries (identical normalized spec in one list at one scope) and literal `requires` / `forbids` contradictions at the same scope (and `max < min`) are `DeclarativeError`s. Contradiction detection is literal-only — byte-identical `regex` sources count as duplicates, but no cross-regex overlap analysis is attempted.

## Approach

1. Add `src/declarative/text.ts`: a `compileMatchSpecs(raw, kind, path)` that validates the closed vocabulary (rejecting unknown keys, missing `pattern`/`regex`, etc.) and returns the spec list, plus the duplicate / contradiction / `max < min` checks raising `DeclarativeError`.
2. Wire `compileNode` (`src/declarative/body.ts`) to read `requires` / `forbids` on a section and attach the compiled `requires(...)` / `forbids(...)` rules to that node.
3. Wire `compileBody` to read `requires` / `forbids` on the body root and attach a compiled `textRule(...)` `docRule` to the contract.
4. Peer unit test `src/declarative/text.test.ts`: lead with a minimal `requires` / `forbids` YAML compiling to the right findings, then the vocabulary-rejection, duplicate, and contradiction cases.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/declarative/text.ts` | new | Closed match-spec vocabulary compiler + compile-time consistency checks |
| `src/declarative/text.test.ts` | new | Peer unit test — minimal compile first, then rejections |
| `src/declarative/body.ts` | modify | Recognize `requires` / `forbids` on a section node and on the body root |
| `src/declarative/index.ts` | modify | Export any new declarative type if the public surface needs it |
| `tests/fixtures/validation/` | modify | Add the `.contract.yaml` parity peers for the T-TXSC text fixtures |
| `tests/components.ts` | modify | Flip `IMPLEMENTED["text-yaml"]` → `true` |

## Acceptance criteria

- [ ] AC-1: `requires:` / `forbids:` on a section node compile to a node-local rule over that section's subtree; the same keys on the body root compile to a document-scoped `docRule`.
- [ ] AC-2: Each entry is validated against the closed vocabulary (`pattern` | `regex`, `normalize`, `ignoreCase`, `min`, `max`, `id`, `note`, `level`); an unknown key or a missing `pattern`/`regex` is a `DeclarativeError`.
- [ ] AC-3: Two entries with an identical normalized spec in one list at one scope are rejected as a duplicate `DeclarativeError`.
- [ ] AC-4: A `requires` and a `forbids` entry over the same literal `pattern` at the same scope (or a single entry with `max < min`) is rejected as a contradiction; `regex`-vs-`regex` overlap is not analyzed.
- [ ] AC-5: The findings produced by a YAML `requires` / `forbids` are identical (id, level, position, message) to the equivalent TS builder from [[T-TXAP-text-predicate-builders]].
- [ ] AC-6: `src/declarative/text.test.ts` is green and reads first as a worked example of authoring a constraint.
- [ ] AC-7: The `.contract.yaml` parity peers for the T-TXSC text fixtures are added and `IMPLEMENTED["text-yaml"]` is flipped to `true`; `tests/yaml-parity.test.ts` asserts the YAML and TS forms emit identical `text/*` findings.

## Out of scope

- The matcher, finding area, and TS builders — [[T-TXMC-text-match-core]] and [[T-TXAP-text-predicate-builders]].
- A first-class `anyOf` / OR group entry — deferred (D-0011 § Out of scope); v1 OR is a single `regex` entry's alternation.
- Authoring the gated fixtures up front — [[T-TXSC-text-constraint-fixture-scaffold]]; the live dogfood contract and the final census-clean closeout — [[T-TXFX-text-constraint-fixtures]].
- Migrating the SDLC plugin's `invariants.yaml` — the consumer's work, not this repo's.

## Dependencies

- Hard: needs the TS builders from `[[T-TXAP-text-predicate-builders]]` (which needs `[[T-TXMC-text-match-core]]`).
