> Design appendix for [[D-0014-markdown-structure-validation|D-0014]] — the proposed *shape* of the
> validation library: package structure, public API surface, and syntax examples. Forward-looking
> and **non-normative** — the exact surface is finalised by spikes S6/S7 (D-0014 Open questions).
> Where this and D-0014 disagree, D-0014 is authoritative. Incorporates the resolved open-decision
> review (Phases A–G **and U**, the consumption review; see
> [review-checklist.md](review-checklist.md) and [questions/](questions/)) — inline tags like (F3),
> (G1), (U2) point to the decision that shaped a line.

# Proposed shape — markdown structure validation library

This sketches *how* the D-0014 decision is built, concretely enough to react to: where the code
lives, what the public API looks like, and what an author actually writes. It does not re-argue the
decision (see [README.md](README.md)); it makes Component 3 ("contract split", authored in
TypeScript with a combinator grammar + Zod leaves) tangible.

## 1. Layering — a generic package, consumed by SDLC

The original ask was a *generic, configurable* library. So the engine is a standalone TypeScript
package that knows nothing about SDLC, entities, or Obsidian vaults; SDLC contracts are just data
fed to it. Three layers:

| Layer | Home | Knows about | Published? |
|---|---|---|---|
| **`markdown-contract`** (core engine) | `packages/ts/markdown-contract/` | markdown, mdast, Zod — nothing else | yes (generic) |
| **`micromark-extension-obsidian`** (dialect) | `packages/ts/micromark-extension-obsidian/` | `^block-id`, `[[wikilink]]`, `![[transclusion]]` | yes (independent; D-0014 Component 2) |
| **SDLC integration** | `plugin/lib/...` (not a package) | entity types, the op substrate, CLI/MCP/HTTP | no (in-repo) |

```text
packages/ts/
  markdown-contract/            # generic core — the engine
    src/
      projection.ts             # mdast → position-carrying section tree
      grammar.ts                # contract/sections/section/optional/oneOf/gap/rule combinators
      leaves.ts                 # table/list/code/maxWords → Zod over a projected node
      validate.ts               # one pass: frontmatter (Zod) + body (grammar) + cross-plane rules
      model.ts                  # OOM — Infer<Contract> typed views (§6); lazy facade over projection
      finding.ts                # the Finding shape
      index.ts                  # public surface
    tests/                      # fixture markdown ⇒ expected findings (no SDLC deps)
    package.json  moon.yml  tsconfig.json
  micromark-extension-obsidian/ # the dialect parser (Component 2)

plugin/lib/model/entities/<type>/
  schema.ts                     # frontmatter Zod (exists today; referenced by contract.ts)
  contract.ts                   # the unit: contract({ frontmatter: schema, body: sections(...) })  ← new
```

Names are working titles (npm name/scope TBD). The split pays back three ways: the engine is
unit-testable against plain fixture markdown with zero SDLC scaffolding; it is reusable outside this
repo; and the SDLC-specific knowledge stays where it belongs — in per-entity `contract.ts` data,
not in the engine. The typed object model (OOM, §6) is a submodule of the core — the `doc` half of
the same engine — not a separate package, so it shares the projection rather than re-deriving it.
**The validator never depends on the model:** findings come from the projection + frontmatter Zod +
body grammar alone; the OOM is an optional consumer layer over the same projection, additive and
deferrable.

## 2. Representations — mdast → projection → model

A document passes through three in-memory forms (plus the contract that validates the middle one):

| Layer | Form | For |
|---|---|---|
| 0 | **mdast** — the raw unified/remark parse tree | fidelity / round-trip |
| 1 | **projection** (`DocTree`) — positioned section tree, cells flattened | the validator's substrate |
| 3 | **model** (`Infer<Contract>`) — typed, navigable views (§6, "OOM") | consumers |

### Layer 0 — mdast (the raw parse)

mdast is verbose, position-rich, and inline-as-tree. For `## Files to touch` + a pipe table:

```js
{ type: "root", children: [
  { type: "heading", depth: 2, children: [{ type: "text", value: "Files to touch" }],
    position: { start: {line:1,column:1,offset:0}, end: {line:1,column:18,offset:17} } },
  { type: "table", align: [null, null], children: [
    { type: "tableRow", children: [
      { type: "tableCell", children: [{ type: "text", value: "Location" }] },
      { type: "tableCell", children: [{ type: "text", value: "Kind" }] } ] },
    { type: "tableRow", children: [
      { type: "tableCell", children: [{ type: "inlineCode", value: "a.ts" }] },  // ← inline subtree
      { type: "tableCell", children: [{ type: "text", value: "new" }] } ] } ] } ] }
```

Three things make it hostile for direct use — each fixed by an upper layer: **(1)** headings are
flat siblings, no section containment (layer 1's job); **(2)** a cell is an inline subtree, not a
value (`tableCell → inlineCode → "a.ts"` — layer 3 hands back typed scalars); **(3)** every node
carries `{start,end}: {line,column,offset}` (great for diagnostics, noise for access).

> **Dependency (D1, committed).** `remark-gfm` ^4 is the dependency that yields `table` and `list`
> (task-list checkbox) nodes — without it a pipe table is a single `paragraph` of pipe text. The
> repo stays on unified/remark at current majors; `markdown-rs` is a rust-ontogen-plane option only.
> (The existing `markdown_extract.ts` runs `remark-parse` + `remark-frontmatter` only; adding
> `remark-gfm` is part of the migration.)

### Layer 1 — the projection

One parse turns flat mdast into a position-carrying **section tree** (the recursive, positioned form
of D-MDSV's `BodyModel`). This is the substrate both the grammar (structure) and the Zod leaves
(content) read.

```ts
parse(markdown: string, opts?: { extensions?: MicromarkExtension[] }): DocTree

interface SourcePos { line: number; col?: number }   // single point; grows `end?` when LSP/SARIF lands

interface DocTree {
  frontmatter: {
    raw: string;
    data: unknown;
    pos: SourcePos;
    lineForPath(path: (string | number)[]): number | undefined;  // E2 — Zod issue path → key line
  } | null;
  root: SectionNode;                 // synthetic; root.sections are the top-level H2s
  mdast: Root;                       // F1 — the raw layer-0 tree, exposed for analysis (not hidden)
}

interface SectionNode {
  name: string;                      // heading text, trimmed (exact, case-sensitive)
  depth: number;                     // 1..6
  pos: SourcePos;                    // source position of the heading
  sections: SectionNode[];           // nested subsections, by heading depth
  blocks: BlockNode[];               // non-heading content in this section
  anchors: string[];                 // section-level ^block-ids (block-bound ids: BlockNode.anchor)
}

interface ListItem { text: string; checked?: boolean; pos: SourcePos }   // C3 — items carry pos

type BlockNode =
  | { kind: "table"; columns: string[]; rows: string[][]; rowPos(i: number): SourcePos;
      anchor?: string; pos: SourcePos }                                   // C3/A3 — row index → line
  | { kind: "list"; ordered: boolean; items: ListItem[]; anchor?: string; pos: SourcePos }
  | { kind: "code"; lang: string | null; value: string; anchor?: string; pos: SourcePos }
  | { kind: "paragraph"; text: string; anchor?: string; pos: SourcePos };
```

Every node carries a `SourcePos`, so findings localize to `<file>:<line>` — the thing a raw schema
engine's index-based path cannot do. (`SourcePos` is deliberately *not* named `Position`:
unist/mdast already use `Position` for a start–end range and `Point` for a single point, so this
avoids the clash with the ecosystem the package imports.)

### Projection invariants

| Invariant | Decision | Rule |
|---|---|---|
| **Fenced code is opaque** | D2 | a `##`/`^id`/pipe line *inside* a fenced `code` block is never re-scanned as a heading / anchor / table — the fence value is verbatim |
| **No depth-jump synthesis** | D3 | a skipped heading level (H2→H4) attaches as a direct child of the nearest ancestor; no intermediate node is synthesized, and the skip emits `structure/heading-depth-jump` (warn) |
| **No hoisting** | D4 | a block nested inside a blockquote or list item is *not* promoted to a section-level `BlockNode`; `section.blocks` holds heading-direct blocks only |
| **Position-aware frontmatter** | E2 | the frontmatter is parsed with a position-retaining YAML pass so `lineForPath` can map a Zod issue path to its key's line (parser choice is an S6 detail) |

## 3. The contract API — frontmatter + body as one unit

A **contract is one unit per markdown class**: a frontmatter schema (Zod), a body grammar, and
optional cross-plane rules, validated in a single pass. The body grammar is the structure layer —
the *sequence and nesting of sections* — the one thing Zod cannot express (D-0014 "Why", Murata).

```ts
// The whole-document unit — one per markdown class.
function contract<F, B>(def: {
  frontmatter?: ZodType<F>;          // per-type Zod (reuse schema.ts, or inline z.object)
  body?: SectionSeq<B>;              // the body grammar — sections(...)
  rules?: DocRule[];                 // cross-plane rules: see BOTH frontmatter and body
}): Contract<F, B>;

// Body sequence container — the ordered content model for one level (and nested `children`).
function sections<B>(opts: LevelOpts, specs: Spec[]): SectionSeq<B>;

function section(name: string | string[], opts?: SectionOpts): Spec;  // string[] = alias set
function optional(spec: Spec): Spec;            // sugar for { optional: true }
function oneOf(names: string[], opts?: SectionOpts): Spec;  // interchangeable spellings
function gap(opts?: { min?: number; max?: number }): Spec;  // permit unknown sections here

// A section rule sees one node; a doc rule sees { frontmatter, body } — the whole typed document.
function rule(id: string, fn: (node: SectionNode, ctx: Ctx) => Finding[]): Rule;
function docRule<F>(id: string, fn: (doc: Doc<F>, ctx: Ctx) => Finding[]): DocRule;

// Ctx (A4) — the rule-author's finding factory. The engine fills path/level/pos and the id's
// registered default level, so a rule body just names the problem; engine-internal findings bypass it.
interface Ctx {
  path: string;
  finding(f: { id: string; message: string; level?: Finding["level"]; pos?: SourcePos }): Finding;
}

interface LevelOpts {
  order?: "none" | "recognized-relative" | "strict";   // default: "none"
  allowUnknown?: boolean;                               // default: true
}

interface SectionOpts {
  optional?: boolean;
  content?: LeafSpec | Record<string, LeafSpec>;   // single leaf, or named leaves bound by ^anchor
  children?: SectionSeq<any>; // nested subsequence (recursion)
  rules?: Rule[];             // node-local named rules
  anchor?: string;            // require a ^block-id, e.g. "summary"
}
```

### Ordering and unknown sections

`order` and unknown-placement are independent knobs — which is what lets a strict prefix coexist
with an open tail.

| `order` | recognized sections… |
|---|---|
| `"strict"` | in declared order, contiguous — no unknowns between them *unless* a `gap()` sits there |
| `"recognized-relative"` | in declared relative order; unknowns interleave freely (an implicit `gap()` between every position) |
| `"none"` | any order |

`allowUnknown` is the default for positions with no marker; `gap()` *locally* permits unknown
sections regardless. So `allowUnknown: true` ⇒ unknowns everywhere (gaps implicit, `gap()`
unnecessary); `allowUnknown: false` ⇒ unknowns *only* at explicit `gap()` positions. The
"definitive prefix, then extras" shape is the latter with one `gap()`:

```ts
// First three sections locked in order; extras only after; a trailing section still anchors.
sections({ order: "strict", allowUnknown: false }, [
  section("Title"),
  section("Overview"),
  section("Status"),
  gap(),                       // ← unknown/extra sections permitted only from here onward
  optional(section("Appendix")),
]);
// [Title, Overview, Status]                    ✓
// [Title, Overview, Status, Risks, Notes]      ✓  extras land in the gap
// [Title, Overview, Status, Risks, Appendix]   ✓  Appendix still anchors after the gap
// [Title, Risks, Overview, Status]             ✗  Risks before the gap — strict prefix violated
// [Overview, Title, Status]                    ✗  prefix out of order
```

`gap({ min, max })` bounds how many extras the window admits. `gap()` admits *free-form* unknown
sections and carries **no** child-structure expectation (G4): to constrain a section's children you
*declare* the section with `children:` (`optional(...)` included) — `gap()` never grows a
per-element schema, because defining structure on something declared free-form is a contradiction. A
doctype is modelled level-by-level at the schema's own tightness: tight where it enumerates, `gap()`
where it is open (e.g. a milestone's `Deliverables` H3 categories).

Leaf helpers — the finite, closed content vocabulary. Each contributes **two** parts (F3): a
**structural kind-gate**, checked first — `structure/block-missing` if no block of that kind fills
the slot, `structure/block-kind` if the slot's block is the wrong kind — **and** a
**content Zod schema** over the projected node's data. A leaf is therefore *not* "pure Zod": the
block's kind is a tree-grammar (structure) concern, only its data shape is schema (content). Raw
`z.*` rides *inside* a leaf (e.g. a table's `cells`) for anything richer (D-0014 Out-of-scope: no
new config keywords for conditions/grammars).

```ts
type BlockKind = "table" | "list" | "code" | "paragraph";
interface LeafSpec { kind: BlockKind; schema: ZodType }   // F3 — structural kind-gate + content Zod

function table(s: {
  columns: string[]; anchor?: string; minRows?: number;
  cells?: Record<string, ZodType>;
  extraColumns?: "ignore" | "error";        // C2 — default "ignore"; "error" ⇒ content/table/column-extra
}): LeafSpec;
function list(s: { ordered?: boolean; everyItem?: "checkbox" | ZodType; minItems?: number }): LeafSpec;
function code(s: { lang?: string }): LeafSpec;
function maxWords(n: number): LeafSpec;      // a paragraph-kind leaf
```

## 4. Output — one pass over both planes

`validate` parses frontmatter + body once, then runs the frontmatter Zod, the body grammar, and the
cross-plane rules, merging everything into one `Finding[]`. It also returns the projection (`tree`)
and, when the document is valid, the typed model (`doc`).

```ts
interface Finding {
  id: string;                                   // namespaced area/…/name (A1), e.g. "structure/section-missing"
  level: "error" | "warn" | "report";           // contract data, not call-site choice
  path: string;                                  // document-scoped (one parse, one path)
  pos?: SourcePos;                               // A2 — omitted for whole-document absence findings
  message: string;
  fix?: { description: string; edit?: TextEdit }; // describes only; applying is D-0005
}

class ContractError extends Error { findings: Finding[]; }   // F1 — carries the error-level findings

contract.validate(source: string, ctx: { path: string }): {
  findings: Finding[];                          // frontmatter + body + cross-plane, one pass
  doc?: { frontmatter: F; body: B };            // A4 — the typed model (Infer); present iff no error-level finding
  tree: DocTree;                                // F1 — the projection (tree.mdast = raw AST), for analysis
};
contract.read(source: string, ctx: { path: string }): { frontmatter: F; body: B };  // F1 — doc, or throws ContractError
// (validate also accepts a pre-parsed DocTree if you already called parse() yourself)

type Decision = Infer<typeof DecisionContract>; // { frontmatter: DecisionFm; body: DecisionBody }
```

**`doc` is present iff there is no `error`-level finding** (warnings are fine); `read()` returns it
or throws `ContractError` (F1). The frontmatter raw Zod result rides on `tree.frontmatter`; deeper
per-leaf Zod threading is a deferred `raw` channel.

**Finding order (E3).** `findings` is sorted deterministically so goldens pin: ascending `pos.line`;
no-`pos` (document-level) findings first (as line 0); ties on a line break by `pos.col`, then plane
order (`frontmatter` → `structure` → `content` → `rule`), then stable emission order.

**Finding planes (A1).** Five areas — `frontmatter/*` (Zod over the YAML, E1), `structure/*` (the
tree grammar: section sequence / nesting / anchors **and** block presence / kind),
`content/<leaf>/<check>` (Zod over a present, correct-kind block's data, C1), `rule/*` (named
`rule`/`docRule`), and `contract/*` (build-time contract-authoring errors, thrown not collected).
The key line: **kind and presence are structure; data shape is content** (F3). The block/anchor
family, all structure-plane:

| id | Fires when |
|---|---|
| `structure/anchor-missing` | a declared `^anchor` resolves to no block |
| `structure/block-missing` | a declared content slot has no block of the expected kind (C5) |
| `structure/block-kind` | an addressed block is present but the wrong kind (F3) |
| `structure/key-collision` | two document sections share a camelCase key but differ in exact heading (F4, error) |
| `contract/key-collision` | two *declared* names collide in camelCase — build-time throw (F4) |

## 5. Syntax — what an author writes

### 5.1 The decision contract (this document family, abbreviated)

```ts
import { z } from "zod";
import {
  contract, sections, section, optional, oneOf, gap, table, maxWords,
} from "markdown-contract";

// Frontmatter schema — the per-type Zod that already lives in schema.ts (inlined for the example).
const DecisionFrontmatter = z.object({
  id: z.string().regex(/^D-[0-9A-Z]{4}$/),
  status: z.enum(["open/proposed", "open/accepted", "closed/superseded"]),
  title: z.string().min(1),
  related: z.array(z.string()).default([]),
}).strict();

export const DecisionContract = contract({
  frontmatter: DecisionFrontmatter,
  body: sections({ order: "recognized-relative", allowUnknown: true }, [
    section("Summary", { anchor: "summary", content: maxWords(120) }),
    section("Context"),
    section("Decision", {
      children: sections({ order: "strict", allowUnknown: true }, [   // nested subsequence
        section("Components", {
          content: table({ columns: ["#", "Component", "Resolution"], minRows: 1 }),
        }),
      ]),
    }),
    optional(section("Why")),
    optional(section("Options considered", {
      children: sections({ order: "none", allowUnknown: true }, [ gap() ]),  // "### <option>" subs
    })),
    optional(section("Consequences")),
    optional(section("Out of scope")),
    optional(section("Notes")),
  ]),
});
```

### 5.2 Task contract — frontmatter, aliases, typed leaves, and a cross-plane rule

```ts
import { z } from "zod";
import {
  contract, sections, section, optional, oneOf, list, table, docRule,
} from "markdown-contract";
import { TaskFrontmatter } from "./schema.ts";              // reuse the existing per-type Zod

export const TaskContract = contract({
  frontmatter: TaskFrontmatter,                            // already encodes closed/* ⇒ completion_note (G3)
  body: sections({ order: "recognized-relative", allowUnknown: true }, [
    oneOf(["Goal", "Goal / Problem statement"]),            // alias set, required
    optional(section("Today")),                            // G2 — optional; "Current state" was a phantom alias
    section("Files to touch", {
      optional: true,
      content: table({
        columns: ["Location", "Kind", "Change"],
        cells: { Kind: z.enum(["new", "modify", "delete"]) },  // G1 — matches the live VALID_KINDS
      }),
    }),
    section("Acceptance criteria", {
      content: list({ everyItem: "checkbox", minItems: 1 }), // the "24 non-checkbox ACs" rule
    }),
    optional(section("Post-mortem", {                      // G3 — structure declared here; presence gated below
      children: sections({ order: "strict", allowUnknown: false }, [
        section("Acceptance criteria coverage"),
        section("What worked"),
        section("Friction and automation gaps"),
      ]),
    })),
  ]),
  rules: [
    // Cross-plane (G3): frontmatter status gates a body section — the real example (PR 464's post-mortem).
    // Completion is frontmatter-only (TaskFrontmatter's closed/* ⇒ completion_note), so it is *not* a docRule.
    docRule("task/post-mortem-when-worked", (doc, ctx) =>
      isWorked(doc.frontmatter.status) && !doc.body.section("Post-mortem")
        ? [ctx.finding({ id: "task/post-mortem-when-worked",
              message: "a worked task must include a ## Post-mortem section" })]   // ctx fills path/level/pos (A4)
        : []),
  ],
});
```

### 5.3 Pass / fail walkthrough — both planes, one pass

Given `DecisionContract` and a document whose frontmatter has `status: "open/draft"` (not in the
enum) and whose sections are `[Summary, Context, Why, Decision, Notes]` (Why before Decision; no
`^summary` anchor), one `validate` call returns frontmatter and body findings together:

```jsonc
// DecisionContract.validate(source, { path: "docs/.../D-XXXX/README.md" }).findings
[
  { "id": "frontmatter/enum", "level": "error",
    "path": "docs/.../README.md", "pos": { "line": 5 },
    "message": "status: expected open/proposed | open/accepted | closed/superseded" },
  { "id": "structure/anchor-missing", "level": "error",
    "path": "docs/.../README.md", "pos": { "line": 9 },
    "message": "Summary section is missing required block-id ^summary" },
  { "id": "structure/section-order", "level": "error",
    "path": "docs/.../README.md", "pos": { "line": 18 },
    "message": "‘Why’ appears before ‘Decision’; recognized sections must keep declared order" }
]
```

On success, the typed model (`doc`) carries both planes:

```jsonc
{ "findings": [],
  "doc": { "frontmatter": { "id": "D-0014", "status": "open/proposed" },
           "body": { "summary": {}, "decision": { "components": [] } } } }
```

## 6. The typed document model (OOM)

`Infer<Contract>` is not merely a value type — it is an **object-oriented view of the document**:
typed, navigable, with collection helpers. The contract is the single source for both validation
*and* this model, so section names become keys, table columns become row fields, and cell schemas
become field types. It is a **lazy facade over the layer-1 projection** (no second copy, positions
preserved), and a submodule of `markdown-contract` — the `doc` half of the same engine. It is
**additive and optional**: the validator never consults it (findings come from projection + Zod +
grammar), it is built only on demand (`read`, or `validate().doc` on success), and it can ship after
the validator — nothing in the finding path depends on it.

Two doors onto one machinery (mirroring Zod's `safeParse`/`parse`):

```ts
const { findings, doc } = Contract.validate(source, { path });  // findings + model
const doc = Contract.read(source, { path });                    // model only (throws on error-level)
```

### Shape

```ts
type Decision = Infer<typeof DecisionContract>;
// {
//   frontmatter: { id: string; status: DecisionStatus; title: string; related: string[] };
//   body: {
//     summary: SectionView;
//     decision: { components: TableView<{ "#": string; Component: string; Resolution: string }> };
//     why?: SectionView;               // U6 — optional ⇒ SectionView | undefined
//     unknown: SectionView[];          // U5 — gap()/allowUnknown sections; always present ([] if none)
//   };
//   byAnchor(id: string): BlockView | undefined;   // U7 — doc-wide anchor lookup (F2); doc = { frontmatter, body, byAnchor }
// }
```

### Dual access — bracket (exact) and dotted (camelCase)

The inferred type carries **both** keying styles, generated from each section's declared name:

```ts
doc.body["Files to touch"]            // exact heading text — always available
doc.body.filesToTouch                 // lowerCamelCase — generated alongside
doc.body.section("Files to touch")    // explicit accessor for dynamic/edge names
```

All three resolve to the same `SectionView`. The dual-key invariant is guaranteed by two findings
(F4): two sections with the *same* heading are `structure/duplicate-section`, and two sections whose
*distinct* headings collapse to the same camelCase key are `structure/key-collision` (error) — so
within a sibling scope every exact name and every dotted key is unique. The camelCase rule is
Unicode-aware (`/[^\p{L}\p{N}]+/u`, locale-independent), so most languages work; a heading that
yields an invalid identifier or a caseless script gets no dotted alias (exact bracket + `.section()`
still reach it). A *contract* that declares two names colliding in camelCase is a build-time
`contract/key-collision` throw, caught at definition time.

### TableView — iterable, typed rows from the column declaration

```ts
interface TableView<Row = Record<string, string>> extends Iterable<Row> {  // U8 — default Row = dynamic
  kind: "table";                     // U2 — the BlockView discriminant
  columns: string[];
  rows: Row[];                       // each row keyed by column name, cell-typed
  rowCount: number;
  pos: SourcePos;
  column<K extends keyof Row>(name: K): Row[K][];        // a whole column
  find(p: (row: Row, i: number) => boolean): Row | undefined;
  rowPos(i: number): SourcePos;      // positions survive for diagnostics / fixes
}

// table({ columns:["Location","Kind","Change"], cells:{ Kind: z.enum(["new","modify","delete"]) } })
//   ⇒ Row = { Location: string; Kind: "new" | "modify" | "delete"; Change: string }
//     declared cells take their Zod type; undeclared columns default to string.

for (const change of doc.body.filesToTouch) change.Kind;           // iterate typed rows
doc.body.filesToTouch.column("Location");                          // string[]
doc.body.filesToTouch.find((r) => r.Kind === "delete")?.Location;  // typed lookup
```

### List / code / paragraph views, and `BlockView` (U1, U2)

`byAnchor` (and `SectionView.lists`) hand back the other three block views. Each carries a literal
`kind`, so the four-way union narrows idiomatically:

```ts
interface ListView extends Iterable<ListItem> {   // U1 — lean; ListItem = { text; checked?; pos } (§2)
  kind: "list";
  ordered: boolean; items: ListItem[]; length: number; pos: SourcePos;
}
interface CodeView      { kind: "code";      lang: string | null; value: string; pos: SourcePos }
interface ParagraphView { kind: "paragraph"; text: string;                       pos: SourcePos }

type BlockView = TableView | ListView | CodeView | ParagraphView;   // U2 — discriminated on .kind

const b = doc.byAnchor("notes");
if (b?.kind === "list") for (const item of b) item.checked;   // narrow → ListView
```

`CodeView` / `ParagraphView` are thin (just the projection node's content + `pos` + `kind`); views
carry no `anchor` (you reached the block *by* its anchor). `TableView`'s default `Row` is
`Record<string, string>` — the dynamic shape `byAnchor` returns (U8).

### Naming a table as a field

A table becomes a named field these ways, first match wins:

| Source | Field | Typed? |
|---|---|---|
| Section's sole `content: table(...)` — heading *is* the table | `doc.body.components` | ✅ row types |
| Contract `content` record, table bound by `^anchor` | `doc.body.decision.components` | ✅ row types |
| `^anchor` the contract doesn't declare | `doc.byAnchor("components")` | ⚪ `Record<string,string>` |
| A section's lone unnamed table | `doc.body.<section>.table` | ⚪ `Record<string,string>` |

Multiple typed tables in one section use the `content` record, each bound to its block by `^anchor`:

```ts
section("Decision", {
  content: {
    components: table({ anchor: "components", columns: ["#", "Component", "Resolution"] }),
    risks:      table({ anchor: "risks",      columns: ["Risk", "Mitigation"] }),
  },
});
```

```md
## Decision

| # | Component | Resolution |
| - | --------- | ---------- |
…
^components

| Risk | Mitigation |
…
^risks
```

→ `doc.body.decision.components` and `doc.body.decision.risks`, both typed `TableView<Row>`.

Types come only from the contract. An `^anchor` it doesn't declare is reachable via
`doc.byAnchor("…")`, which returns **`BlockView | undefined`** (F2) — a `kind`-discriminated union
you narrow idiomatically (`if (b?.kind === "table") b.rows`), the table's rows typed
`Record<string, string>` (columns from the document, string cells). A section's lone unnamed table
is `doc.body.<section>.table`, same dynamic type. A one-table section is *not* auto-promoted to a
`TableView` — that would make its type depend on content count; the explicit `.table`/anchor keeps
access stable.

### SectionView — content access

```ts
interface SectionView {
  name: string;
  pos: SourcePos;
  anchors: string[];                 // ^block-ids
  text(scope?: "prose" | "all"): string;   // U4 — default "prose" (own paragraphs); "all" = full subtree
  table?: TableView<Record<string, string>>;    // the sole table, if exactly one (untyped)
  tables: TableView<Record<string, string>>[];
  lists: ListView[];
  byAnchor(id: string): BlockView | undefined;   // any ^anchored block; narrow via .kind (F2/U2)
  sections: SectionGroup;            // U3 — same dual-key shape as doc.body, NOT a plain Record
}
```

This is where mdast's cell-as-inline-subtree (layer 0) finally pays off: layer 1 flattened cells to
strings, and the model hands back typed scalars and iterables instead of a tree to walk.

### `SectionGroup`, absence, and the `doc` ↔ `tree` boundary

- **`SectionGroup` (U3).** `doc.body` and every `SectionView.sections` are the *same* generated
  dual-key structure: typed keys for declared sections + exact-bracket + lowerCamelCase +
  `.section()` accessor + **`unknown: SectionView[]`** for gap-admitted ones. So nesting reads
  identically at every depth — no idiom-switch.
- **`unknown` (U5).** `body.unknown` is **always** present (`[]` when none, never `undefined`),
  positional, in document order; each element is a full `SectionView` (`.name` the only handle). It
  holds both `gap()` and `allowUnknown` admissions.
- **Absent optional (U6).** An optional section that's missing reads as **`undefined`** (the `?` key
  on all three access paths); present-but-empty is a real `SectionView` with empty `text()`.
  Required sections get a non-optional key (their absence is an `error` that blocks `doc`, F1).
- **`doc` vs `tree` (U9).** `doc` is the contract-typed read surface (sections, typed rows,
  `byAnchor`) and exists only for a *valid* document; `validate().tree` is the raw projection
  (`tree.mdast`, `lineForPath`, unmodelled blocks) and is **always** returned, even when `doc` is
  absent. Reach for `doc` for typed data; `tree` for AST / unmodelled structure / analysis of
  invalid docs. `read()` returns only `doc`.

## 7. Open API decisions (deferred to spikes)

- **S7 — Zod-native vs companion.** Are `section()` nodes literal `ZodType`s (one schema end-to-end,
  `z.infer` for free) or a companion type embedding Zod only at leaves? Leaning Zod-interop for
  inference and uniform DX; the prototype decides. (The Zod `issues[].path` → projection `line`
  remap is **committed** — A3/E2, line granularity — so S7 only proves the plumbing.)
- **S6 — projection + leaf scope.** `remark-gfm` ^4 is **committed** as the dep that yields
  `table`/`list` nodes (D1), and the projection invariants — fence-opacity (D2), depth-jump (D3),
  no-hoist (D4) — are **decided**. What's left for the spike: confirming the position-aware YAML
  parser behind `lineForPath` (E2) and which leaf assertions ship v1 vs defer to named Zod.

## 8. Integration & migration touchpoints

- Each `entities/<type>/contract.ts` exports a `Contract`; the deterministic op
  (`defineOp`, D-0007) wraps `parse` + `validate` and surfaces findings through the generated
  CLI/MCP/HTTP adapters.
- Retires, per D-0014 Migration: `validateBody` + `extractH2Headings` (→ grammar over the
  projection), `body-schema.yaml` (→ `contract.ts`), the `scan-placeholders`/`parse-touchpoints`
  line scanners and the three alias tables (→ `oneOf` + named rules), and the duplicated
  `FRONTMATTER_RE` slicers (→ the package's single `parse`).
- The engine is LLM-free and read-only; repair/normalization stays a separate D-0005 pass.
