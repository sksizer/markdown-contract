---
type: task
schema_version: '5'
id: T-SCPA
status: planning/proposed
created: '2026-06-30'
related:
- '[[M-0011-structured-cells]]'
- '[[D-0015-structured-cells]]'
- '[[D-0005-consumption-oom]]'
depends_on: []
tags:
- structured-cells
- paragraph
- decision-record
- design
need_human_review: true
impact: low
complexity: small
autonomy: human-only
last_reviewed: '2026-06-30'
---
# Decide the paragraph-transform generalization (design-only ADR + scoped follow-ons)

## Goal

Capture the paragraph generalization that [[D-0015-structured-cells]] lists as out of scope, as its own **decision record** — because, unlike tables and lists, it is **not** "keep an output that already exists." A paragraph leaf carries no Zod content schema today (only `maxWords`), so there is no discarded `safeParse` output to retain; generalizing requires introducing a schema-bearing paragraph leaf and deciding what a transformed paragraph value even is and how the model exposes it. This task produces the ADR and the scoped follow-on tasks; it ships **no source change**.

## Today

| Location | Role today |
|---|---|
| `src/core/leaves.ts#maxWords` | The only paragraph combinator — `maxWords(n)` produces a `paragraph` leaf with a placeholder schema and `{ maxWords: n }` config; no user Zod schema over the text. |
| `src/core/content.ts#validateParagraph` | Validates a paragraph by **word count only** — it never `safeParse`s the paragraph text against a user schema, so there is no transform output to keep. |
| `src/core/model.ts#paragraphView` | Returns `{ kind, text, pos }` — the raw paragraph text, always a string; no typed value path. |
| `provenance/d0015/` | The structured-cells decision; its "Out of scope" and `proposed-shape.md` §7 name the paragraph generalization as a separate, undecided question. |

## Proposed

Author a new decision record under `provenance/` (the next free `D-00NN`; `provenance/d0017/` proposed) following the `provenance/d0015/` format (README decision record + `proposed-shape.md` companion). It resolves the open design questions and lands a recommendation (ship / defer / reject), plus scoped follow-on task stubs if it recommends shipping. The questions to decide:

- **Surface.** Introduce a schema-bearing paragraph leaf — e.g. `paragraph({ schema })` / `text({ schema })` — and how it coexists with the existing `maxWords` paragraph leaf.
- **Transformed value.** What the transform output of a paragraph *is*: the whole paragraph text parsed into one object? How does that relate to the existing raw `text`?
- **Read-back shape.** How `ParagraphView` exposes the typed value (a new `.value` alongside `.text`?) and whether `Infer` carries it to `read()`.
- **Motivation strength.** Whether the use cases (a one-line `Owner: @handle` paragraph, a paragraph that is really a date/identifier) justify the surface — the three D-0015 consumers are all tables, none is a paragraph.

## Approach

1. Read `provenance/d0015/README.md` + `proposed-shape.md` (§7 "List / paragraph generalization") and the three paragraph touchpoints in `## Today`, to ground the ADR in the shipped paragraph path.
2. Draft the decision record at `provenance/d0017/README.md` in the `d0015` format (Summary / Context / Decision / Why / Options considered / Out of scope / Assumptions), resolving the four questions above with a concrete recommendation.
3. Draft the `provenance/d0017/proposed-shape.md` companion sketching the recommended paragraph-leaf API + a worked read-back example (non-normative).
4. If the recommendation is to ship, enumerate the scoped follow-on task(s) (analogous to `T-SCTC` + `T-SCRB`, paragraph flavor) inside the ADR's closeout so they can be minted later; if defer/reject, record the rationale so the question does not re-open without new information.
5. Confirm the chosen `D-00NN` id is free against the existing decision registry (`provenance/` + `docs/planning/decisions/`); renumber the directory + frontmatter `id` if taken, per the convention `d0015` itself notes.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `provenance/d0017/README.md` | new | The paragraph-transform decision record (Summary / Context / Decision / Why / Options / Out of scope / Assumptions) |
| `provenance/d0017/proposed-shape.md` | new | Non-normative API sketch + worked read-back example for the recommended option |

## Acceptance criteria

- [ ] AC-1: A decision record exists under `provenance/` resolving the four questions (surface, transformed value, read-back shape, motivation) with an explicit ship / defer / reject recommendation.
- [ ] AC-2: The record follows the `provenance/d0015/` format and notes the key asymmetry — a paragraph has no existing discarded `safeParse` output, so this needs a new schema-bearing leaf, not just retained output.
- [ ] AC-3: If the recommendation is to ship, the ADR enumerates the scoped follow-on task(s); if defer/reject, it records the rationale.
- [ ] AC-4: The decision `id` is verified free against `provenance/` and `docs/planning/decisions/`.
- [ ] AC-5: No file under `src/` or `tests/` changes — this task is design-only.

## Out of scope

- Implementing the paragraph leaf, the transform capture, or the read-back — those are the follow-on tasks this ADR scopes, not this task.
- Re-deciding the table/list mechanism (settled in [[D-0015-structured-cells]]).

## Dependencies

- None (design-only). Informed by the table/list shape in this milestone but does not depend on those tasks landing.
