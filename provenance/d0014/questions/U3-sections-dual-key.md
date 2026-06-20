> Question U3 for [[D-0014-markdown-structure-validation|D-0014]] — is `SectionView.sections`
> dual-keyed like `doc.body`? Part of the consumption-API review (Phase U in
> ../review-checklist.md). Non-normative; records the decision, folded into
> [proposed-shape.md](../proposed-shape.md) §6.

# U3 · SectionView.sections dual-key

**Surfaced by:** [[08-nested-subsections|c08]].

## The question

§6 types `SectionView.sections` as `Record<string, SectionView>`, but a comment says "same dual-key
access." So is `doc.body.X.sections` reachable by exact-bracket **and** lowerCamelCase **and**
`.section()` (like `doc.body`), or only a plain string record?

## Recommendation — dual-keyed, recursively (same shape as `doc.body`)

`doc.body` *is* the root section's `sections`; a nested section's `sections` is the same kind of
thing. So they get the **same** access, recursively — no idiom-switch by depth:

```ts
doc.body.postMortem.sections.whatWorked            // dotted camelCase
doc.body.postMortem.sections["What worked"]        // exact heading
doc.body.postMortem.sections.section("What worked") // accessor (dynamic/edge names)
```

Fix the §6 type: `sections` is **not** a plain `Record<string, SectionView>` but the generated
dual-key shape (typed keys for declared children, both keying styles, a `.section()` accessor, and
an `unknown[]` for gap-admitted children — U5). The F4 collision guarantees apply per sibling level.

## Decision

**Resolved (2026-06-20).** Yes — `doc.body.X.sections` is the **same dual-key shape as `doc.body`**,
recursively: typed keys for declared children + exact-bracket + lowerCamelCase + `.section()`
accessor + `unknown[]` (U5). §6's `Record<string, SectionView>` type is corrected to that generated
shape; F4 collision guarantees apply per sibling level. Folds into proposed-shape.md §6.
