> Question F1 for [[D-0014-markdown-structure-validation|D-0014]] — `read()` + when `doc` exists.
> Part of the open-decision review (see ../review-checklist.md). Non-normative; records the
> decision, folded into proposed-shape.md at step H1.

# F1 · read() + value

**Surfaced by:** [[18-oom-consumption-typed-views|18]], [[18b-read-throws-on-error|18b]].

## The question

`Contract.read(source)` is the throw-on-failure door (vs `validate`, which returns findings). Three
loose ends: the thrown type, *when* it throws, and *when* `validate`'s `doc` exists.

## Recommendation (the Zod `parse`/`safeParse` parallel)

```ts
class ContractError extends Error {
  findings: Finding[];   // the error-level findings that blocked the model
}

contract.validate(source, ctx): { findings: Finding[]; doc?: Infer<typeof contract> };
contract.read(source, ctx): Infer<typeof contract>;   // returns doc, or throws ContractError
```

- **`ContractError extends Error { findings }`** — carries the findings so a caller catching it can
  inspect what failed.
- **`read()` throws on `error`-level only.** Warnings do **not** throw — a doc with only warnings is
  "valid enough"; `read` returns its model. (`read` = `validate`, then throw `ContractError` if
  `doc` is absent, else return `doc`.)
- **`doc` is present iff there is no `error`-level finding** (warnings are fine); undefined iff any
  `error`-level finding exists. So `doc` is "the typed model whenever the document is structurally
  valid."

This maps cleanly to Zod: `validate` ≈ `safeParse` (findings + maybe doc), `read` ≈ `parse` (doc or
throw). It also pins the F-phase severity semantics: `error` blocks the model, `warn` doesn't —
which is the hook the deferred "severity drives the inferred type" idea (in the parking lot) would
build on.

## Intermediate artifacts on the `validate` result

Beyond `findings` + `doc`, expose the intermediate layers so power consumers (and the deferred CLI /
SARIF emitter) can analyze without re-parsing:

```ts
contract.validate(source, ctx): {
  findings: Finding[];
  doc?: Infer<typeof contract>;
  tree: DocTree;            // the projection — and tree.mdast is the raw layer-0 AST
};
```

- **`tree: DocTree`** carries the projection (`frontmatter`, `root`) and exposes **`tree.mdast`**
  (the raw mdast tree). Cheap — the engine already built both; it just stops hiding them.
- **Raw Zod results:** the frontmatter Zod result rides on `tree.frontmatter` (e.g.
  `tree.frontmatter.zodResult`). Threading every *leaf* Zod result through is **deferred** —
  findings and `tree` already cover the common cases; a `raw` channel can be added later for the
  unmapped Zod issues.
- **`read()` stays lean** (returns just `doc`); **`validate()` is the analysis door** where the
  artifacts live.

## Decision

**Resolved (2026-06-19, "for now").** `class ContractError extends Error { findings: Finding[] }`.
`read(source)` throws `ContractError` on **error-level only** (warnings don't throw); `validate`'s
`doc` is **present iff there is no error-level finding** (warnings fine), undefined iff any error.
`validate` also returns **`tree: DocTree`** (the projection; `tree.mdast` is the raw AST) as an
analysis artifact, with the frontmatter raw Zod result on `tree.frontmatter`; deeper per-leaf Zod
threading is deferred (a future `raw` channel). `read()` returns just `doc`. Fold into
proposed-shape.md §4/§6 at H1.
