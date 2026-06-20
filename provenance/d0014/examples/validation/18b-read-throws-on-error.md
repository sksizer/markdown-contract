> Example 18b for [[D-0014-markdown-structure-validation|D-0014]] — read() throws on
> error-level findings. Exercises the proposed API (proposed-shape.md); non-normative; where
> they disagree, that doc wins.

# 18b · read() throws on error-level findings

## Capability

Builds on 18 (the OOM consumption model). Stresses the **two-door** contrast of §6:
`Contract.read(source)` is the model-only door — like Zod's `parse`, it throws when any
error-level finding exists — while `Contract.validate(source)` is the findings door — like
`safeParse`, it never throws, returning `findings` plus an *undefined* `value` on failure.
No new combinator; this exercises the read/validate split.

## Use case

A consumer that wants the typed `Decision` model and treats a malformed document as a hard
failure (e.g. a build step) calls `read()` and lets it throw. A linter that wants to report
every problem without aborting calls `validate()` and walks `findings`. Same contract, same
document, two entry points.

## Sample document

A minimal Decision missing its required `Decision` section — an error-level structure
violation.

```md
---
id: D-9999
status: open/proposed
title: Sample decision for read-vs-validate
related: []
---

## Summary

Short summary. ^summary

## Context

Some context.
```

## Proposed contract

```ts
import { z } from "markdown-contract/zod"; // or: import { z } from "zod"
import { contract, sections, section, optional, maxWords } from "markdown-contract";

const DecisionFrontmatter = z.object({
  id: z.string().regex(/^D-[0-9A-Z]{4}$/),
  status: z.enum(["open/proposed", "open/accepted", "closed/superseded"]),
  title: z.string().min(1),
  related: z.array(z.string()).default([]),
}).strict();

export const DecisionContract = contract({
  frontmatter: DecisionFrontmatter,
  body: sections({ order: "recognized-relative", allowUnknown: true }, [
    section("Summary", { anchor: "summary", content: maxWords(120) }),
    section("Context"),
    section("Decision"),          // required — absent in the FAIL doc
    optional(section("Notes")),
  ]),
});
```

## Expected findings

**PASS** — add a `## Decision` section (`[Summary, Context, Decision]`). Both doors agree:

```ts
const { findings, value } = DecisionContract.validate(source, { path });
// findings: []
// value: { frontmatter: { id: "D-9999", status: "open/proposed", … },
//          body: { summary: SectionView, context: SectionView, decision: SectionView } }

const doc = DecisionContract.read(source, { path }); // does NOT throw
doc.body.decision.name; // "Decision"
```

**FAIL** — the sample document above (`Decision` section absent). The two doors diverge:

```ts
// findings door — never throws; value is undefined on error-level failure
const { findings, value } = DecisionContract.validate(source, { path });
// value === undefined
// findings:
// [ { id: "structure/section-missing", level: "error",
//     pos: { line: 8 },
//     message: "required section ‘Decision’ is missing" } ]

// model door — throws because an error-level finding exists
DecisionContract.read(source, { path }); // throws (carries the same findings)
```

The single Finding `validate` emits:

| id | level | pos.line | message |
|---|---|---|---|
| `structure/section-missing` | `error` | 8 | required section 'Decision' is missing |

(`pos.line` 8 is the `## Summary` heading — the recognized-relative anchor after which the
missing `Decision` was expected; an absent section has no own position, so the finding
localizes to the nearest present sibling. The exact localization rule is a §5.3-class detail.)

## Gaps & questions

The §6 sketch names the two doors and their semantics inline:

```ts
const { findings, doc } = Contract.validate(source, { path }); // findings + model
const doc = Contract.read(source, { path });                   // model only (throws on error-level)
```

but it does not document three things this example must assume:

1. **The thrown type.** §6 says `read` "throws on error-level" but names no error class, and
   gives no way to recover the findings from the caught value (Zod throws a `ZodError` whose
   `.issues` carries the detail; the mirror would be a `ContractError` with `.findings`).
2. **`value` on failure.** §4's `validate` return types `value?` as optional, but does not state
   that it is *undefined* specifically when an error-level finding exists (vs. warn/report-only,
   where a typed value could still be returned). The spec for this case asserts `value` is
   undefined; the API doc does not pin that threshold.
3. **The `validate` key name.** §4/§6 disagree with each other — §4 returns `{ findings, value }`,
   §6 destructures `{ findings, doc }`. Both appear verbatim; a consumer cannot tell which key
   holds the model.

Smallest deltas: add to §4/§6 a `ContractError extends Error { findings: Finding[] }` thrown by
`read`; state "`value` is `undefined` iff `findings` contains a `level: "error"` entry"; and
reconcile the `value`-vs-`doc` key to one name.

Open question for human review: should `read` throw only on `error`, or also escalate `warn`?
And is the recovery path the thrown `ContractError.findings`, or must callers re-run `validate`?
