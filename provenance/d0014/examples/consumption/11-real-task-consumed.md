> Consumption case 11 for [[D-0014-markdown-structure-validation|D-0014]] — Real Task consumed
> end-to-end. Exercises proposed-shape.md §6; non-normative; that doc wins.

# 11 · Real Task consumed end-to-end

## Affordance

The capstone: a consumer reads the live SDLC `TaskContract` (§5.2) model end-to-end. One `doc`
carries `frontmatter` (id/status), a typed `filesToTouch` `TableView` (`Kind` cell-typed
`new | modify | delete`), an `acceptanceCriteria` checkbox `list`, an absent optional `Today`, and a
`Post-mortem` whose three H3s appear only once the task is worked. It folds together every §6 move
the earlier cases isolated — dual-key access, `TableView` iteration, nested `.sections`, and
absent-optional reads — against a real document.

## Consumes

[v20 — Real Task contract end-to-end](../validation/20-real-task-contract-end-to-end.md): the §5.2
`TaskContract` (`TaskFrontmatter` + body grammar + cross-plane `docRule`) on a real open Task, and
its sample document. This tier reflects the folded §5.2 decisions the validation sibling predates:
`Kind` is `new | modify | delete` (G1), `Today` is `optional(section("Today"))` not a `oneOf` (G2),
`Post-mortem` declares the three H3s (G3), and the result key is `doc`, not `value`.

```ts
// the consumed body shape (from §5.2, abbreviated)
sections({ order: "recognized-relative", allowUnknown: true }, [
  oneOf(["Goal", "Goal / Problem statement"]),
  optional(section("Today")),                              // G2
  section("Files to touch", {
    optional: true,
    content: table({ columns: ["Location", "Kind", "Change"],
      cells: { Kind: z.enum(["new", "modify", "delete"]) } }),   // G1
  }),
  section("Acceptance criteria", { content: list({ everyItem: "checkbox", minItems: 1 }) }),
  optional(section("Post-mortem", {                        // G3 — three H3s
    children: sections({ order: "strict", allowUnknown: false }, [
      section("Acceptance criteria coverage"),
      section("What worked"),
      section("Friction and automation gaps"),
    ]),
  })),
]);
```

## Consumer code + expected reads

```ts
const doc = TaskContract.read(source, { path });   // throws ContractError on error-level (F1)

// 1 — frontmatter, typed from TaskFrontmatter
doc.frontmatter.id;                    // "T-AB12"
doc.frontmatter.status;                // "open/ready"  (TaskStatus union)

// 2 — Files to touch: a typed TableView, reached by both keys
const files = doc.body.filesToTouch;             // dotted camelCase of "Files to touch"
doc.body["Files to touch"] === files;            // true — exact-heading key, same SectionView/view
files.rowCount;                                  // 2
for (const r of files) r.Kind;                   // "new" | "modify" | "delete" — cell-typed (G1)
files.column("Location");                         // string[] — undeclared column ⇒ string cells
files.find((r) => r.Kind === "delete")?.Location; // typed lookup, undefined here

// 3 — Acceptance criteria: a checkbox list
const acs = doc.body.acceptanceCriteria;
acs.lists[0].items.length;             // 2 — the list leaf's items (U1 shape unpinned)

// 4 — Today is optional and absent on this doc
doc.body.today;                        // SectionView | undefined  ⇒ undefined here (U6)

// 5 — Post-mortem appears only once the task is worked; absent on an open task
doc.body.postMortem;                   // SectionView | undefined  ⇒ undefined here (U6)
// once worked, its three H3s are nested subsections, reached the same dual-key way:
const pm = doc.body.postMortem;
pm?.sections.whatWorked.text();        // nested SectionView read (U3) — when present
pm?.sections["Acceptance criteria coverage"];   // exact-heading key on the nested record (U3)
```

`read()` presupposes validity, so the open Task hands back `doc` directly: the cross-plane `docRule`
(`task/post-mortem-when-worked`) sees `status: "open/ready"`, so `isWorked` is false and it emits
nothing — the absent `Post-mortem` is legal, and `doc.body.postMortem` is `undefined` rather than a
finding. Every read above resolves through a documented §6 affordance: dual-key `SectionView`,
`TableView` iteration/`column`/`find`, the `?`-keyed optional, and nested `.sections`.

## Gaps & open consumption decisions

- **U6 (absent-optional access).** `doc.body.today` and `doc.body.postMortem` are the `?`-keyed
  optionals — `SectionView | undefined`. This case reads both as `undefined`; how a consumer tells
  *absent* from *present-but-empty* (and whether the key is truly omitted vs `undefined`) is
  unpinned. See review-checklist.md U6.
- **U3 (`SectionView.sections` dual-key).** `pm.sections.whatWorked` and
  `pm.sections["Acceptance criteria coverage"]` assume the nested `sections` record carries the same
  bracket + camelCase keying as `doc.body`. §6 types it `Record<string, SectionView>` with a
  "same dual-key access" comment but does not confirm `.section()` / camelCase on the nested record.
  See review-checklist.md U3.
- **U1 (`ListView` shape).** Touched lightly via `acs.lists[0].items` — the `list`/`ListView` member
  shape is pinned in case 04, not here.
- Everything else — `doc.frontmatter`, dual-key `SectionView`, `TableView`
  iteration/`column`/`find`, nested `.sections` — is documented §6, exercised together for the first
  time.
