> Consumption tier for [[D-0014-markdown-structure-validation|D-0014]] — graded cases exercising the
> **OOM typed-model access layer** (proposed-shape.md §6): how a consumer *reads* a validated
> document. Additive *above* the validation tier; non-normative; read in numeric order.

# D-0014 example suite — consumption (OOM) index

The validation tier ([../validation/](../validation/)) asks *"does this document satisfy the
contract?"* and asserts **findings**. This tier asks *"having validated it, how do I read it as
typed data?"* and asserts **reads** — the values and types the §6 model hands back. Each case reuses
the **contract + sample document of a validation sibling** (linked per row) and adds only the
consumer code, so the two tiers stay in lock-step and nothing is re-derived.

The OOM is **additive** (proposed-shape §6): the validator never depends on it, so every case here
presupposes a document that already passes its contract; the model is the reward for validity.

## Index

| # | Example | OOM affordance | Consumes (validation) |
|---|---|---|---|
| 01 | [The `read()` door](./01-read-the-model-door.md) | `Contract.read(source, ctx)` → typed `doc`, or throw | [v01](../validation/01-single-required-section.md) |
| 02 | [`validate()` → findings + doc + tree](./02-validate-doc-and-tree.md) | the three returns; `doc` present iff no error; `tree`/`tree.mdast` | [v08](../validation/08-frontmatter-plus-body-one-pass.md) |
| 03 | [Dual-key section access](./03-dual-key-section-access.md) | bracket / dotted camelCase / `.section()` → same `SectionView` | [v18](../validation/18-oom-consumption-typed-views.md) |
| 04 | [SectionView content](./04-sectionview-content.md) | `text()`, `anchors`, `tables`, `lists`, `sections` | [v09](../validation/09-section-content-leaf-maxwords-anchor.md) |
| 05 | [TableView typed rows](./05-tableview-typed-rows.md) | iterate, `column()`, `find()`, `rowPos()`, cells narrowed by Zod | [v11](../validation/11-typed-cells-enum-pattern.md) |
| 06 | [Named tables via content record](./06-named-tables-content-record.md) | `doc.body.decision.components` / `.risks`, both typed | [v15](../validation/15-multiple-anchored-tables-one-section.md) |
| 07 | [`byAnchor` — declared vs dynamic](./07-byanchor-declared-vs-dynamic.md) | `BlockView`/`undefined`, narrow via `.kind`; doc vs section scope | [v15b](../validation/15b-undeclared-anchor-dynamic-access.md) |
| 08 | [Nested subsections](./08-nested-subsections.md) | `doc.body.X.sections` — consume the post-mortem's three H3s | [v14](../validation/14-nested-children-subsections.md) |
| 09 | [Unknown sections](./09-unknown-sections.md) | `body.unknown[]` admitted by `gap()`/`allowUnknown` | [v05](../validation/05-strict-prefix-gap-tail.md) |
| 10 | [The `ContractError` door](./10-contracterror-door.md) | `read()` throws `ContractError { findings }`; catch + inspect | [v18b](../validation/18b-read-throws-on-error.md) |
| 11 | [Real Task consumed end-to-end](./11-real-task-consumed.md) | the live Task model: files-to-touch, ACs, post-mortem | [v20](../validation/20-real-task-contract-end-to-end.md) |

`## Gaps & open consumption decisions` rolls up below; each maps to an item in
[review-checklist.md](../../review-checklist.md).

## Gaps & open consumption decisions

Filled as cases are authored. Candidate decisions the OOM surface raises (seeded in the checklist):
the exact `SectionView`/`BlockView` shapes, how `text()` flattens, what `body.unknown[]` elements
are typed as, whether `doc.body.X.sections` is dual-keyed like `doc.body`, and the `ListView` shape
(the one view §6 names but never defines).
