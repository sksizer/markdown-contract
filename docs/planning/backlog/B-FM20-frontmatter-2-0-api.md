---
type: backlog
schema_version: '1'
id: B-FM20
last_reviewed: '2026-06-30'
tags:
- engine
- frontmatter
- api
- dx
---
# A 2.0 frontmatter API: format-aware parsing and a null-free shape

[[T-FMSP-frontmatter-split-primitive]] lands a deliberately minimal v1:
`splitFrontmatter(md) => { raw: string | null, body: string }` — a pure,
format-agnostic string split — plus a verbatim `DocTree.body`. Parsing the
frontmatter to data, and the ergonomics around it, are intentionally left for a
considered 2.0 so the v1 primitive stays single-responsibility. This item collects
the 2.0 enhancements.

## 1. A format-aware `getFrontmatter`

A companion that parses the split `raw` into data, aware of the fence format. YAML
is the default and overwhelmingly common; `remark-frontmatter` already supports
`toml`, and JSON frontmatter exists in the wild — both far rarer. Shape sketch:

```ts
getFrontmatter(md): {
  format: "yaml" | "toml" | "json" | null;
  data: unknown;
  raw: string | null;
  body: string;
};
```

The YAML / TOML / JSON parsing lives here, keeping `splitFrontmatter` itself
parser-free.

## 2. A null-free API shape

v1 returns `raw: string | null` and `parse().frontmatter: {...} | null`, which
pushes a null-check onto every consumer. A 2.0 could avoid the null — options to
weigh at the call site:

- a `present: boolean` (or `hasFrontmatter`) discriminant with `raw: ""` when absent;
- a discriminated union (`{ kind: "none" } | { kind: "yaml"; raw; data }`);
- always-present fields with empty defaults.

## 3. Consider folding in the rich split

If `getFrontmatter` lands, decide whether the parsed `{ raw, data, body }`
convenience belongs there (vs. only on `DocTree.frontmatter`), so there is one
obvious way to get parsed frontmatter standalone.

## Idea

Ship v1 ([[T-FMSP-frontmatter-split-primitive]]) now; design 2.0 as a unit so
format-awareness, parsing, and null-free ergonomics are decided together rather
than bolted on piecemeal.

## Out of scope for this capture

- The exact null-free shape (to design).
- Whether the non-YAML formats are worth supporting at all, given their rarity
  (decide during the 2.0 design).
