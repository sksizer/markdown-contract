---
type: task
schema_version: '5'
id: T-FMSP
status: closed/done
created: '2026-06-30'
related:
- '[[T-2HF6-projection-engine]]'
- '[[B-FM20-frontmatter-2-0-api]]'
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
last_reviewed: '2026-07-01'
prs:
- https://github.com/sksizer/markdown-contract/pull/139
completion_note: 'Shipped via #139.'
---
# Frontmatter/body split — a pure splitter retained on the `parse()` result

## Goal

Give consumers **layered access** to a parsed document from a single `parse()`
call: the raw frontmatter/body split, the parsed frontmatter, the structured
sections, and the raw mdast — every layer reachable off one rich object. This task
adds the one missing layer, the **verbatim body** string, via a single pure
splitter that `parse()` uses internally and that consumers can also call standalone.

`parse()` (and the validate / consumption paths that run through it) already split
the frontmatter from the body internally, then discard the body slice. `DocTree`
exposes `frontmatter.raw` / `.data` and the structured `root` / `mdast`, but never
the verbatim body — so a consumer that needs the untouched body (rewrite the
frontmatter and reattach a byte-identical body, or read a YAML head cheaply) has to
re-derive a `---`-fence regex. Retaining the split the parser already computed
removes that duplication and rounds out the layered object.

The splitter stays a **pure, format-agnostic string split** (`{ raw, body }`, no
YAML parse). Parsing the frontmatter to data — and making that format-aware
(YAML / JSON / TOML) — plus a null-free API shape are a larger, deliberate design
captured separately as [[B-FM20-frontmatter-2-0-api]]; they are out of scope here.

## Today

| Location | Role today |
|---|---|
| `packages/core/src/core/projection.ts#parse` | Splits frontmatter from body via `remark-frontmatter`, builds `frontmatter` (`buildFrontmatter`) + the section projection, then returns `DocTree` — **discarding the body slice it just computed** |
| `packages/core/src/core/types.ts#DocTree` | Exposes `frontmatter {raw,data,pos,lineForPath} \| null` + `root: SectionNode` + `mdast` — **no verbatim `body` string**; the body is only available structurally |

Downstream consumers motivating this live in an **external** repo (`sksizer/dev`),
not this codebase, so they are not local touchpoints: `@lib/util/frontmatter`
hand-rolls a `---`-fence regex for exactly this split, and
`markdown_extract.sectionBody` slices verbatim source by hand for the same "the
projection flattens, I need the bytes" reason (see Discovery context).

## Proposed

A single pure splitter, used two ways:

```ts
// the pure splitter — format-agnostic, no YAML parse, no projection
export function splitFrontmatter(md: string): {
  raw: string | null;   // inter-fence YAML text, fences stripped (null = no frontmatter)
  body: string;          // verbatim source after the closing fence (whole doc if none)
};

// DocTree gains the missing layer
interface DocTree {
  frontmatter: { raw: string; data: unknown; pos; lineForPath } | null; // existing (parse path; data + positions)
  body: string;        // NEW — set from splitFrontmatter, verbatim
  root: SectionNode;   // structured (existing)
  mdast: Mdast;        // layer-0 (existing)
}
```

- **One recognizer.** `splitFrontmatter` recognizes the block with
  `micromark-extension-frontmatter` — the same recognizer `remark-frontmatter`
  wraps — so the standalone split agrees with `parse()` by construction, not by a
  regex kept in sync.
- **`parse()` reuses it** for `raw` / `body` and sets `DocTree.body` from the
  result; no second scan. `parse()` still parses the whole document for source
  positions, so its reuse is "call the splitter," not "re-parse only the body."
  The YAML parse (`frontmatter.data`) and positions (`pos` / `lineForPath`) stay on
  the parse path, layered above the split.
- **Pure / cheap.** The standalone splitter does no YAML parse and builds no
  projection — `raw` is the fences-stripped inter-fence text (matching the existing
  `frontmatter.raw`), `body` is the verbatim tail.

Layers on the returned object: **raw split** (`frontmatter.raw` + `body`) →
**parsed** (`frontmatter.data`) → **structured** (`root`) → **layer-0** (`mdast`).

Conventions: no leading block → `raw: null`, `body: <whole doc>`; empty block
(`---\n---`) → `raw: ""`, `body: <rest>`; `body` is always a string (`""` if the
doc ends at the closing fence). `body` is byte-exact (no trim / re-serialize).

## Approach

1. Add `splitFrontmatter(md) => { raw, body }` in `packages/core/src/core/frontmatter.ts`,
   recognizing the block with `micromark-extension-frontmatter`. `raw` =
   fences-stripped inter-fence text (or null); `body` = the verbatim source after
   the closing fence's line terminator (or the whole input when no frontmatter).
2. Have `parse()` call `splitFrontmatter` and set `DocTree.body` from it — reusing
   work it already does, no extra cost. Leave `frontmatter.data` / `pos` /
   `lineForPath` on the existing parse path.
3. Export `splitFrontmatter` from the core barrel and the package-root `index.ts`;
   add `body: string` to the `DocTree` type.
4. Peer unit tests (`packages/core/src/core/frontmatter.test.ts`): no frontmatter, normal doc,
   empty frontmatter block, body byte-preservation (CRLF; a body that itself
   contains `---`); plus a `parse()` test asserting `parse(md).body ===
   splitFrontmatter(md).body` and `(parse(md).frontmatter?.raw ?? null) ===
   splitFrontmatter(md).raw`.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `packages/core/src/core/frontmatter.ts` | new | the pure `splitFrontmatter` splitter (`{ raw, body }`) |
| `packages/core/src/core/frontmatter.test.ts` | new | peer unit test — input→output + body byte-preservation |
| `packages/core/src/core/projection.ts` | modify | `parse()` calls `splitFrontmatter` and sets `DocTree.body` |
| `packages/core/src/core/types.ts` | modify | add `body: string` to `DocTree` |
| `packages/core/src/core/index.ts` | modify | re-export `splitFrontmatter` from the core barrel |
| `packages/core/src/index.ts` | modify | add `splitFrontmatter` to the package-root named re-export list |

## Acceptance criteria

- [ ] AC-1: `splitFrontmatter(md)` is exported from the package root and returns `{ raw: string | null, body: string }` — a pure split: no YAML parse, no section / wikilink projection.
- [ ] AC-2: `DocTree` carries a verbatim `body: string`, and `parse()` uses the same splitter — so `parse(md).body === splitFrontmatter(md).body` and `(parse(md).frontmatter?.raw ?? null) === splitFrontmatter(md).raw` for any input.
- [ ] AC-3: `body` is byte-exact — no frontmatter → `body === md`; otherwise `body` is the verbatim tail (a body containing `---` or CRLF is preserved unchanged), and `"---\n" + raw + "\n---\n" + body` reproduces the source (modulo the exact fence form).
- [ ] AC-4: Recognition matches `parse()` (same `micromark-extension-frontmatter`): only a leading block counts, and `raw`/`body` boundaries agree with the mdast `yaml` node.
- [ ] AC-5: `npm run build`, `npm run test`, `npm run typecheck` are green; the peer test covers the no-frontmatter / present / empty / body-preservation cases.

## Out of scope

- **Parsing the frontmatter to data, and format-awareness (YAML / JSON / TOML), and a null-free API shape** — captured as [[B-FM20-frontmatter-2-0-api]]. This task keeps `splitFrontmatter` a pure, format-agnostic string split; `frontmatter.data` continues to come from the existing parse path.
- The **other verbatim layers** the same philosophy implies — a verbatim `SectionNode` source-slice (consumer: `markdown_extract.sectionBody`, `sksizer/dev` #520) and verbatim table cells `table.rawRows` (consumers: `parseOperationsTable` + the merged `parse-touchpoints`, #518). They extend the same "retain what the parser saw" idea and should be their own tasks.
- Inline-span character offsets within prose / cells (the harder D-0015 / PR #49 gap; consumer: `scan-placeholders` #519).
- Migrating the downstream consumers (the requesting repo's follow-up).

## Dependencies

- none. Extends the frontmatter handling in the projection engine ([[T-2HF6-projection-engine]]); the parsing / format-aware / null-free enhancements are tracked in [[B-FM20-frontmatter-2-0-api]].

## Discovery context

- Surfaced by `sksizer/dev` PR #523 (consolidating 17 private `FRONTMATTER_RE`
  copies). The read half is already on `parse().frontmatter`, but the **verbatim
  body** the read-modify-write sites need is discarded. Maintainer direction
  (2026-06-30): retain the split the parse / validate / consumption paths already
  compute on the returned object (raw split → parsed → structured → mdast), and
  keep the splitter a **pure, format-agnostic string split** for consistency —
  parsing, format-awareness, and a null-free shape are deferred to a deliberate
  2.0 design ([[B-FM20-frontmatter-2-0-api]]). Sibling analysis of `sksizer/dev`
  #518 / #520 confirmed the same "I need the verbatim source the projection
  flattened" theme at the section and table-cell layers. Filed 2026-06-30.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-01. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — `packages/core/src/core/frontmatter.test.ts` "pure { raw, body } split" cases assert `splitFrontmatter` returns `{ raw, body }` from a pure split (the minimal `FRONTMATTER_PROCESSOR` runs no YAML parse and no section/wikilink projection); exported from the package root. Verified by `core:test`.
- AC-2: auto — the "parse() agreement" describe asserts `parse(md).body === splitFrontmatter(md).body` and `(parse(md).frontmatter?.raw ?? null) === splitFrontmatter(md).raw` across 6 inputs; `parse()` reuses the shared `bodyAfterFrontmatter` helper off its own `yamlNode` (no second scan). Verified by `core:test`.
- AC-3: auto — no-frontmatter case asserts `body === md`; the `---`-in-body and CRLF cases assert verbatim preservation; the reconstruction case asserts `"---\n" + raw + "\n---\n" + body === md`. Verified by `core:test`.
- AC-4: auto — recognition matches `parse()` by construction (same `remark-frontmatter`, which wraps `micromark-extension-frontmatter`); the parse()-agreement equalities confirm the `raw`/`body` boundaries coincide with the mdast `yaml` node, and the body-with-`---` case confirms only the leading block counts. Verified by `core:test`.
- AC-5: auto — `bunx moon run core:build core:typecheck core:test` reported `OK 3/3`; the peer test covers the no-frontmatter / present / empty (`---\n---`) / body-preservation cases.

### What worked

- The design was fully de-risked before implementation: an empirical probe of the mdast `yaml` node's `position.end.offset` across all edge cases (no trailing newline, empty block, doc-ends-at-fence, `---`-in-body, CRLF) nailed the exact body-slice algorithm, so the implementation landed in a single pass with zero rework.
- Reusing `remark-frontmatter` (already a direct dep) as the recognizer — rather than reaching for the transitive `micromark-extension-frontmatter` — meant "agrees with `parse()` by construction" required **no** new dependency.
- The baseline-gated quality gate ran green (`OK 3/3`) with zero new drift once the baseline-dir was pointed at the superproject.

### Friction and automation gaps

- Step 3b's permissions probe reported false-positive gaps (`bun`, `Write`, `Edit` "missing") that directly contradicted the live sandbox, where every `bun run`, `Write`, and `Edit` succeeded — forcing a proceed-anyway judgment call. **Already filed** as [[B-PFPB-permissions-probe-false-positive]] (make the probe self-falsifying, or downgrade unconfirmed gaps to a non-blocking note); no new backlog doc created.
- Step 7's documented `sdlc quality run --diff-against-baseline` invocation omits `--baseline-dir`, so from the worktree it looked for the baseline under `<worktree>/.sdlc/quality-baselines/` while Step 3a wrote it to the **main repo's** `.sdlc/quality-baselines/`; the gate aborted with `baseline not found` until `--baseline-dir <main-repo>/.sdlc/quality-baselines` was passed explicitly. **Already filed** as [[B-HVL1-worktree-quality-baseline-dir-resolution]] (make capture and gate agree on one directory in the worktree case); no new backlog doc created.
