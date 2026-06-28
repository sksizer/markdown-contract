---
type: task
schema_version: '5'
id: T-TXMC
status: open/ready
created: '2026-06-28'
related:
- '[[M-0004-declarative-text-constraints]]'
- '[[D-0011-declarative-text-constraints]]'
- '[[C-0009-declarative-text-constraints]]'
- '[[D-0001-finding-model]]'
tags:
- text-match
- findings
- engine
need_human_review: true
impact: high
complexity: medium
autonomy: supervised
---
# Text-match predicate core + the `text/*` finding area

## Goal

Build the runtime foundation every declarative text constraint emits through: a pure text matcher over a bound scope's rendered text, the `text/*` finding area registered in the finding model with its own sort plane, and a stable per-entry finding-id synthesis scheme. This is the piece [[T-TXAP-text-predicate-builders]] wraps into `rule` / `docRule` and the declarative loader ([[T-TXYL-declarative-requires-forbids]]) compiles onto. No declarative or combinator surface yet — just the matcher and the finding plumbing.

## Today

The engine has four finding planes and no notion of a text constraint.

| Location | Role today |
|---|---|
| `src/core/validate.ts#PLANE_ORDER` | The four planes (`frontmatter` / `structure` / `content` / `rule`); any unknown id prefix sorts as `rule` |
| `src/core/registry.ts#defaultRegistry` | The id → default-`FindingLevel` registry, seeded with structure / content / rule defaults |
| `src/core/types.ts` | `Finding`, `Rule`, `DocRule`, `Ctx` (the `finding(...)` factory) |
| `tests/fixtures/validation/17-node-level-custom-rule.ts` | The hand-written shape this work generalizes (a section must mention a token) |

## Proposed

A pure matcher (`src/core/text-match.ts`) takes a scope's rendered text plus one match spec — `{ pattern | regex, normalize, ignoreCase, min, max }` — and returns the occurrence count and the source position of each hit, matching against text **including inline code spans and fenced blocks** (per D-0011). A finding-builder turns a spec + scope into `text/requires` / `text/forbids` / `text/count` findings positioned per D-0011 (a `requires` miss at the scope's heading / document level; a `forbids` hit at the offending line). The `text` plane is registered in `PLANE_ORDER` and the `text/*` defaults (`error`) seeded in `defaultRegistry`. A stable id-synthesis helper produces `text/<kind>/<scopeKey>/<patternHash>` and honors an explicit override.

## Approach

1. Add `src/core/text-match.ts`: a `matchText(text, spec)` returning `{ count, positions }`, with `normalize` (collapse whitespace runs) and `ignoreCase` handling, and literal vs `regex` matching. Match raw text including code.
2. Add a finding-builder that maps a match result + the `min` / `max` bound to `text/requires` / `text/forbids` / `text/count` findings with the D-0011 positions and messages (`note` appended).
3. Add `synthesizeTextId(kind, scopeKey, spec)` → `text/<kind>/<scopeKey>/<patternHash>` (short hash of the normalized pattern), returning the entry's explicit `id` when set.
4. Register the `text` plane: add `"text"` to `PLANE_ORDER` in `src/core/validate.ts` (sort position per D-0011 open question — default after `content`), and seed `text/*` defaults in `src/core/registry.ts`.
5. Peer unit test `src/core/text-match.test.ts`: lead with plain input→output cases (a present literal, an absent literal, a count, a regex, normalize on/off), then edges.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/core/text-match.ts` | new | The pure matcher + finding-builder + id-synthesis helper |
| `src/core/text-match.test.ts` | new | Peer unit test — input→output cases first, then edges |
| `src/core/validate.ts` | modify | Add `"text"` to `PLANE_ORDER` so `text/*` sorts into its own plane |
| `src/core/registry.ts` | modify | Seed `text/requires` / `text/forbids` / `text/count` default levels |
| `src/core/index.ts` | modify | Re-export the new module from the core barrel |

## Acceptance criteria

- [ ] AC-1: `matchText(text, spec)` returns the occurrence count and each hit's source position for a literal `pattern` and a `regex`, matching text that includes inline code spans and fenced blocks.
- [ ] AC-2: `normalize` (default true) collapses whitespace runs so a phrase split across a wrapped line still matches; `normalize: false` matches exact bytes; `ignoreCase` folds case.
- [ ] AC-3: The finding-builder emits `text/requires` (miss → heading/document position), `text/forbids` (hit → offending line), and `text/count` (`found N times, expected …`), each with the `note` appended.
- [ ] AC-4: `text/*` findings sort into a dedicated `text` plane (not lumped into `rule`), and carry a default `error` level from the registry, overridable per finding.
- [ ] AC-5: `synthesizeTextId` returns `text/<kind>/<scopeKey>/<patternHash>` — stable across entry reordering (not index-based) — and returns the explicit `id` when the spec sets one.
- [ ] AC-6: `src/core/text-match.test.ts` documents the contract with plain input→output cases first; the suite is green.

## Out of scope

- The gated fixture corpus and the `text-*` enable gates — authored up front by [[T-TXSC-text-constraint-fixture-scaffold]]; this task's own verification is its peer unit test (a validate-level fixture needs the builders to exist, so the matcher has no gated corpus fixture of its own).
- The combinator builders (`requires` / `forbids` / `textRule`) and scope binding — [[T-TXAP-text-predicate-builders]].
- Any YAML / declarative recognition — [[T-TXYL-declarative-requires-forbids]].
- Duplicate / contradiction rejection (a compile-time concern of the declarative loader) — [[T-TXYL-declarative-requires-forbids]].
- Choosing the final id discriminator form (hash vs slug) and SARIF `partialFingerprints` — left as a D-0011 open question; ship the hash form.

## Dependencies

- None new — builds directly on the existing finding model ([[D-0001-finding-model]]) and engine. It is the foundation [[T-TXAP-text-predicate-builders]] depends on.
