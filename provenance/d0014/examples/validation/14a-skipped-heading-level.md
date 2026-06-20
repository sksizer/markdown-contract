> Example 14a for [[D-0014-markdown-structure-validation|D-0014]] — Skipped heading level (H2
> to H4). Exercises the proposed API (proposed-shape.md); non-normative; where they disagree,
> that doc wins.

# 14a · Skipped heading level (H2 to H4)

## Capability

Builds on 14 (`section({ children: sections(...) })` — a recursive nested subsequence keyed by
heading depth). It stresses the projection edge §7 names under S6: a recognized H2 (`## Decision`)
followed immediately by an H4 (`#### Components`), skipping H3. Layer 1 nests `SectionNode.sections`
"by heading depth" (§2), but the depth jump is ambiguous: does the H4 attach as a child of
`Decision`, or does the projection synthesize an intermediate H3 gap so the child grammar sees no
match? The proposed shape does not pin either, and defines no `structure/*` finding id for a
heading-depth jump — so the contract is writable but its behavior on this input is undecided.

## Use case

A nested document class — the Decision family — where `## Decision` owns an `### …` subsection layer
that itself owns content. An author (or a careless formatter) writes the subsection one level too
deep, `####` instead of `###`, skipping H3 entirely. The structure looks right to the eye; the
question is whether the validator nests the orphaned H4 under `Decision` (so the child grammar's
`section("Components")` still matches) or treats the level skip as the failure.

## Sample document

```md
## Decision

We adopt the generic contract library.

#### Components

| # | Component | Resolution |
| - | --------- | ---------- |
| 1 | engine    | markdown-contract |
```

## Proposed contract

```ts
import { contract, sections, section, table } from "markdown-contract";

// Same nested contract as example 14: Decision owns a child subsequence declaring Components (H3).
export const NestedContract = contract({
  body: sections({ order: "recognized-relative", allowUnknown: true }, [
    section("Decision", {
      children: sections({ order: "strict", allowUnknown: true }, [
        section("Components", {
          content: table({ columns: ["#", "Component", "Resolution"], minRows: 1 }),
        }),
      ]),
    }),
  ]),
});
```

## Expected findings

**PASS** — the well-formed instance from 14: `Components` is an H3 nested under the H2 `Decision`,
so it lands in `Decision`'s child subsequence and the table leaf passes.

```md
## Decision

We adopt the generic contract library.

### Components

| # | Component | Resolution |
| - | --------- | ---------- |
| 1 | engine    | markdown-contract |
```

```jsonc
// NestedContract.validate(source, { path: "docs/.../README.md" })
{ "findings": [],
  "value": { "frontmatter": undefined,
             "body": { "decision": { "components": [ /* 1 typed row */ ] } } } }
```

**FAIL** — the Sample document above (`####` Components, skipping H3). The intended finding is a
projection-level depth-jump diagnostic localized to the H4 heading:

```jsonc
// NestedContract.validate(source, { path: "docs/.../README.md" }).findings
[
  { "id": "structure/heading-depth-jump", "level": "error",
    "path": "docs/.../README.md", "pos": { "line": 5 },
    "message": "‘Components’ is H4 under an H2 section; heading depth skips a level (H3)" }
]
```

But `structure/heading-depth-jump` is **invented here** — no finding id, level, or message for a
depth skip appears in proposed-shape.md, and §7 (S6) explicitly defers "heading-depth nesting edge
cases (skipped levels…)". The two undecided behaviors compound: if the projection attaches the H4
under `Decision` (treating any deeper heading as a descendant), the child grammar's
`section("Components")` matches by name and the document passes silently — masking the malformed
level. If the projection instead nests strictly by literal depth, the H4 lands two levels down and
`Components` is *absent* from Decision's immediate children, which would surface as
`structure/section-missing` (a documented id) at a confusing position. Neither outcome is pinned.

## Gaps & questions

The contract is expressible with documented API (it is byte-identical to 14), but the FAIL behavior
on a skipped heading level is undefined — exactly the S6 edge §7 defers.

- **Gap — no projection rule for a heading-depth jump.** §2 says `SectionNode.sections` nests "by
  heading depth" but does not say how a child at `depth > parentDepth + 1` attaches, and §4's
  `Finding` enum has no id for it.
- **Smallest delta** — pin one projection rule and one finding in §2: attach any heading deeper than
  the parent as a direct child (no synthesized intermediate), AND emit a documented
  `structure/heading-depth-jump` (`warn`) carrying the deep heading's `SourcePos`, so the level skip
  is reported without changing which child-grammar position the section fills.
- **Open question** — should a level skip be a hard `error` (reject the doc) or a `warn` that still
  lets the named section match its grammar slot? The Decision family tolerates extra unknowns
  liberally (`recognized-relative`, `allowUnknown: true`), which argues for `warn` + match; a
  stricter house style might prefer `error`. S6 decides.
