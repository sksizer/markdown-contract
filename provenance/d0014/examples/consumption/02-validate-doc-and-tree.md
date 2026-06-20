> Consumption case 02 for [[D-0014-markdown-structure-validation|D-0014]] — `validate()` returns
> findings + doc + tree. Exercises proposed-shape.md §4/§6; non-normative; that doc wins.

# 02 · `validate()` → findings + doc + tree

## Affordance

`Contract.validate(source, ctx)` is the analysis door (vs `read()`'s model-only door). It returns
**three** things (§4, F1): `findings` (always), `doc?` (the typed model, present iff no
`error`-level finding), and `tree` (the projection — `tree.mdast` is the raw layer-0 AST). A
consumer that wants *both* the diagnostics and the data — a lint summary, a report op — uses this
door.

## Consumes

[v08 — unified frontmatter + body](../validation/08-frontmatter-plus-body-one-pass.md): a contract
with a Zod frontmatter and a body grammar validated in one pass, on a document that passes.

## Consumer code + expected reads

```ts
const { findings, doc, tree } = Contract.validate(source, { path });

// 1 — findings is always present (here empty: the document is valid)
findings.length;                 // 0

// 2 — doc is present iff there is no error-level finding (F1)
if (doc) {
  doc.frontmatter.id;            // typed from the frontmatter Zod
  doc.body.overview.text();      // typed SectionView read
}

// 3 — tree is the projection; tree.mdast is the raw AST — for power consumers, no re-parse
tree.frontmatter?.lineForPath(["status"]);   // E2 — key → line, e.g. 3
tree.root.sections.map((s) => s.name);        // projection walk, positions intact
tree.mdast;                                    // the unified/remark Root (F1)
```

The three returns form a ladder of abstraction over **one** parse: `tree` (raw + projection) →
`findings` (diagnostics) → `doc` (typed model). `read()` (case [01](./01-read-the-model-door.md)) is
just `validate()` then "throw if no `doc`."

## Gaps & open consumption decisions

- **U7 (`doc` root surface).** This case reads `doc.frontmatter` and `doc.body`, but whether `doc`
  also carries `doc.byAnchor` (doc-wide anchor lookup, §6) and document-level `pos`/iteration is
  unpinned — case 07 needs `doc.byAnchor`, so U7 resolves there.
- **U9 (`tree` vs `doc` for analysis).** Both `tree.root.sections[i].pos` and `doc.body.X.pos` give
  a section's line — when should a consumer reach for the projection vs the model? The boundary
  (typed reads → `doc`; structural/AST analysis or unmapped data → `tree`) wants stating in §6.
- `tree.frontmatter.lineForPath` (E2) and `tree.mdast` (F1) are documented; their *return-on-a-valid
  doc* is exercised here for the first time.
