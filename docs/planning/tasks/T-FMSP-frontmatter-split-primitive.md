---
type: task
schema_version: "5"
id: T-FMSP
status: planning/proposed
created: 2026-06-30
related:
  - "[[T-2HF6-projection-engine]]"
depends_on: []
tags:
  - engine
  - frontmatter
  - api
  - dx
need_human_review: false
impact: medium
complexity: small
autonomy: supervised
last_reviewed: 2026-06-30
---
# Frontmatter split primitive — cheap, projection-free `splitFrontmatter`

## Goal

Expose a public, projection-free way to split a markdown document into its raw
frontmatter, parsed frontmatter data, and **verbatim body** — so consumers stop
re-deriving a `---`-fence regex, and so read-modify-write callers can rewrite a
frontmatter block and reattach it to a byte-identical body.

Today the library parses frontmatter internally but only surfaces it through the
full `parse()` projection, and never returns the body as a string. A consumer that
just wants the frontmatter (or the frontmatter plus the untouched body) must either
run the whole remark + section pipeline to read a YAML head, or hand-roll its own
fence regex.

## Today

| Location | Role today |
|---|---|
| `src/core/projection.ts:332` (`buildFrontmatter`) | Already computes `{ raw, data, pos, lineForPath }` from the mdast `yaml` node (`raw` = inter-fence YAML, `data` = `parseDocument(raw)`) — but it is only reachable through `parse()` |
| `src/core/projection.ts:417` (`parse`) | The only public entry that touches frontmatter; runs `remark-parse` + `remark-gfm` + `remark-frontmatter` (`:407`) **plus** the section projection, then returns a `DocTree` |
| `src/core/types.ts:58` (`DocTree`) | Exposes `frontmatter` + `root: SectionNode` + `mdast` — there is **no verbatim `body` string**; the body is only available structurally |

## Proposed

A standalone `splitFrontmatter(md)` in `core`, exported from the package root:

```ts
export function splitFrontmatter(md: string): {
  raw: string | null;   // inter-fence YAML, fences stripped (null = no frontmatter)
  data: unknown;         // parseDocument(raw) result; undefined when raw === null
  body: string;          // verbatim bytes after the closing fence (whole doc if none)
};
```

- **Projection-free** — it must not build the section tree / wikilink dialect; the
  cost of reading a YAML head should be a frontmatter tokenize, not a full parse.
- **One definition of frontmatter** — it uses the same `remark-frontmatter`
  recognition as `parse()`, so a document `parse()` sees as having frontmatter
  splits the same way (and vice versa).
- **Unopinionated `data`** — `data` stays raw `unknown`. The "empty → `{}`,
  non-mapping → null, parse-error → null" normalization is consumer policy, kept
  out of the library.
- **Byte-exact `body`** — the body is the verbatim bytes after the closing fence
  and its line terminator; no trimming or re-serialization.

## Approach

1. Add `splitFrontmatter` in `core` (e.g. `src/core/frontmatter.ts`), re-exported
   from the `core` barrel and the package-root `index.ts` named-export list.
2. Recognize frontmatter the same way `parse()` does. Cheapest path: a micromark
   frontmatter-only tokenize. Acceptable alternative: factor the existing
   `yaml`-node + position handling out of the `parse()` path so the body slice
   (`md.slice` past the `yaml` node's end + its newline) is reusable without
   building `root`.
3. Compute `raw` / `data` exactly as `buildFrontmatter` does today, and `body` as
   the verbatim tail.
4. Peer unit test (`src/core/frontmatter.test.ts`) leading with plain input→output
   cases: no frontmatter, a normal doc, an empty frontmatter block, and a body
   byte-preservation case (CRLF, and a body that itself contains `---`).

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/core/frontmatter.ts` | new | the `splitFrontmatter` primitive |
| `src/core/frontmatter.test.ts` | new | peer unit test — input→output + body byte-preservation |
| `src/core/index.ts` | modify | re-export `splitFrontmatter` from the core barrel |
| `src/index.ts` | modify | add `splitFrontmatter` to the package-root named re-export list |

## Acceptance criteria

- [ ] AC-1: `splitFrontmatter(md)` is exported from the package root and returns `{ raw, data, body }` with the shape above.
- [ ] AC-2: Frontmatter recognition matches `parse()` — for any input, `splitFrontmatter(md).raw === (parse(md).frontmatter?.raw ?? null)`.
- [ ] AC-3: `body` is byte-exact — when there is no frontmatter `body === md`; otherwise the returned `body` is the verbatim tail (a body containing `---` or CRLF is preserved unchanged).
- [ ] AC-4: It does not build the section / wikilink projection (verifiable: it works and is covered without touching `DocTree.root`).
- [ ] AC-5: `npm run build`, `npm run test`, `npm run typecheck` are green; the peer test covers the no-frontmatter / present / empty / body-preservation cases.

## Out of scope

- Changing `parse()` / `DocTree`, or adding a `body` string to `DocTree` — this is a separate, additive primitive.
- Typed `data` (it stays `unknown`) and the empty / non-mapping normalization — those remain consumer-side policy.
- Migrating the downstream consumers (that is the requesting repo's follow-up).

## Dependencies

- none. Extends the frontmatter handling introduced with the projection engine ([[T-2HF6-projection-engine]]).

## Discovery context

- Surfaced by `sksizer/dev` PR #523, which consolidated 17 private `FRONTMATTER_RE`
  copies onto one shared helper. Review comments on `start_task.ts` and
  `dedup_search.ts` asked whether the frontmatter split could come from
  markdown-contract instead. It can for the read half (`parse().frontmatter`), but
  that runs the full projection, and the **verbatim body** the read-modify-write
  sites need is not exposed at all — hence this primitive. Filed 2026-06-30.
