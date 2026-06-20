> Question G4 for [[D-0014-markdown-structure-validation|D-0014]] — how tightly to model the
> milestone (and skill) doctype. Part of the open-decision review (see ../review-checklist.md).
> Non-normative; records the decision, folded into [proposed-shape.md](../proposed-shape.md) at H1.

# G4 · milestone / skill tightness

**Surfaced by:** [[21-real-milestone-or-skill-doctype|21]].

## The question

The milestone schema is "lenient" — does the contract model it loosely (gap()-admitted H3
categories) or impose a tighter shape? And can `gap()`-admitted subsections carry per-entry content
in v1, or does that go to a parent `rule()`?

## What the corpus actually does

`milestone/body-schema.yaml` is **selectively** lenient, not uniformly so:

| Section | Required | Sub-structure |
|---|---|---|
| `Goal` | yes | — |
| `Success criteria` | yes | — |
| `Deliverables` | yes | **open H3s** — "Sub-H3 sections by category" |
| `Out of scope` | no | — |
| `Risks / open questions` | no | — |

So the leniency is **local to `## Deliverables`'s H3 level**; the H2 level is well-defined.

## Recommendation — model each level at the schema's own tightness

**Fidelity, not a global dial.** Match tightness level-by-level: tight where the schema enumerates,
`gap()` where it's open. Imposing an H3 enumeration the schema doesn't have would reject valid
milestones; loosening the H2 level would miss real omissions.

```ts
sections({ order: "recognized-relative", allowUnknown: true }, [
  section("Goal"),
  section("Success criteria"),
  section("Deliverables", {
    children: sections({ order: "none", allowUnknown: true }, [ gap() ]),  // open category H3s
  }),
  optional(section("Out of scope")),
  optional(section("Risks / open questions")),
]),
```

**No expected child structure on `gap()` elements — by concept, not "deferred."** Child structure is
a property of a *declared* section: to validate a section's children you **declare** it
(`section("X", { children: ... })`, `optional(...)` included) — that's how the post-mortem (G3) and
any named optional section get their shape. `gap()` means "free-form, unknown sections allowed
here"; it carries no structural expectation, and there is **no** `gap({ each })` /
per-entry-structure feature — *not* in v1 and *not* as future sugar, because defining expected
structure on something declared free-form is a contradiction. If you genuinely must inspect admitted
sections, that is an imperative `rule()` escape hatch (custom code walking `node.sections`), never
the declarative grammar. (This **sharpens C5 Part 2**: gap() stays a bare marker, and the route to
child structure is declaring the section, not enriching gap().)

**Skill doctype: same principle.** Whatever the skill schema enumerates, model tight; wherever it
declares an open set, use `gap()`. The rule is general — *the contract mirrors the schema's own
tightness at each level*, no tighter, no looser.

## Decision

**Resolved (2026-06-19).** Model each doctype **level-by-level at the schema's own tightness** —
tight where it enumerates (milestone H2s: Goal / Success criteria / Deliverables required, Out of
scope / Risks optional), `gap()`-admitted where it's open (Deliverables' "Sub-H3 by category").
**Child structure belongs to *declared* sections** (`section(..., { children })`, `optional`
included); `gap()` carries **no** structural expectation and gains **no** `{ each }` feature —
defining structure on free-form gap elements is a contradiction (not v1, not future sugar). The only
way to inspect admitted free-form sections is an imperative `rule()` escape hatch (custom code),
never the declarative grammar. Same principle for the skill doctype. **Sharpens C5 Part 2.** Fold
into proposed-shape.md at H1.
