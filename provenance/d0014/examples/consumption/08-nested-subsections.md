> Consumption case 08 for [[D-0014-markdown-structure-validation|D-0014]] — Nested subsections.
> Exercises proposed-shape.md §6; non-normative; that doc wins.

# 08 · Nested subsections

## Affordance

`SectionView.sections` (§6) — the typed view of a section's nested subsections. A section declared
with `children: sections(...)` projects its H3s as `SectionNode.sections` (layer 1, by heading
depth), and the model hands them back off the parent `SectionView`. This case walks the Task
post-mortem's three H3s — `Acceptance criteria coverage`, `What worked`, `Friction and automation
gaps` — through `doc.body.postMortem.sections`.

## Consumes

[v14 — nested children (subsections)](../validation/14-nested-children-subsections.md): the
`children: sections(...)` mechanism and its strict child grammar, reused by reference. The consumed
contract here is the Task `Post-mortem` section from proposed-shape.md §5.2 — three strict H3s:

```ts
// from §5.2 (the Post-mortem section, abbreviated)
optional(section("Post-mortem", {
  children: sections({ order: "strict", allowUnknown: false }, [
    section("Acceptance criteria coverage"),
    section("What worked"),
    section("Friction and automation gaps"),
  ]),
})),
```

```md
## Post-mortem

### Acceptance criteria coverage

All five ACs landed; the checkbox-count rule caught one stray.

### What worked

The contract split kept the engine fixture-testable.

### Friction and automation gaps

The lease heartbeat needed a manual nudge once.
```

## Consumer code + expected reads

```ts
const doc = TaskContract.read(source, { path });   // §6 read() door

const pm = doc.body.postMortem;        // SectionView — dotted camelCase of "Post-mortem"
pm.name;                               // "Post-mortem"

// The three H3s come back off pm.sections. §6 types this Record<string, SectionView>,
// but the inline comment says "same dual-key access" — so all three forms below are
// asserted, and which actually holds is the open question (U3).
pm.sections.acceptanceCriteriaCoverage.text();   // "All five ACs landed; …"  (camelCase — U3)
pm.sections["What worked"].text();               // "The contract split kept …" (exact — U3)
pm.sections.section?.("Friction and automation gaps").text();  // .section() accessor — U3

// Whatever the keying, the elements are SectionView — name + pos + text() hold.
pm.sections.whatWorked.name;           // "What worked"
pm.sections.whatWorked.pos;            // { line: 9 } — the H3's SourcePos

// Recursion is the same combinator: a child SectionView is a full SectionView, so it
// carries its own (here empty) .sections.
pm.sections.whatWorked.sections;       // Record<string, SectionView> — empty; no H4s
```

The reads mirror v14's `doc.body.decision.sections.components.text()` walk — one level deeper into
the Task post-mortem. `text()` per H3 is prose-only here (no tables/lists under these H3s), so its
result is unambiguous; the general `text()` contract is U4 (case 04).

## Gaps & open consumption decisions

- **U3 (`SectionView.sections` dual-key).** The heart of this case. §6 types `sections` as
  `Record<string, SectionView>` yet comments "same dual-key access" as `doc.body`. A plain `Record`
  gives exact-heading bracket keys only — `pm.sections.acceptanceCriteriaCoverage` (camelCase) and
  `pm.sections.section(...)` (the accessor) would *not* exist. The case asserts all three forms; one
  of the contract and the comment must give. Pinned in
  [review-checklist.md](../../review-checklist.md) U3.
- Everything else used (`read()`, `SectionView` `name`/`pos`/`text()`, `children`-driven nesting) is
  documented §6.
