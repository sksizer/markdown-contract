> Example 05 for [[D-0016-per-node-source-fidelity|D-0016]] — document-depth raw: the frontmatter
> body split. Non-normative; the decision wins.

# 05 · Document body — frontmatter read-modify-write

## Affordance

At document depth the raw view is the **verbatim body after the frontmatter block**. `parse(md).body`
returns it; `splitFrontmatter(md)` returns it without building a projection. The parser already
splits frontmatter from body internally (`remark-frontmatter`); this exposes the byte-exact tail it
otherwise discards, so a consumer can rewrite the frontmatter and reattach a **byte-identical** body.

## Input

```md
---
id: T-1234
status: open/ready
---
# Add the splitter

Intro paragraph.

---

A section after a thematic break. The `---` above is body content, not frontmatter.
```

## Consumer code

```ts
import { splitFrontmatter } from "markdown-contract";
import { parse as parseYaml, stringify as dumpYaml } from "yaml";

// read — pure split, no projection built
const { raw, body } = splitFrontmatter(source);
//    raw  === "id: T-1234\nstatus: open/ready"   (inter-fence YAML, fences stripped)
//    body === "# Add the splitter\n\nIntro paragraph.\n\n---\n\nA section after a thematic break. …"

const fm = raw === null ? {} : (parseYaml(raw) as Record<string, unknown>);

// modify
fm.status = "in-progress";

// write — reattach the untouched body byte-for-byte
const next = `---\n${dumpYaml(fm).trimEnd()}\n---\n${body}`;
```

The `---` thematic break inside the body is left alone — only the *leading* block is frontmatter, so
`body` keeps it verbatim. The same two values are also on the parsed tree:

```ts
const tree = parse(source);
tree.body;                 // === splitFrontmatter(source).body
tree.frontmatter?.raw;     // === splitFrontmatter(source).raw
tree.raw();                // === source   (document node's raw view is the whole input)
```

## Why it matters

This is the coarsest instance of the model. Today a consumer that rewrites frontmatter hand-rolls a
`^---\n([\s\S]*?)\n---\n` regex — there were 17 copies of it across the `sdlc`/`dev` corpus before
PR #523 consolidated them — precisely because the body is unreachable from `parse()`. Exposing `body`
deletes that regex. Every finer example below is the same move at a smaller granularity.

## Notes

- `splitFrontmatter` is the projection-free door (the frontmatter-split proposal, T-FMSP): a caller
  that only wants the head/body pays for a frontmatter tokenize, not a full parse.
- Consumed by: every read-modify-write caller (frontmatter status flips, `prs:` appends, migrations).
