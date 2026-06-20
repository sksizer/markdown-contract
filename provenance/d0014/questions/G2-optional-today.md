> Question G2 for [[D-0014-markdown-structure-validation|D-0014]] — `## Today` optionality (and a
> dead alias). Part of the open-decision review (see ../review-checklist.md). Non-normative; records
> the decision, folded into [proposed-shape.md](../proposed-shape.md) (§5.2) at step H1.

# G2 · optional Today

**Surfaced by:** [[20-real-task-contract-end-to-end|20]].

## The question

§5.2's task contract has `oneOf(["Today", "Current state"])` as a **required** alias set. Two
fidelity mismatches against the live schema:

1. **Optionality** — is `## Today` actually required?
2. **The alias** — is `Current state` a real alternate heading, or invented?

## Recommendation — `optional(section("Today"))`

**1. Optional.** `body-schema.yaml:26` is explicit: `- name: Today` → **`required: false`**. So the
section must be wrapped in `optional()`; a task with no `## Today` is valid (it's a pre-pickup floor
item, not a birth requirement).

**2. Drop the dead alias.** `## Current state` occurs as a heading in **zero** task docs
(`rg '^#+ Current state' docs/planning/tasks/` → empty); the string lives only in the schema's
*description* prose ("Current state of the touched area…"). So `oneOf(["Today","Current state"])`
models a spelling the corpus never uses. Fidelity says collapse it to a plain `section("Today")`.
(This revisits the earlier "divergent code-side aliases" assumption for *this* set — the evidence
now says there's no divergence to unify. The `Goal` alias set is separate and unaffected; it
deserves the same check on its own.)

Net change to §5.2:

```ts
// was:  oneOf(["Today", "Current state"]),                 // required alias set
optional(section("Today")),                                  // optional, single canonical name
```

## Decision

**Resolved (2026-06-19).** `## Today` → **`optional(section("Today"))`**: `optional()` because
`body-schema.yaml:26` marks it `required: false`, and a plain `section("Today")` (no `oneOf`)
because `Current state` is a phantom heading — zero corpus occurrences, schema-description prose
only. Drops the dead alias; the `Goal` alias set is unaffected (deserves its own check). Fold into
proposed-shape.md §5.2 at H1.
