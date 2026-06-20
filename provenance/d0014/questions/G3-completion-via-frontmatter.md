> Question G3 for [[D-0014-markdown-structure-validation|D-0014]] — completion is a frontmatter
> conditional, not a body section. Part of the open-decision review (see ../review-checklist.md).
> Non-normative; records the decision, folded into [proposed-shape.md](../proposed-shape.md)
> (§5.2 + §3) at step H1.

# G3 · completion via frontmatter

**Surfaced by:** [[20a-real-task-closed-without-completion-note|20a]].

## The question

§5.2 models "a closed task must record completion" two ways at once — a body section
`optional(section("Completion note"))` and a cross-plane `docRule` that checks
`doc.body.section("Completion note")`. The corpus does neither: how is completion really recorded,
and what does that do to the `docRule` example?

## What the corpus actually does

| Fact | Evidence |
|---|---|
| Completion is a **frontmatter field**, not a body section | `schema.ts:154` `completion_note: z…`; closed tasks T-0011 / T-P3HA / T-UE7T / T-KPOU all carry `completion_note:` in frontmatter |
| **No `## Completion note` body section** exists | zero heading occurrences across `docs/planning/tasks/` |
| The `closed/* ⇒ completion_note` rule **already exists in the frontmatter Zod** | `schema.ts:207-216` — `if status closed && completion_note === undefined → "'completion_note' is a required property"` (path `["completion_note"]`) |

So the constraint is a **frontmatter-internal conditional** — pure Zod (`superRefine`/allOf
if-then), no body plane involved.

## Recommendation

**1. Completion is frontmatter-only — drop its body phantom (but not `docRule`).** Remove
`optional(section("Completion note"))` from §5.2; no such body section exists. The
`closed/* ⇒ completion_note` rule already lives in the frontmatter Zod (`schema.ts:207`) and the
contract inherits it via `frontmatter: TaskFrontmatter`; its finding surfaces through the
**frontmatter plane** (E1/E2 → localized to the `completion_note` key line). Completion never
spanned planes — it is *not* a `docRule`.

**2. The real cross-plane rule is the post-mortem (PR 464,
<https://github.com/sksizer/dev/pull/464>).** `task-work` appends a `## Post-mortem` H2 with three
ordered H3 subsections at start-time, and a worked task must carry it — *that* is the genuine
frontmatter-gates-body constraint the `docRule` example should show. Model it as
**body structure + a cross-plane presence gate**, cleanly split:

```ts
// body grammar — the post-mortem's shape (optional by default)
optional(section("Post-mortem", {
  children: sections({ order: "strict", allowUnknown: false }, [
    section("Acceptance criteria coverage"),
    section("What worked"),
    section("Friction and automation gaps"),
  ]),
})),

// cross-plane rule — frontmatter status gates the body section's presence
docRule("task/post-mortem-when-worked", (doc) =>
  isWorked(doc.frontmatter.status) && !doc.body.section("Post-mortem")
    ? [{ id: "task/post-mortem-when-worked", level: "error",
          message: "a worked task must include a ## Post-mortem section" }]
    : []),
```

The body grammar declares *what the section looks like*; the `docRule` declares
*when it must exist*. This replaces §5.2's contrived `task/completion-note-when-closed` docRule with
a corpus-real one.

**3. `docRule` stays in v1 — confirmed.** The earlier "no cross-plane rule exists" was wrong; it
came from looking at completion (frontmatter-only). The post-mortem is a live cross-plane
constraint, so `docRule` earns its place in §3. (Open details, deferred to H1/G4: the precise
`isWorked(status)` predicate, and whether PR #464 AC-2 — "`## Post-mortem` is the last H2" — becomes
its own positional rule. The cross-plane *shape* is what's decided here.)

## Decision

**Resolved (2026-06-19).** **Completion** stays frontmatter-only: drop §5.2's phantom
`optional(section("Completion note"))`; the `closed/* ⇒ completion_note` conditional already lives
in the frontmatter Zod (`schema.ts:207`) and surfaces on the frontmatter plane (E1/E2) — not a
docRule. **The real cross-plane `docRule` is the post-mortem** (PR #464): the body grammar declares
`optional(section("Post-mortem", { children: 3 ordered H3s }))` (Acceptance criteria coverage / What
worked / Friction and automation gaps), and `docRule("task/post-mortem-when-worked")` gates its
presence on frontmatter `status` (worked ⇒ required, error). **`docRule` stays in v1** — confirmed
by this live constraint; the earlier "no cross-plane rule" came from the frontmatter-only completion
red herring. Deferred to H1/G4: the precise `isWorked(status)` predicate and whether PR #464 AC-2
(post-mortem is the last H2) becomes its own positional rule. Fold into proposed-shape.md §5.2 + §3
at H1.
