> Example 13 for [[D-0014-markdown-structure-validation|D-0014]] — Code leaf: language.
> Exercises the proposed API (proposed-shape.md); non-normative; where they disagree, that doc
> wins.

# 13 · Code leaf: language

## Capability

The `code({ lang })` content leaf — a new `leaves.ts` helper alongside `table`/`list`/`maxWords`.
It compiles to a Zod schema over a projected `code` BlockNode (`{ kind: "code"; lang: string | null;
value: string }`) and asserts the fenced block's info-string language matches the declared `lang`.
The match is on the projected `lang` field — the token after the opening fence (` ```ts `).

## Use case

A document class whose section must carry a code sample in a specific language: a how-to or spec
page with an `## Example` block that must be tagged `ts`, so renderers highlight it correctly and
tooling can extract and type-check it. The contract pins the fence language, not just its presence.

## Sample document

```md
## Example

```ts
const greet = (name: string): string => `hello, ${name}`;
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

**PASS** — the sample above. The `## Example` heading projects to a `SectionNode` named `"Example"`
holding one `code` BlockNode with `lang === "ts"`. The leaf's declared `lang: "ts"` matches, so the
content assertion is satisfied.

```jsonc
// ExampleContract.validate(source, { path: "docs/.../README.md" })
{
  "findings": [],
  "value": {
    "frontmatter": undefined,
    "body": { "example": {} }   // SectionView; the sole code block under .blocks, lang "ts"
  }
}
```

**FAIL** — mutate the fence to tag the block `js` instead of `ts`:

```md
## Example

```js
const greet = (name) => `hello, ${name}`;
```

```text

The projected `code` BlockNode now has `lang === "js"`, which does not match the declared `lang:
"ts"`, so the content leaf fails:

```jsonc
// ExampleContract.validate(source, { path: "docs/.../README.md" }).findings
[
  { "id": "content/code-lang", "level": "error",
    "path": "docs/.../README.md", "pos": { "line": 3 },
    "message": "code block language ‘js’ does not match required ‘ts’" }
]
```

## Gaps & questions

The leaf shape `code({ lang })` and the projected `code` BlockNode are both documented, so the
contract is expressible. Two finer points are under-specified rather than missing:

- proposed-shape.md never names the finding `id` a `code` leaf emits (contrast the explicit
  `structure/*` ids in §5.3). `content/code-lang` above is inferred from the `content/*` namespacing
  pattern; the exact id is unstated.
- §5.3 finding messages and ids are listed only for `structure/*`; the `content/*` namespace is
  implied by the `frontmatter/`+`structure/` examples but no `content/` finding is shown.
