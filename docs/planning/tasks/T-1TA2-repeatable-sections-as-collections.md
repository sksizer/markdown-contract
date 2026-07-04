---
type: task
schema_version: '5'
id: T-1TA2
status: open/ready
created: '2026-07-04'
related: []
tags: []
need_human_review: false
impact: medium
complexity: medium
readiness_verified_at: '2026-07-04T09:47:11Z'
---
# Repeatable sections: let a heading recur as peers, surfaced as a collection in the model

> AUTO-DEFINED: this spec was best-effort machine-authored by
> /sdlc:task-auto-define on 2026-07-04 from the linked backlog origin story
> ([[B-RSEC-repeatable-sections-as-collections]]). This is a design-heavy feature that
> the backlog says needs a decision record; treat the Approach as a starting shape and
> review the Goal, Today, Files-to-touch, and Acceptance-criteria carefully before
> trusting it.

## Goal

Today a heading that repeats at one level is always an error — an exact repeat emits
`structure/duplicate-section`, case/punct-variant peers emit `structure/key-collision`
(both error-level) — because the out-of-model keys each section by a unique camelCase key
and demands per-level uniqueness. Some documents legitimately want a section to recur as
peers (a per-entry `## Entry`, a per-day `## Schedule`, a changelog's `## Release`). Add a
first-class "repeatable section" construct so declared repeated peers validate and surface
as an array (collection) in the consumption OOM instead of erroring.

## Today

| Location | Role today |
|---|---|
| `packages/core/src/core/structure.ts` | Structure plane; emits `structure/duplicate-section` (exact repeat) and `structure/key-collision` (variant peers) as error-level findings, enforcing per-level heading-key uniqueness. |
| `packages/core/src/core/grammar.ts` | Body-grammar constructors (`sections`/`section`/`optional`/`oneOf`/`gap`); no construct expresses "this heading may recur N times." |
| `packages/core/src/core/model.ts` | The consumption object model; each declared section is a single keyed field, so repeated peers cannot both be represented. |
| `packages/core/src/declarative/schema.ts` | The declarative YAML DSL schema for contracts; has no repeatable-slot shape. |
| `packages/core/src/declarative/infer.ts` | The `init` inferer; on repeated peers it produces a contract that would error rather than a repeatable slot. |

## Proposed

The grammar can declare a section repeatable (e.g. a `repeat`/`min`/`max` option on
`section`, or a dedicated `each:` node). The structure plane matches every occurrence of a
repeatable slot instead of flagging the 2nd+ as an error. The OOM surfaces the matched
occurrences as a typed array (e.g. `doc.body.entries[]`). The declarative DSL expresses the
same, and the inferer emits a repeatable slot when it detects one heading recurring as
direct peers. A decision record captures the OOM/structure contract change.

## Approach

1. Author a decision record under `docs/planning/decisions/` capturing the
   repeatable-section contract: the grammar construct, how occurrences key into the OOM
   (positional array vs. keyed-by-subfield), and the interaction with the existing
   per-level-uniqueness rule ([[D-0003-structure-plane]]) and dual-key access
   ([[D-0005-consumption-oom]]).
2. Extend the body grammar in `grammar.ts` with the repeatable construct plus its
   build-time validation.
3. In `structure.ts`, when a slot is declared repeatable, match all occurrences as valid
   peers instead of emitting `structure/duplicate-section` / `structure/key-collision`;
   keep the error behavior for non-repeatable slots unchanged.
4. Extend the OOM in `model.ts` so a repeatable slot projects to a typed array view,
   leaving single-section slots as today.
5. Extend the declarative DSL (`declarative/schema.ts` and its config parse) to express a
   repeatable slot, and the inferer (`declarative/infer.ts`) to emit one when it sees a
   heading recurring as direct peers (the inverse of the T-KCOL collision guard).
6. Add unit tests at each plane (structure, model, declarative infer) with a fixture
   document that repeats a heading as peers.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `docs/planning/decisions/` | new | New decision record (id minted at creation) for the repeatable-section OOM/structure contract. |
| `packages/core/src/core/grammar.ts` | modify | Add the repeatable-section construct (`repeat`/`min`/`max` or `each:`) plus build-time validation. |
| `packages/core/src/core/structure.ts` | modify | Match all occurrences of a repeatable slot as valid peers; keep duplicate/collision errors for non-repeatable slots. |
| `packages/core/src/core/model.ts` | modify | Project a repeatable slot to a typed array view in the OOM. |
| `packages/core/src/declarative/schema.ts` | modify | Express a repeatable slot in the declarative DSL. |
| `packages/core/src/declarative/infer.ts` | modify | Emit a repeatable slot when a heading recurs as direct peers, instead of an erroring contract. |

## Acceptance criteria

- [ ] AC-1: A document that repeats a declared-repeatable heading as peers validates with no `structure/duplicate-section` or `structure/key-collision` finding.
- [ ] AC-2: For the fixture that repeats a heading N times as peers, the consumption OOM exposes that slot as an array of length N, positionally indexable (`doc.body.<slot>[0]`, `[1]`, …) and typed by the slot's inner shape.
- [ ] AC-3: A repeated heading that is NOT declared repeatable still emits the existing error-level finding (no regression to the per-level-uniqueness rule).
- [ ] AC-4: The declarative DSL accepts a repeatable-slot declaration, and the inferer emits a repeatable slot (not an erroring contract) for a fixture document containing a heading repeated as peers.
- [ ] AC-5: A decision record for the contract change is committed under `docs/planning/decisions/`.

## Out of scope

- Nested/recursive repeatable structures beyond a single repeatable slot per level — deeper nesting can follow once the single-level shape lands.
- Changing the default behavior for undeclared repeated headings — they remain errors.
- Migrating existing corpus documents onto repeatable slots.

## Dependencies

- none — the governing decision record is authored within this task (Approach step 1); it changes the contracts described in [[D-0003-structure-plane]] and [[D-0005-consumption-oom]].

## Discovery context

Promoted from [[B-RSEC-repeatable-sections-as-collections]]. Surfaced by T-KCOL (init
heading key-collision handling) as the inverse of the collision it guards against:
T-KCOL keeps the per-level-uniqueness rule and stops the inferer emitting a contract
that violates it; this task is the larger feature that makes repeated peers a
first-class, validated shape.
