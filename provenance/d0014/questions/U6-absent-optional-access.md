> Question U6 for [[D-0014-markdown-structure-validation|D-0014]] — reading an absent optional
> section. Part of the consumption-API review (Phase U in ../review-checklist.md). Non-normative;
> records the decision, folded into [proposed-shape.md](../proposed-shape.md) §6.

# U6 · Absent-optional access

**Surfaced by:** [[04-sectionview-content|c04]], [[11-real-task-consumed|c11]].

## The question

An `optional(section("Why"))` that the document omits — what does `doc.body.why` read as, and how
does a consumer tell *absent* from *present-but-empty*?

## Recommendation — absent ⇒ `undefined`; the `?` key carries it

An optional section gets a `?` key in the inferred type, so all three access paths are
`SectionView | undefined`:

```ts
doc.body.why            // SectionView | undefined
doc.body["Why"]         // SectionView | undefined
doc.body.section("Why") // SectionView | undefined (already so in §6)
```

- **Absent** → `undefined`. **Present-but-empty** → a real `SectionView` whose `text()` is `""` and
  `.tables`/`.lists` are empty. So the test is simply `if (doc.body.why)` (absent) vs a present view
  with empty content.
- A **required** section's key is non-optional (`SectionView`, no `undefined`) — it's guaranteed
  present, because its absence is an `error` that blocks `doc` (F1). (This is the hook the deferred
  "severity drives the inferred type" idea builds on.)

## Decision

**Resolved (2026-06-20).** An absent optional section reads as **`undefined`** (the `?` key on all
three access paths); present-but-empty is a real `SectionView` with empty `text()`. Required sections
get a non-optional key (their absence is an `error` that blocks `doc`, F1). Folds into
proposed-shape.md §6.
