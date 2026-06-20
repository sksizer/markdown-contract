> Question G1 for [[D-0014-markdown-structure-validation|D-0014]] — the Files-to-touch `Kind` enum:
> align the design sketch to the live corpus. Part of the open-decision review (see
> ../review-checklist.md). Non-normative; records the decision, folded into
> [proposed-shape.md](../proposed-shape.md) (§5.2) at step H1.

# G1 · Kind enum

**Surfaced by:** [[20-real-task-contract-end-to-end|20]].

## The question

§5.2's task-contract sketch types the `Kind` column as `z.enum(["add", "modify", "delete"])`. The
live corpus uses **`new`**, not `add`. A modelling-fidelity mismatch: which is canonical, and does
the example move or the corpus?

## Recommendation — change the sketch to `["new", "modify", "delete"]`

The corpus is unambiguous and `new` is enforced in *running code*, not just prose:

| Source | Value |
|---|---|
| `plugin/lib/model/entities/task/ops/parse-touchpoints.ts:37` | `VALID_KINDS = new Set(["new", "modify", "delete"])` |
| `plugin/lib/model/entities/task/body-schema.yaml:44` | `Kind is new / modify / delete` |
| `plugin/skills/task-define/SKILL.md`, `task-ensure-ready/SKILL.md` | `Kind ∈ {new, modify, delete}` |
| real task docs (`T-4Q0T`, `T-EGI0`), site reference docs | `new / modify / delete` |

`add` was an illustrative slip in the sketch, nowhere in the corpus. Decisive argument: D-0014
*retires* `parse-touchpoints.ts` (the line-scanner) and replaces it with
`table({ cells: { Kind: z.enum([...]) } })`. A faithful replacement
**must preserve its `VALID_KINDS` set** — so the contract has to be `["new", "modify", "delete"]` to
stay behaviour-compatible. No reason to touch the template; the model bends to the corpus.

```ts
section("Files to touch", {
  optional: true,
  content: table({
    columns: ["Location", "Kind", "Change"],
    cells: { Kind: z.enum(["new", "modify", "delete"]) },   // ← was ["add","modify","delete"]
  }),
});
```

## Decision

**Resolved (2026-06-19).** `Kind` column → **`z.enum(["new", "modify", "delete"])`** — align the
§5.2 sketch to the corpus (the retired `parse-touchpoints.ts` `VALID_KINDS` the contract must
preserve to stay behaviour-compatible); template untouched. Fold into proposed-shape.md §5.2 at H1.
