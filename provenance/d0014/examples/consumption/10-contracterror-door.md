> Consumption case 10 for [[D-0014-markdown-structure-validation|D-0014]] — The ContractError door.
> Exercises proposed-shape.md §6; non-normative; that doc wins.

# 10 · The ContractError door

## Affordance

`Contract.read(source, ctx)` is the model-only door. On an `error`-level finding it does not return
`undefined` — it **throws `ContractError`** (F1), a plain `Error` subclass carrying
`findings: Finding[]`. The consumer catches it and inspects `err.findings` exactly as it would read
`validate().findings`. Warnings never throw: `doc` is present iff *no* `error`-level finding exists,
so a warn-only document reads back through `read()`. This is the throwing mirror of case
[02](./02-validate-doc-and-tree.md)'s returning door — Zod's `parse`/`safeParse` split.

## Consumes

[v18b — read() throws on error-level](../validation/18b-read-throws-on-error.md): the
`DecisionContract` and its FAIL document (the required `## Decision` section absent), which yields
one `error`-level `structure/section-missing` finding. This tier adds only the consumer's
catch-and-inspect code.

```ts
// from v18b (reused by reference): a Decision missing its required ## Decision section
//   ⇒ findings: [{ id: "structure/section-missing", level: "error", pos: { line: 8 } }]
```

## Consumer code + expected reads

```ts
import { ContractError } from "markdown-contract";

// The throwing door: a build step that treats a malformed document as a hard failure.
try {
  const doc = DecisionContract.read(source, { path });   // FAIL doc ⇒ throws (F1)
  doc.body.decision.name;                                // unreached
} catch (err) {
  err instanceof ContractError;        // true — error-level findings exist (F1)
  err instanceof Error;                // true — ContractError extends Error
  err.findings.length;                 // 1 — same Finding[] validate() would return
  err.findings[0].id;                  // "structure/section-missing"
  err.findings[0].level;               // "error" — read() throws on error only, not warn
  err.findings[0].pos;                 // { line: 8 } — the SourcePos rides on the finding
}

// The returning door, same contract + same doc: findings + an absent doc, no throw (case 02).
const { findings, doc } = DecisionContract.validate(source, { path });
doc;                                   // undefined — present iff no error-level finding (F1)
findings[0].id;                        // "structure/section-missing" — identical to err.findings[0]
```

Two doors, one machinery: `read()` throws `ContractError` so a build step fails fast;
`validate()` returns `{ findings, doc }` so a linter walks every problem. `err.findings` and
`validate().findings` are the **same** `Finding[]` — the throw carries the diagnostics, the caller
never re-runs `validate()` to recover them.

## Gaps & open consumption decisions

- None. v18b surfaced three gaps — the thrown type, `doc`-on-failure, and the result key — and F1
  folded all three into §4/§6: `ContractError extends Error { findings: Finding[] }` is named,
  `doc` is present iff no `error`-level finding, and the result key is `doc`. Everything this case
  reads (`ContractError`, `err.findings`, the `error`-only throw threshold, the `validate()` mirror)
  is documented §6. The door v18b opened is now closed — see
  [review-checklist.md](../../review-checklist.md).
