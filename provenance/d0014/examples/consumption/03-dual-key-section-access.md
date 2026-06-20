> Consumption case 03 for [[D-0014-markdown-structure-validation|D-0014]] — Dual-key section access.
> Exercises proposed-shape.md §6; non-normative; that doc wins.

# 03 · Dual-key section access

## Affordance

One section, three keys. The inferred `body` carries each section under **both** keying styles plus
an explicit accessor (§6 "Dual access"): the exact heading text in brackets, the generated
lowerCamelCase dotted key, and `section(name)`. All three resolve to the **same** `SectionView`. The
camelCase key is derived from the heading by the F4 Unicode rule; a pair of findings (F4) guarantees
that within a sibling scope every exact name and every dotted key is unique.

## Consumes

[v18 — OOM consumption: typed rows, byAnchor, dual-key](../validation/18-oom-consumption-typed-views.md):
its `FilesContract`, the `## Files to touch` sample document, and its dual-key block. Reused by
reference; this tier asserts only the reads. One snippet to anchor the key:

```ts
// from v18 — the section whose three keys this case exercises
section("Files to touch", {
  content: table({
    columns: ["Location", "Kind", "Change"],
    cells: { Kind: z.enum(["new", "modify", "delete"]) },   // folded: kinds are new|modify|delete
  }),
});
```

## Consumer code + expected reads

```ts
const doc = FilesContract.read(source, { path });   // model-only door (§6)

// 1 — three keys onto one section. "Files to touch" → "filesToTouch" by the F4 Unicode rule:
//     split on /[^\p{L}\p{N}]+/u, drop the gaps, lowerCamelCase the words.
const exact = doc.body["Files to touch"];        // bracket — exact heading text, always available
const dotted = doc.body.filesToTouch;            // dotted — generated lowerCamelCase
const accessed = doc.body.section("Files to touch"); // accessor — for dynamic / edge names

// 2 — same SectionView, not three copies (one lazy facade over the projection, §6)
exact === dotted;        // true
dotted === accessed;     // true

// 3 — the shared view answers identically through any key
exact.name;              // "Files to touch" — name is the exact heading, not the camelCase key
dotted.name;             // "Files to touch"
accessed.pos;            // { line: 6 } — one SourcePos, one underlying node
dotted.table?.rowCount;  // 3 — same TableView behind every key

// 4 — the F4 dual-key invariant. Within doc.body, every exact name and every dotted key is unique,
//     guaranteed by two structure-plane findings, so neither lookup is ambiguous:
//       structure/duplicate-section — two sections share the SAME exact heading (error)
//       structure/key-collision     — two DISTINCT headings collapse to one camelCase key (error)
//     A passing doc (this one) emits neither, so the three keys above are well-defined.
```

The dotted key is best-effort, not guaranteed: a heading that yields an invalid identifier or a
caseless script gets **no** dotted alias (§6) — but bracket and `section()` still reach it. So the
accessor is the always-available door; the dotted key is sugar when the heading is identifier-clean.

## Gaps & open consumption decisions

Everything used here is documented §6: the three keys (§6 "Dual access"), the F4 Unicode camelCase
rule, the F4 dual-key invariant (`structure/duplicate-section` + `structure/key-collision`), `name`,
`pos`, and `table?` on the shared `SectionView`. No U-item (U1–U9,
[review-checklist.md](../../review-checklist.md)) is surfaced — the dual key
onto a top-level section is fully specified. (U3 asks the parallel question for *nested* subsection
keys, `doc.body.X.sections`; that is case [08](./08-nested-subsections.md), not here.)
