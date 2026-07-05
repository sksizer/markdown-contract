---
title: Library API reference
description: Every runtime export of the markdown-contract package — parsing, contract authoring, validation, the corpus runner, and the finding, navigation, and table helpers.
---

The `markdown-contract` package is the TypeScript library behind the [CLI](/reference/cli/). Everything the CLI does — parse a document, run it against a contract, aggregate a corpus — is a call into this surface, and consumers can use the same functions in-process rather than shelling out.

Every export documented here is imported from the package root:

```ts
import { contract, sections, section, table, parse } from "markdown-contract";
```

The package is not yet on npm; build it from source first (see [Getting started](/getting-started/)). Imports flow one way — `cli → runner → core` — and the root barrel re-exports the engine (`core`) and the corpus runner (`runner`); the CLI is deliberately not part of this surface.

:::note
Types (`Contract`, `ContractDef`, `Doc`, `Finding`, `SectionSeq`, `DocTree`, …) are exported alongside the runtime values via `export type *`. This page documents the runtime exports and gives the load-bearing type shapes inline; for the typed consumption model see [the model reference](/reference/model/), and for the exact finding vocabulary see [findings](/reference/findings/).
:::

## Parsing

| Export | Signature | Purpose |
| --- | --- | --- |
| `parse` | `parse(markdown: string, opts?: ParseOptions): DocTree` | Project a markdown string into the layer-1 `DocTree` (nested `SectionNode` tree, flattened `BlockNode`s, position-aware frontmatter, Obsidian anchors/wikilinks). |
| `splitFrontmatter` | `splitFrontmatter(md: string): FrontmatterSplit` | Split a document into its inter-fence YAML text and the verbatim body after the closing fence. |

`ParseOptions` carries a single additive hook, `extensions?: MicromarkExtension[]`, that layers *further* micromark extensions on top of the bundled base set (GFM + anchors + Obsidian) — it does not switch the defaults on or off.

`FrontmatterSplit` is `{ raw: string | null; body: string }`: `raw` is the fences-stripped YAML (`null` when there is no frontmatter), `body` is the source after the closing fence (the whole document when none). The same split feeds `DocTree.frontmatter.raw` and `DocTree.body`.

```ts
const tree = parse("# Title\n\n## Overview\n\nprose.\n");
tree.root.sections;      // top-level H2 SectionNodes
tree.mdast;              // the raw layer-0 mdast Root

splitFrontmatter("---\na: 1\n---\nbody\n");
// { raw: "a: 1", body: "body\n" }
```

## Contract

A contract is the compiled pairing of a frontmatter schema and a body grammar. `contract(def)` compiles it; the resulting `Contract` exposes two doors onto one validation pass.

```ts
function contract<F, B>(def: ContractDef<F, B>): Contract<F, B>;
```

`ContractDef` is the unit you pass in:

| Field | Type | Purpose |
| --- | --- | --- |
| `frontmatter?` | `ZodType<F>` | Per-document Zod schema over the parsed frontmatter (drives the `frontmatter/*` findings). |
| `body?` | `SectionSeq<B>` | The body grammar — the output of `sections(...)` / `strictBody(...)` / `lenientBody(...)`. |
| `rules?` | `DocRule[]` | Cross-plane rules that see both planes of the whole typed doc (from `docRule(...)` / `textRule(...)`). |

The compiled `Contract` has two methods, both taking a `ValidateCtx` — `{ path: string }`, the document's file path, used only to stamp `<path>:<line>` onto findings:

| Method | Signature | Behaviour |
| --- | --- | --- |
| `validate` | `validate(source: string \| DocTree, ctx: ValidateCtx): ValidationResult<F, B>` | The "show me everything" door — never throws. Accepts a source string (parsed with the bundled projection) or a pre-parsed `DocTree` (parse once, validate against several contracts). |
| `read` | `read(source: string, ctx: ValidateCtx): Doc<F, B>` | The "give me the data or fail" door — returns the typed model, or throws `ContractError` when an error-level finding is present. |

`ValidationResult` carries the outcome of one pass:

| Field | Type | Notes |
| --- | --- | --- |
| `findings` | `Finding[]` | Every plane's findings — frontmatter, structure, content, text, rule — merged and deterministically sorted. |
| `doc?` | `Doc<F, B>` | The typed model. Present **iff** no error-level finding; built lazily on first access. |
| `tree` | `DocTree` | The raw projection — always returned, valid or not. |

```ts
const { findings, doc } = myContract.validate(src, { path: "notes/a.md" });
if (doc) {
  // no error-level finding — the typed model is available
}
```

The two doors correspond to the two [validation planes](/examples/validation-planes/) usage patterns: collect findings as data (`validate`) or fail-fast with typed access (`read`).

### ContractError

```ts
class ContractError extends Error {
  readonly findings: Finding[];
}
```

Thrown by `Contract.read()` when validation produces an error-level finding. It carries every error-level `Finding` as data, so a `catch` can inspect exactly what failed.

```ts
import { ContractError } from "markdown-contract";

try {
  const doc = myContract.read(src, { path: "notes/a.md" });
} catch (err) {
  if (err instanceof ContractError) {
    console.error(err.findings); // the error-level findings
  }
}
```

:::note
`contract(...)` and `sections(...)` can also throw a build-time `ContractBuildError` (e.g. `contract/key-collision`, `contract/repeat-bounds`) for a malformed contract *definition*. That class is not part of the exported surface; it is distinct from `ContractError`, which is a document-time failure.
:::

## Structure combinators

These build the body grammar — the ordered content model a document's sections are matched against. They construct inert tagged data; the matcher walks it during validation.

| Export | Signature | Purpose |
| --- | --- | --- |
| `sections` | `sections(opts: LevelOpts, specs: Spec[]): SectionSeq` | Bundle an ordered `Spec[]` into a body grammar under level options. |
| `section` | `section(name: string \| string[], opts?: SectionOpts): SectionSpec` | Declare a required section by heading name (or an alias set). |
| `optional` | `optional(spec: Spec): Spec` | Mark any spec optional. |
| `optionalSection` | `optionalSection(name: string \| string[], opts?: SectionOpts): Spec` | Shorthand for `optional(section(name, opts))`. |
| `oneOf` | `oneOf(names: string[], opts?: SectionOpts): Spec` | A choice over interchangeable heading spellings at one position. |
| `gap` | `gap(opts?: { min?: number; max?: number }): Spec` | Permit a window of unknown sections at this position, optionally bounded. |

`LevelOpts` tunes the level as a whole:

| Field | Type | Meaning |
| --- | --- | --- |
| `order?` | `"none" \| "recognized-relative" \| "strict"` | How declared sections must be ordered. Default `"none"`. |
| `allowUnknown?` | `boolean` | Whether undeclared sections are admitted. Default `true`. |

`SectionOpts` configures a single section slot:

| Field | Type | Meaning |
| --- | --- | --- |
| `optional?` | `boolean` | The slot may be absent. |
| `content?` | `LeafSpec \| Record<string, LeafSpec>` | A single content leaf, or leaves bound by `^anchor`. |
| `children?` | `SectionSeq` | A nested sub-sequence (recursion into subsections). |
| `rules?` | `Rule[]` | Node-local named rules (from `rule(...)` / `requires(...)` / `forbids(...)`). |
| `anchor?` | `string` | Require a `^block-id` in the section. |
| `repeatable?` | `boolean` | The heading may recur as peers; occurrences fill this one slot. |
| `min?` / `max?` | `number` | Occurrence bounds — only meaningful with `repeatable: true`. |

```ts
import { sections, section, optional, oneOf, gap, table, STRICT } from "markdown-contract";

const body = sections(STRICT, [
  section("Overview"),
  section("Fields", { content: table({ columns: ["Name", "Type"] }) }),
  oneOf(["Notes", "Remarks"]),
  optional(section("Appendix")),
  gap({ max: 3 }),
]);
```

The `sections(...)` / `section(...)` / `oneOf(...)` builders run build-time guards: two sibling names that collapse to the same camelCase key throw `contract/key-collision`; `min`/`max` without `repeatable: true` (or `min > max`) throw `contract/repeat-bounds`.

## Content leaves

A content leaf declares both a structural kind-gate (the block kind the section must contain) and the data shape validated over that block.

| Export | Signature | Purpose |
| --- | --- | --- |
| `table` | `table(s: { columns: string[]; anchor?: string; minRows?: number; extraColumns?: "ignore" \| "error"; cells?: Record<string, ZodType> }): LeafSpec` | A GFM table — declared columns, optional row-count floor, per-cell Zod schemas. |
| `list` | `list(s: { ordered?: boolean; everyItem?: "checkbox" \| ZodType; minItems?: number }): LeafSpec` | A list — checkbox gate or per-item Zod schema, optional item-count floor. |
| `code` | `code(s: { lang?: string }): LeafSpec` | A fenced code block, optionally pinned to a language. |
| `maxWords` | `maxWords(n: number): LeafSpec` | A paragraph whose word count must not exceed `n`. |

`table` and `list` are typed generically: a `table({ columns, cells })` whose cells `.transform()` reads back a typed `RowOf<Cols, C>` row (the `z.output` per declared cell), and a `list({ everyItem })` reads back typed `z.output` items — these thread through `read()` into the typed `TableView` / `ListView`. A table with no `cells`, or a `"checkbox"` list, reads back the raw string default. See [the model reference](/reference/model/) for the read-back shapes.

```ts
import { z } from "zod";
import { section, table } from "markdown-contract";

section("Ports", {
  content: table({
    columns: ["Name", "Port"],
    minRows: 1,
    extraColumns: "error",
    cells: { Port: z.coerce.number().int() },
  }),
});
```

Kind and presence are checked by the structure plane (`structure/block-missing`, `structure/block-kind`); the leaf's data checks (`content/*`) run only when a block of the expected kind is present, so a wrong-kind block is never double-reported.

## Rules

Named rules run custom predicates and mint findings under a contract-chosen namespace. A per-node `Rule` goes in a section's `rules:` slot; a cross-plane `DocRule` goes in the contract's top-level `rules:`.

| Export | Signature | Purpose |
| --- | --- | --- |
| `rule` | `rule(id: string, fn: (node: SectionNode, ctx: Ctx) => Finding[]): Rule` | A node-local rule, run on its bound section. |
| `docRule` | `docRule<F>(id: string, fn: (doc: Doc<F>, ctx: Ctx, tree: DocTree) => Finding[]): DocRule` | A cross-plane / cross-file rule over the whole typed doc (also given the projected `tree`). |
| `textRule` | `textRule(spec: { requires?: TextMatchSpec[]; forbids?: TextMatchSpec[] }): DocRule` | Whole-document required / forbidden phrase checks (emits `text/doc`). |
| `requires` | `requires(specs: TextMatchSpec[]): Rule` | A section-scoped rule requiring each phrase to be present (emits `text/requires`). |
| `forbids` | `forbids(specs: TextMatchSpec[]): Rule` | A section-scoped rule forbidding each phrase (emits `text/forbids`). |

`requires` / `forbids` / `textRule` are the TypeScript authoring surface for declarative text constraints (D-0011). Each `TextMatchSpec` supplies exactly one of `pattern` (a literal substring) or `regex` (a regex source), with optional `normalize` / `ignoreCase`, `min` / `max` count bounds, and `id` / `note` / `level`. A `requires` entry whose bound expresses absence (`max: 0`, or `max` below the effective minimum) is rejected at construction — use `forbids` for an absence check.

```ts
import { docRule, requires, forbids } from "markdown-contract";

const noTBD = docRule("policy/no-tbd", (doc, ctx, tree) => {
  // return Finding[] — mint via ctx.finding(...)
  return [];
});

section("Summary", {
  rules: [requires([{ pattern: "Owner:" }]), forbids([{ regex: "TODO|FIXME" }])],
});
```

:::caution[Planned]
The **declarative-YAML** `requires:` / `forbids:` keys that compile to these builders (C-0009 / D-0011) are not yet wired through the YAML front-end. The library builders above ship and work today; the YAML surface that would author them is covered on the [YAML reference](/reference/yaml/).
:::

## Presets

Contract-authoring shorthands for the two `LevelOpts` combinations that recur across schemas.

| Export | Value / signature | Purpose |
| --- | --- | --- |
| `STRICT` | `{ order: "strict", allowUnknown: false }` | Strict order, no unknown sections. |
| `LENIENT` | `{ order: "none", allowUnknown: true }` | Unordered body, unknown sections allowed. |
| `strictBody` | `strictBody(specs: Spec[]): SectionSeq` | `sections(STRICT, specs)`. |
| `lenientBody` | `lenientBody(specs: Spec[]): SectionSeq` | `sections(LENIENT, specs)`. |

```ts
import { strictBody, section } from "markdown-contract";

const body = strictBody([section("Overview"), section("Details")]);
```

## Corpus runner

The corpus runner takes a config (globs → contracts) and a document tree and returns aggregated findings plus a CI-meaningful exit code. It reads files and returns data; it never owns `process.exit`.

| Export | Signature | Purpose |
| --- | --- | --- |
| `defineConfig` | `defineConfig(config: CorpusConfig): CorpusConfig` | Identity helper that attaches the `CorpusConfig` type to a config literal (for completion / checking). |
| `runCorpus` | `runCorpus(config, opts?): { findings: Finding[]; exitCode: number; stats: RunStats }` | Walk a tree, route each file to its first matching rule's contract, and aggregate findings. |
| `CorpusConfig` | *(type)* | `{ rules: Array<{ include: string[]; exclude?: string[]; contract: Contract; name?: string }> }` |

`runCorpus`'s `opts` accepts `{ format?: "human" \| "json" \| "sarif"; cwd?: string; include?: string[]; exclude?: string[] }`. It walks every file under `cwd` (default `process.cwd()`), applies an optional global `include` / `exclude` pre-filter (AND-narrowing), and validates each file against the **first** rule whose `include` matches and `exclude` does not — first-match keeps the run deterministic and lets a specific rule sit ahead of a catch-all.

The returned `stats` object reports `filesScanned`, `filesMatched`, `filesUnmatched`, and `matchedByRule` (a count per rule, parallel to `config.rules` by index). `exitCode` is `0` when no error-level finding exists across the corpus and `1` when any is present; `2` is reserved for usage/config errors and is layered on by the CLI, never returned here.

```ts
import { defineConfig, runCorpus, contract } from "markdown-contract";

const config = defineConfig({
  rules: [{ include: ["**/*.md"], contract: myContract, name: "notes" }],
});

const { findings, exitCode, stats } = runCorpus(config, { cwd: "docs" });
process.exit(exitCode);
```

See [embed & CI](/examples/embed-and-ci/) for wiring `runCorpus` into a pipeline.

## Finding helpers

Pure presentation and selection helpers over `Finding[]`. A `Finding` carries `id`, `level` (`"error" \| "warn" \| "report"`), `path`, an optional `pos` (`{ line, col? }`), and `message`.

| Export | Signature | Purpose |
| --- | --- | --- |
| `formatFinding` | `formatFinding(f: Finding, opts?: { style?: "line" \| "full" }): string` | One-line rendering — `[id] (location): message`. `"full"` (default) always carries a location token (`line N`, or `<root>` when the finding has no position); `"line"` renders ` (line N)` only when the finding is position-pinned and omits it otherwise. Neither style includes the path. |
| `findingLocation` | `findingLocation(f: Finding, opts?: { root?: string; withPath?: boolean }): string` | The location token — `path:line` (only under `withPath`), `line N`, or the `<root>` fallback. |
| `filterFindings` | `filterFindings(findings: Finding[], sel: { area?: string; ids?: Iterable<string> }): Finding[]` | Select by finding area (e.g. `"frontmatter"`) and/or an explicit id set (intersection when both). |
| `countByLevel` | `countByLevel(findings: Finding[]): { error: number; warn: number; report: number }` | Tally findings by level. |
| `hasErrors` | `hasErrors(findings: Finding[]): boolean` | True iff any finding is error-level — the exit-nonzero gate. |

```ts
import { filterFindings, hasErrors, formatFinding } from "markdown-contract";

const fm = filterFindings(findings, { area: "frontmatter" });
if (hasErrors(findings)) {
  for (const f of findings) console.error(formatFinding(f));
}
```

## Navigation & table helpers

Standalone helpers over the projected tree — the section-finding and raw-cell glue consumers would otherwise hand-roll on `DocTree.root`. Pure functions; nothing here mutates the tree.

| Export | Signature | Purpose |
| --- | --- | --- |
| `findSection` | `findSection(root: SectionNode, name: string \| string[], opts?: { depth?: number; ci?: boolean }): SectionNode \| undefined` | The first top-level section matching a name (or alias set), optionally pinned to a depth or matched case-insensitively. |
| `sectionsAt` | `sectionsAt(root: SectionNode, depth: number): SectionNode[]` | The top-level sections at a given heading depth. |
| `sectionForLine` | `sectionForLine(root: SectionNode, line: number, opts?: { depth?: number }): SectionNode \| undefined` | The section enclosing a source line (last heading at or before it). |
| `sectionSpans` | `sectionSpans(root: SectionNode, lineCount: number, opts?: { depth?: number }): SectionSpan[]` | Each section paired with its 1-indexed body line extent. |
| `blocksOfKind` | `blocksOfKind<K>(section: SectionNode, kind: K, opts?: { recursive?: boolean }): Array<Extract<BlockNode, { kind: K }>>` | A section's blocks of a given kind, optionally descending subsections. |
| `rawTableRow` | `rawTableRow(table: TableBlock, source: string \| string[], i: number): string[]` | The literal, unpadded cell array for one data row, re-split from source (preserves inline markup the projection flattens). |
| `rawTableRows` | `rawTableRows(table: TableBlock, source: string \| string[], opts?: { pad?: "header" \| number }): { header: string[]; rows: string[][] }` | Re-split the header and every data row from source, optionally padded to a fixed width. |
| `codeBlockLines` | `codeBlockLines(tree: DocTree): Set<number>` | Every 1-indexed source line occupied by a fenced code block (including code nested in lists / blockquotes). |
| `tableRowLines` | `tableRowLines(root: SectionNode): Set<number>` | Every table row line (header plus each data row), recursive over the section tree. |

Here `TableBlock` is the table arm of the projection's block union — `Extract<BlockNode, { kind: "table" }>` — the value `blocksOfKind(section, "table")` returns.

```ts
import { findSection, blocksOfKind, rawTableRows } from "markdown-contract";

const ports = findSection(tree.root, "Ports", { depth: 2 });
const [tbl] = ports ? blocksOfKind(ports, "table") : [];
if (tbl) {
  const { header, rows } = rawTableRows(tbl, src, { pad: "header" });
}
```

:::note
The Obsidian dialect harvest helpers (e.g. `extractVaultRefs`) are internal — they stop at the `core/dialect` barrel and are **not** re-exported at the package root. See [the dialect reference](/reference/dialect/) for what the projection exposes on the tree instead.
:::

## VERSION

```ts
const VERSION: "0.0.0";
```

The package version string. Still `0.0.0` — the package is pre-release and built from source, not yet published to npm.

## The typed model

`Contract.read()` (and `ValidationResult.doc`) return a typed `Doc<F, B>` — the out-of-model view with `frontmatter`, a dual-key `body`, and typed `SectionView` / `TableView` / `ListView` accessors over the validated document. That surface is documented separately.

- [Model reference](/reference/model/) — `Doc`, `SectionView`, `TableView`, `ListView`, and the read-back types.
- [YAML reference](/reference/yaml/) — the declarative front-end, at parity with the combinators above.
- [Findings reference](/reference/findings/) — the full `id → level → trigger` catalog.
- [Glossary](/reference/glossary/) — plane, leaf, gap, dual-key, and the other terms used here.
