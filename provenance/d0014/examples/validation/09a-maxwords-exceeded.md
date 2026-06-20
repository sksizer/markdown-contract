> Example 09a for [[D-0014-markdown-structure-validation|D-0014]] — maxWords exceeded.
> Exercises the proposed API (proposed-shape.md); non-normative; where they disagree, that doc
> wins.

# 09a · maxWords exceeded

## Capability

Edge case on **09** (`section({ content: maxWords(n), anchor: "id" })` — a content leaf plus a
required block-id). 09 shows a Summary that fits the word budget and carries its `^summary`
anchor. 09a stresses the **content leaf failing while the anchor check passes**: the prose
overruns the 120-word budget, so `maxWords(120)` — a Zod schema compiled over the projected
section node — must emit a content finding, while the independent `anchor: "summary"` check
stays green. No new API surface — the same one-section contract as 09 — just the leaf-failure
variant. It isolates the content plane (Zod over the projection) from the structure plane
(anchor presence) within a single `section` spec.

## Use case

A markdown class that mandates a single `## Summary` section which must (a) carry a `^summary`
block-id and (b) stay under a word budget — a TL;DR that is allowed to exist but not to sprawl.
The author ships a Summary that is correctly anchored but far too long. The contract must flag
the over-budget prose and localize the diagnostic to the Summary section, without raising any
anchor finding.

## Sample document

```md
# Release brief

## Summary

This release consolidates the long-running migration work that has spanned the previous three
iterations, retiring the legacy line scanners, the duplicated frontmatter slicers, and the
hand-maintained alias tables that had accumulated across the entity package over many releases.
It introduces the combinator grammar as the single substrate for all structure validation, moves
every content assertion onto typed Zod leaves projected over positioned nodes, and unifies the
frontmatter and body planes behind one validation pass so that consumers receive a single ordered
findings list instead of three disjoint ones. Downstream tooling no longer reconstructs section
containment by hand, because the projection now hands back a fully positioned section tree, and the
typed object model exposes that same tree as navigable, column-typed views with source positions
preserved end to end.
^summary
```

## Proposed contract

```ts
import { contract, sections, section, maxWords } from "markdown-contract";

// Same contract as 09: one required Summary, anchored, with a 120-word budget.
export const SummaryContract = contract({
  body: sections({ order: "none", allowUnknown: true }, [
    section("Summary", { anchor: "summary", content: maxWords(120) }),
  ]),
});
```

## Expected findings

**PASS** — a Summary that is anchored and under budget:

```md
# Release brief

## Summary

This release retires the legacy line scanners, the duplicated frontmatter slicers, and the
alias tables, replacing them with one combinator grammar over a positioned projection.
^summary
```

```ts
const { findings, value } = SummaryContract.validate(source, { path });
// findings === []
// value === { frontmatter: undefined, body: { summary: { /* SectionView */ } } }
```

A consumer reads the section and its anchor through the typed OOM facade:

```ts
value.body.summary.text();           // "This release retires …"
value.body.summary.anchors;          // ["summary"]
value.body["Summary"];               // same SectionView (exact key)
```

**FAIL** — the sample document above (correctly anchored, but the prose runs to 128 words):

```ts
SummaryContract.validate(source, { path: "docs/release/brief.md" }).findings;
```

```jsonc
[
  { "id": "content/max-words", "level": "error",
    "path": "docs/release/brief.md", "pos": { "line": 5 },
    "message": "Summary section exceeds the 120-word budget (128 words)" }
]
```

Exactly one finding. `pos.line` points at line 5 — the Summary section's content, the node the
`maxWords(120)` leaf was applied to. The `anchor: "summary"` requirement is satisfied (the
`^summary` block-id is present), so **no** `structure/anchor-missing` finding fires: the two
checks on the one `section` spec are independent, and only the content leaf failed. Level is
`error`: contract data, not a call-site choice.

## Gaps & questions

The contract and OOM access use only documented API. The leaf-failure **finding id** is
under-specified by proposed-shape.md rather than contradicted, so it reads as an open question:

- **The finding id for a content-leaf (Zod) failure is not enumerated.** The §5.3 walkthrough
  names `frontmatter/enum` for a *frontmatter*-plane Zod failure, but no example shows a *body*
  content leaf failing, and §3 says each leaf "compiles to a Zod schema over a projected node"
  without pinning the id that surfaces. `content/max-words` mirrors the `frontmatter/enum`
  shape and the `structure/*` namespace convention, but is inferred, not documented. A blanket
  `content/zod` id (carrying the raw Zod issue message) would be the alternative.
  - Proposed delta: add a finding-id row pinning the canonical id for each content leaf —
    `content/max-words` for `maxWords`, with the budget and actual count in the message — or, if
    a single id is preferred, document `content/zod` as the umbrella id for every leaf failure
    and define how the leaf's Zod issue maps onto the node's `pos.line`.
  - Open question for human review: should each leaf get its own namespaced id
    (`content/max-words`, `content/min-rows`, `content/lang-mismatch`, …) for machine-routable
    diagnostics, or one `content/zod` id that defers wording to the underlying Zod issue? This
    couples to S7's open question on how Zod `issues[].path` remaps onto the projection node.
