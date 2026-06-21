---
type: capability
schema_version: '1'
id: C-0005
kind: technical
title: Two-plane contract engine
status: open/verified
created: '2026-06-20'
parent_key: null
contains: []
related:
  - '[[C-0001-contract-validation]]'
  - '[[C-0004-dialect-aware-projection]]'
tags:
  - engine
  - structure-plane
  - content-plane
need_human_review: true
---

# Two-plane contract engine

## Summary

- Match a projected document against a contract on two formally-incomparable planes — a regular tree
  grammar over structure and Zod over content — plus a named-rule registry for cross-node /
  cross-file constraints. ^summary
- The core mechanism behind contract validation and the typed model.

## Statement

The engine validates a `DocTree` against a contract by running a structure plane (a tree grammar over
section sequence and block kinds — required / optional, alias-sets, ordering, gap windows) and a
content plane (Zod over each block's data), then a registry of named rules including cross-plane
`docRule`s. Schema languages and tree grammars are formally incomparable (Murata), so neither plane is
forced to do the other's job.

## What it provides

- A structure-plane matcher emitting `structure/*` findings (section grammar, the block / anchor
  family, key collisions).
- A content-plane validator emitting `content/*` and `frontmatter/*` findings via Zod, with issue
  paths remapped to source lines.
- A named-rule registry — per-node `rule()` plus cross-plane / cross-file `docRule()`.

## Inputs

- The combinator vocabulary an author calls to declare a contract — a frontmatter Zod schema, a body
  grammar, and optional cross-plane rules, as one unit per markdown class.

```ts
function contract<F, B>(def: {
  frontmatter?: ZodType<F>;     // per-type Zod (reuse schema.ts or inline z.object)
  body?: SectionSeq<B>;         // the body grammar — sections(...)
  rules?: DocRule[];            // cross-plane rules: see both frontmatter and body
}): Contract<F, B>;

// A `Spec` is one element of a level's ordered content model — the opaque output of
// section() / optional() / oneOf() / gap(). Authors never construct it directly; they pass an
// ordered `Spec[]` to sections(). (Internally a tagged union of the four element kinds.)
type Spec = SectionSpec | OptionalSpec | OneOfSpec | GapSpec;

function sections<B>(opts: LevelOpts, specs: Spec[]): SectionSeq<B>;
function section(name: string | string[], opts?: SectionOpts): Spec;   // string[] = alias set
function optional(spec: Spec): Spec;
function oneOf(names: string[], opts?: SectionOpts): Spec;
function gap(opts?: { min?: number; max?: number }): Spec;             // permit unknown sections here

interface LevelOpts { order?: "none" | "recognized-relative" | "strict"; allowUnknown?: boolean }
interface SectionOpts {
  optional?: boolean;
  content?: LeafSpec | Record<string, LeafSpec>;   // single leaf, or named leaves bound by ^anchor
  children?: SectionSeq<any>;                       // nested subsequence (recursion)
  rules?: Rule[];                                   // node-local named rules
  anchor?: string;                                  // require a ^block-id, e.g. "summary"
}

// Content leaves — a structural kind-gate (checked first) plus a content Zod schema over the node.
type BlockKind = "table" | "list" | "code" | "paragraph";
interface LeafSpec { kind: BlockKind; schema: ZodType }
function table(s: { columns: string[]; anchor?: string; minRows?: number;
                    cells?: Record<string, ZodType>; extraColumns?: "ignore" | "error" }): LeafSpec;
function list(s: { ordered?: boolean; everyItem?: "checkbox" | ZodType; minItems?: number }): LeafSpec;
function code(s: { lang?: string }): LeafSpec;
function maxWords(n: number): LeafSpec;
```

- `order` and `allowUnknown` are independent knobs: `strict` (declared order, contiguous),
  `recognized-relative` (declared relative order, unknowns interleave), or `none`; `allowUnknown` sets
  the default for unmarked positions while `gap()` locally admits unknowns — which is what lets a
  strict prefix coexist with an open tail.

## Outputs

- A `Finding[]` over two formally-incomparable planes plus named rules, produced in one pass. The
  dividing line: **kind and presence are structure; data shape is content** (Murata — a tree grammar
  and Zod cannot each express the other, so neither plane is forced to do the other's job).
  - `structure/*` — section sequence / nesting / anchors **and** block presence (`block-missing`) and
    kind (`block-kind`), plus key collisions.
  - `content/<leaf>/<check>` — Zod over a present, correct-kind block's data.
- The `Finding` shape, the five planes, and the deterministic ordering are defined by
  [[C-0001-contract-validation]] (the `D·finding-model` ADR).

## Hook points

- The named-rule registry — the engine's extension surface. A `rule` sees one node; a `docRule` sees
  the whole typed `{ frontmatter, body }` (cross-plane).

```ts
function rule(id: string, fn: (node: SectionNode, ctx: Ctx) => Finding[]): Rule;        // per-node
function docRule<F>(id: string, fn: (doc: Doc<F>, ctx: Ctx) => Finding[]): DocRule;      // cross-plane
interface Ctx {
  path: string;
  finding(f: { id: string; message: string; level?: Finding["level"]; pos?: SourcePos }): Finding;
}
```

- `Ctx` is the rule author's finding factory: the engine fills `path` / `level` / `pos` and the id's
  registered default level, so a rule body just names the problem.

## Underlying implementation

- Planned: `src/core/grammar.ts` (the combinators), `src/core/leaves.ts` (Zod over a projected node),
  `src/core/validate.ts` (the one-pass merge) — running over [[C-0004-dialect-aware-projection]] and
  emitting [[C-0001-contract-validation]]'s findings.
- Fixed by the `D·structure-plane`, `D·content-plane`, and `D·finding-model` ADRs. Not yet built.

## Notes

The mechanism behind [[C-0001-contract-validation]] and [[C-0002-typed-consumption]], running over
[[C-0004-dialect-aware-projection]]. Designed across the `D·structure-plane`, `D·content-plane`, and
`D·finding-model` ADRs. Status `open/planned`.
