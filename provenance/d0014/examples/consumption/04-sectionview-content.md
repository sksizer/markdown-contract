> Consumption case 04 for [[D-0014-markdown-structure-validation|D-0014]] — SectionView content.
> Exercises proposed-shape.md §6; non-normative; that doc wins.

# 04 · SectionView content

## Affordance

`SectionView` (§6) is the read surface for one section: `name`, `pos`, `anchors`, `text()`,
`table?`/`tables`, `lists`, and nested `sections`. It is the typed door onto a section's prose and
blocks — layer 1 already flattened mdast's cell-as-inline-subtree, so the model hands back scalars
and iterables, not a tree to walk. This case reads a section's prose and asks what `text()` covers.

## Consumes

[v09 — section content leaf: maxWords + required anchor](../validation/09-section-content-leaf-maxwords-anchor.md):
one `section("Summary", { anchor: "summary", content: maxWords(120) })`, its sample document, and
the passing contract — reused by reference. This tier asserts only the consumer reads.

```ts
// from v09 (reused verbatim)
export const SummaryContract = contract({
  body: sections({}, [
    section("Summary", { anchor: "summary", content: maxWords(120) }),
  ]),
});
```

## Consumer code + expected reads

```ts
const doc = SummaryContract.read(source, { path });   // throws ContractError on error-level (F1)

const s = doc.body.summary;            // SectionView — dotted camelCase of "Summary"
s.name;                                // "Summary"
s.pos;                                 // { line: 1 } — the heading's SourcePos
s.anchors;                             // ["summary"] — the section's ^block-ids (§6)

// text() — the documented prose accessor (§6)
s.text();                              // the four-line abstract, flattened to one string
                                       // ── U4: prose only? does it pull in table/list text or
                                       //    nested-subsection prose? v09's section is pure paragraph,
                                       //    so the answer is unambiguous HERE but unstated in general.

// blocks: this section is prose-only, so the block accessors are all empty
s.table;                               // undefined — no table in the section (§6: sole table or absent)
s.tables;                              // [] — TableView[] (§6)
s.lists;                               // [] — ListView[] … but ListView is undeclared (U1)

// an absent optional section — not present in v09's contract, shown for the U6 read
doc.body.why;                          // SectionView | undefined — absent ⇒ undefined (U6)
doc.body.why?.text();                  // undefined — optional chaining is the absent/empty tell
```

Every read above names a documented §6 affordance, except where flagged. `name`/`pos`/`anchors`
are §6 `SectionView` fields; `table`/`tables` are documented (the lone-table and the array). The
three flags below are where §6 hands back a shape it never pins.

## Gaps & open consumption decisions

- **U4 (`text()` flattening).** §6 documents `text(): string` as "flattened prose" but never says
  *what* it flattens — prose only vs a table/list's text too, this section only vs nested
  subsections. v09's section is a single paragraph, so this case can't disambiguate; it only marks
  the read. Pin in
  [review-checklist.md](../../review-checklist.md) U4.
- **U1 (`ListView` shape).** §6 names `lists: ListView[]` on `SectionView` and never defines
  `ListView` — mirror `TableView` (items, `checked`, `pos`, iterable) or thinner? v09 has no list,
  so `s.lists` is `[]` here, but the *element* type is undeclared. See
  [review-checklist.md](../../review-checklist.md) U1.
- **U6 (absent-optional access).** `doc.body.why` reads as `SectionView | undefined` (the `?` key),
  and a consumer tells absent from empty by the `undefined` itself — but §6 never states whether an
  *empty* present section also reads `undefined` or as an empty `SectionView`. v09 has no optional
  section, so this is the read shown, not proven. See
  [review-checklist.md](../../review-checklist.md) U6.
