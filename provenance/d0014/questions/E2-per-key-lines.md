> Question E2 for [[D-0014-markdown-structure-validation|D-0014]] — per-key frontmatter line index.
> Part of the open-decision review (see ../review-checklist.md). Non-normative; records the
> decision, folded into proposed-shape.md at step H1.

# E2 · per-key line index

**Surfaced by:** [[07a-frontmatter-enum-and-unknown-key|07a]].

## The question

A `frontmatter/*` finding (E1) should point at the **offending field's line**, but Zod only gives a
key *path* (`["status"]`), and the projection knows the frontmatter as one block (a single `pos`).
So we need a key→line lookup on `DocTree.frontmatter`. Flat map, or a path function?

```text
1: ---
2: id: D-0014
3: status: open/draft      ← bad enum → finding should be pos.line = 3
4: ---
```

## Recommendation — `lineForPath(path)`

Add a **`lineForPath(path: (string | number)[]): number | undefined`** method to
`DocTree.frontmatter`, *not* a flat `keyLines: Record<string, number>`. Reason: **nesting**.
Frontmatter has arrays/objects (`prs[0]`, `related[2]`, `depends_on[3]`), so a Zod issue path can be
`["prs", 0]` — a flat top-level map can't resolve that, but the path function maps 1:1 onto the Zod
issue path.

```ts
interface DocTree {
  frontmatter: {
    raw: string;
    data: unknown;
    pos: SourcePos;
    lineForPath(path: (string | number)[]): number | undefined;  // ← E2
  } | null;
  root: SectionNode;
}

// engine, internally:  issue.path ["status"] → frontmatter.lineForPath(["status"]) → 3
```

It's the frontmatter twin of the table's `rowLines` (A3): both turn a Zod issue path into a source
line. The **engine builds and calls it** — the consumer never supplies it.

## Implementation note (a spike, not this decision)

`lineForPath` needs a **position-aware YAML parse**. Today the frontmatter is parsed for *data* only
(positions discarded). The `yaml` package (eemeli) exposes a document/CST model with per-node
ranges; the spike confirms it yields key positions under Bun. The decision here commits the **API**
(`lineForPath`) + that the frontmatter parse must retain positions; the parser choice is impl
detail.

## Decision

**Resolved (2026-06-19).** Add `lineForPath(path: (string | number)[]): number | undefined` to
`DocTree.frontmatter` — not a flat `keyLines` (nesting means a Zod path can be `["prs", 0]`). The
**engine builds it** during parse from a position-aware YAML pass and **calls it internally** to
localize `frontmatter/*` findings; consumers never supply it (it's library-provided, like table
`rowLines` / `ListItem.pos` / every node's `pos`). The position-aware YAML parser choice (which lib
yields per-node ranges under Bun) is a spike, not this decision. Fold into proposed-shape.md at H1
(§2 `DocTree.frontmatter.lineForPath` + the position-aware-parse requirement).
