> Example 13a for [[D-0014-markdown-structure-validation|D-0014]] — Code block wrong/absent
> language. Exercises the proposed API (proposed-shape.md); non-normative; where they
> disagree, that doc wins.

# 13a · Code block wrong/absent language

## Capability

Builds on **13** (code leaf: `code({ lang })`). Same code contract; this edge stresses the
*failure*: a section's fenced code block carries the wrong info-string language (or none), so the
`code` leaf — which compiles to Zod over the projected `code` node's `lang` — rejects it. The
projection exposes `lang: string | null` (§2, layer 1), so both a mismatched tag (`python`) and an
untagged fence (`null`) are the same failure shape. No new API surface — it exercises how the
declared `lang` turns into one localized finding at the fence's source line.

## Use case

A docs page whose `## Example` section must carry a TypeScript snippet — the house style for this
doc family is that runnable examples are tagged `ts` so they render and lint consistently. An author
pastes a `python` snippet (or forgets the info-string entirely). The contract should flag the fence,
point the diagnostic at its opening line, and name the expected language.

## Sample document

```md
## Example

```python
const contract = defineContract();
```

```text

## Proposed contract

```ts
import { contract, sections, section, code } from "markdown-contract";

export const ExampleContract = contract({
  body: sections({}, [
    section("Example", { content: code({ lang: "ts" }) }),
  ]),
});
```

## Expected findings

**PASS** — retag the fence ` ```ts `. The `Example` section projects to a single `code` block with
`lang: "ts"`; the `code({ lang: "ts" })` leaf accepts it.

```jsonc
// ExampleContract.validate(source, { path: "docs/.../page.md" })
{
  "findings": [],
  "value": {
    "frontmatter": undefined,
    // example is a SectionView; its sole code block has lang === "ts"
    "body": { "example": { "name": "Example" } }
  }
}
```

A consumer reads the section's content via the `SectionView` (§6) — the fenced block is available as
the section's lone block, its `lang` already validated to `"ts"`.

**FAIL** — the sample document above (the fence is tagged `python`). The projected `code` block has
`lang: "python"`, which the `lang: "ts"` leaf rejects; one finding fires at the fence's opening line
(line 3):

```jsonc
// ExampleContract.validate(source, { path: "docs/.../page.md" }).findings
[
  { "id": "content/code-lang", "level": "error",
    "path": "docs/.../page.md", "pos": { "line": 3 },
    "message": "code block: expected language ts, received ‘python’" }
]
```

An untagged fence projects to `lang: null` (§2) and produces the same finding with
`received ‘none’` (or equivalent) at the fence line — the absent-language variant of the spec.

## Gaps & questions

The contract is **fully expressible** — `code({ lang: "ts" })` is verbatim the §3 leaf signature
(`function code(s: { lang?: string }): ZodType`). The same two unpinned details as the other
content-leaf edges apply:

- **Finding id namespace for content-leaf Zod failures is unspecified.** The doc names
  `frontmatter/enum` (§5.3) and the `structure/*` grammar ids, but never an id for a `table`/`list`/
  `code` leaf Zod rejection. I used `content/code-lang` above as the natural sibling of
  `frontmatter/enum`; the doc could equally justify `code/lang-mismatch`.
  - *Smallest delta:* state the leaf-failure id convention in §3 / §4 — e.g. "leaf Zod failures emit
    `content/<leaf>-<issue>`, parallel to `frontmatter/<code>`".
  - *Open question:* one flat `content/*` namespace, or per-leaf (`table/*`, `list/*`, `code/*`)?
- **Absent vs mismatched language is one id but two messages.** The spec covers both a `python` tag
  and an untagged fence; the projection collapses them to `lang: "python"` vs `lang: null`. Whether
  these warrant distinct messages (or even distinct levels — an untagged fence might be a `warn`) is
  not pinned down.
  - *Smallest delta:* note in §3 that `code({ lang })` rejects `lang: null` and any non-matching tag
    alike, with the `received` value rendered as the literal tag or `none`.
  - *Open question:* should an absent info-string be a softer `warn` than an actively wrong one,
    given `level` is contract data (§4) not a call-site choice?
