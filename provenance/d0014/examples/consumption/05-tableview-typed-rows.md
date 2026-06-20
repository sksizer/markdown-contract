> Consumption case 05 for [[D-0014-markdown-structure-validation|D-0014]] — TableView typed rows.
> Exercises proposed-shape.md §6; non-normative; that doc wins.

# 05 · TableView typed rows

## Affordance

`TableView<Row>` (§6) is the typed, iterable view of a table block. The contract's `columns` and
`cells` declarations drive `Row`: each declared cell takes its Zod type, each undeclared column
defaults to `string`. The view offers `for...of` iteration, `column(name)`, `find(p)`, `rowPos(i)`,
`rowCount`, and `columns` — every read keyed and typed off the column declaration.

## Consumes

[v11 — typed cells: enum / pattern](../validation/11-typed-cells-enum-pattern.md): a `## Files`
section whose sole `content: table(...)` declares three columns with a `Kind` enum cell. Its
contract and sample document are reused by reference. The one fact the reads lean on:

```ts
// from v11 — Kind is the enum, the rest default to string
content: table({
  columns: ["File", "Kind", "Location"],
  cells: { Kind: z.enum(["add", "modify", "delete"]) /* Location regex elided */ },
})
// ⇒ Row = { File: string; Kind: "add" | "modify" | "delete"; Location: string }
```

The sole `content: table(...)` promotes the table to `doc.body.files`, typed `TableView<Row>`.

## Consumer code + expected reads

```ts
const doc = FilesContract.read(source, { path });   // throws ContractError on error-level (F1)
const files = doc.body.files;                        // TableView<Row> — the promoted table

// columns + count, straight off the declaration / projection
files.columns;                         // ["File", "Kind", "Location"]
files.rowCount;                        // 3
files.pos;                             // { line: 1 } — the table block's SourcePos

// for...of yields typed rows; the cells Zod narrows Kind, not string
for (const r of files) {
  r.File;                              // string
  r.Kind;                              // "add" | "modify" | "delete"  — the enum union, NOT string
  r.Location;                          // string  — undeclared cell defaults to string
}

// column(name) — a whole column, element type from Row[name]
files.column("Kind");                  // ("add" | "modify" | "delete")[]  → ["add","modify","delete"]
files.column("File");                  // string[]                        → ["grammar.ts","leaves.ts","legacy.ts"]

// find(p) — typed lookup; predicate sees the typed Row and its index
files.find((r) => r.Kind === "delete")?.File;   // "legacy.ts"
files.find((r, i) => i === 0)?.File;            // "grammar.ts"

// rowPos(i) — positions survive for diagnostics / fixes (C3/A3)
files.rowPos(2);                       // { line: 6 } — the legacy.ts row's source line
```

Every read above is a documented §6 `TableView<Row>` affordance. The cells Zod — not a bare
`string` — is what makes `r.Kind` and `column("Kind")` the enum union; that is the whole point of
the typed view over the layer-1 string cells.

## Gaps & open consumption decisions

- **U8 (dynamic `TableView`).** A dynamic/undeclared table is `TableView<Record<string, string>>` —
  the *same* interface, just `string` cells. So `column()` and `find()` stay typed `string` (the
  predicate's `r` is `Record<string, string>`); none of the enum narrowing above survives without a
  `cells` declaration. That the dynamic and typed views share one interface — only `Row` differs —
  is asserted in §6 but the string-typed `column()`/`find()` consequence wants stating. See
  [review-checklist.md](../review-checklist.md); the dynamic door itself is
  exercised in case [07](./07-byanchor-declared-vs-dynamic.md).
- Everything else here (`for...of`, `column`, `find`, `rowPos`, `rowCount`, `columns`, `pos`, and
  the cell-driven `Row`) is documented §6.
