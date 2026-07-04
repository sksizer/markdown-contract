---
type: decision
schema_version: '1'
id: D-0017
status: open/proposed
title: Contract-to-document generation — closing the gaps to a template-engine basis
created: '2026-07-03'
related:
  - '[[C-0011-document-scaffolding]]'
  - '[[C-0008-config-scaffolding]]'
  - '[[D-0009-config-inference]]'
  - '[[C-0006-declarative-yaml-contracts]]'
  - '[[C-0005-two-plane-contract-engine]]'
  - '[[C-0002-typed-consumption]]'
  - '[[C-0003-corpus-cli]]'
  - '[[D-0008-declarative-contract-dsl]]'
  - '[[D-0007-engine-scope-and-fidelity]]'
  - '[[D-0006-packaging]]'
tags:
  - scaffolding
  - generation
  - template
  - draft
need_human_review: true
---

# Contract-to-document generation — closing the gaps to a template-engine basis

> **Draft.** This decision records the feasibility analysis and a *proposed*
> shape for [[C-0011-document-scaffolding]]; the choices below are tentative and
> the open questions are unresolved. It exists to make the docs-site claim —
> "not a template engine, but could be the basis for one" — precise and to
> enumerate the work that basis actually requires.

## Summary

- Generating a starting document from a contract (`contract → skeleton .md`) is
  the **dual of [[D-0009-config-inference]]** (`docs → contract`), over the same
  declarative IR. `init` already serialises a contract and consumes its own
  output in a self-check; scaffolding runs the transform the other way. So the
  bulk of the machinery — a walkable contract, a round-trip self-check — already
  exists. ^summary
- **The section grammar generates deterministically.** Required sections, their
  order, nesting depth (heading level), `^anchors`, and per-leaf block stubs (a
  table header row from declared columns, checkbox lists, fenced code with a
  `lang`) all fall out of a straight walk of the contract's `Spec[]` — the same
  tree the structure plane already traverses. This part is essentially free.
- **Frontmatter splits sharply by authoring path.** A **declarative (YAML)**
  contract's frontmatter is a closed, finite vocabulary (`const` / `enum` /
  `type` / `format` / `default`) that *inverts* into starter values. An arbitrary
  **combinator (Zod)** frontmatter is an opaque predicate the engine only ever
  `safeParse`s — invertible only through `z.toJSONSchema()` for its structural
  subset, and not at all through `.refine()` / `.transform()`. Scaffolding is
  therefore a **first-class capability of the declarative IR and a best-effort
  one for arbitrary Zod.**
- **The one genuinely hard gap is inverting constraints that describe a set
  without enumerating a member** — chiefly `pattern` (regex), and typed
  table/list cells. The proposed fix is a small, optional **`example:` /
  `placeholder:` annotation** in the declarative vocabulary, plus a `--fill`
  policy for when no example is available. No engine change; a vocabulary
  addition and a new front-end code path.
- The correctness contract is a **round-trip**: `validate(new(contract))` yields
  **zero `structure/*` findings** and only a bounded, enumerable set of
  `frontmatter/*` / `content/*` "fill me in" findings — the exact analogue of
  `init`'s accept-by-construction guarantee, and directly testable.

## Context

The docs site frames markdown-contract as *not* a template engine or CMS, but as
the primitive one would build either on ([[C-0011-document-scaffolding]] gives
the product view). That claim is only defensible if generating a valid starting
document from a contract is actually tractable. This decision checks that against
the real code and records what closing the gaps requires.

The building blocks are already present. The contract is inert, walkable tagged
data — the *same* IR both planes consume:

- **Body grammar.** `ContractDef.body` (`packages/core/src/core/types.ts`) is a
  `SectionSeq` = `{ opts: LevelOpts, specs: Spec[] }`. `Spec` is a tagged union —
  `SectionSpec` (`names`, `opts`), `OptionalSpec`, `OneOfSpec`, `GapSpec` — and
  `SectionOpts` carries `content` (a leaf or an anchor-keyed record of leaves),
  `children` (a nested `SectionSeq`), `anchor`, and `rules`. `LevelOpts` carries
  `order` and `allowUnknown`.
- **The walk already exists.** `packages/core/src/core/structure.ts` traverses
  exactly this tree (`slotsOf`, `unwrap`, `matchLevel`, recursing through
  `opts.children`) to *check* a document. A generator walks the identical shape
  to *emit* one.
- **Leaves are self-describing.** The `leaves.ts` builders stash raw config on
  `LeafSpec.config` (`table` → `{ columns, minRows, cells, … }`, `list` →
  `{ ordered, everyItem, minItems }`, `code` → `{ lang }`, `maxWords`), and
  `content.ts` reads it back verbatim — a generator reads the same fields.
- **The declarative schema inverts.** `declarative/schema.ts`'s `compileSchema`
  compiles a *closed* mapping vocabulary (`enum` / `const` / `type` / `format`
  from a fixed `STRING_FORMATS` table / `min` / `max` / `pattern` / `default` /
  `nullable` / `optional`). Because it is a data mapping, not a function, it can
  be walked in reverse to synthesise a conforming value.
- **The precedent.** [[D-0009-config-inference]] already serialises a contract to
  YAML and runs a self-check over its own output; its accept-by-construction
  guarantee is the exact analogue scaffolding wants. Notably, the originating ADR
  (`provenance/d0014`) explicitly deferred a "scaffold/content emitter" as future
  work — this decision picks that thread up.

## Decision

*(Proposed — this is a draft.)* Add a **pure, read-only generator**
`new(contract, opts) → string` in the `declarative` front-end, exposed as a
`markdown-contract new` CLI verb ([[C-0011-document-scaffolding]] § What it
provides). It walks the contract IR and emits markdown; it never edits an
existing document and adds nothing to the engine.

### 1. Generate deterministically from the section grammar (free)

Walk `SectionSeq.specs` in array order:

- **Required `SectionSpec` → `## <names[0]>`**, in walk order. For
  `order: "strict"` / `"recognized-relative"` this walk order *is* the required
  order, so the output is order-clean by construction; `order: "none"` and
  `allowUnknown` impose nothing a declared-sections-only stub can violate.
- **Nesting → heading level.** A top-level section is `##`; a section inside
  `opts.children` is `###`; depth = 2 + recursion level. Descending exactly one
  level per `children` never trips `structure/heading-depth-jump`.
- **Anchors.** `opts.anchor` (and a leaf's `config.anchor`) emit a trailing
  `^<id>` — the same token the structure plane resolves.
- **Leaf block stubs** (satisfy the `kindGate`): `table` → a header row from
  `config.columns` + the `|---|` separator + `minRows` empty rows; `list` →
  `- [ ]` items when `everyItem: "checkbox"`, `minItems` of them, `1.` vs `-`
  from `ordered`; `code` → a fenced block tagged `config.lang`; `maxWords` → a
  short placeholder always under the cap.

### 2. Synthesise starter frontmatter — tight where the IR allows

For a **declarative** contract, walk each field node and emit the most specific
value the schema pins: `const` → the literal; `default` → the default; `enum` →
first member (policy); `type: number` → `0` (respect `int`/`min`); `boolean` →
`false`; `array` → `[]` (or `min` synthesised elements); `format` → a canonical
specimen — and here the analysis found a ready-made table to reuse in reverse:
`declarative/infer.ts`'s `FORMAT_CANDIDATES` already enumerates which formats
have a synthesisable specimen (`date` → today, `email`/`url`/`uuid` → canonical
placeholders). Required keys are emitted; optional keys are omitted (or commented,
by policy).

For a **combinator (Zod)** contract, `ContractDef.frontmatter` is a raw `ZodType`
the engine only `safeParse`s — it is never introspected. Inversion goes through
`z.toJSONSchema()` (Zod 4) to recover the structural subset (objects, enums,
formats) and then reuses the same inverter; `.refine()` / `.transform()` /
`.superRefine()` are non-invertible and fall to a placeholder. This is the honest
ceiling and must be documented as such.

### 3. Close the under-determined gaps

Per plane, the choices a contract genuinely leaves open, and the proposed
resolution:

- **Structure.** `optional` → omit by default (minimal valid stub) or emit
  commented (`--optional comment`); `oneOf` → emit the first branch by default
  (`--oneof <name>` to override); `gap` → emit nothing unless `min > 0`, in which
  case a placeholder heading (a gap admits *unknown* sections the contract cannot
  describe, so any filler is arbitrary — flagged in console output).
- **Frontmatter `pattern`.** A regex such as `^D-\d{4}$` cannot be reliably
  inverted (regex generation is a subproblem; an arbitrary pattern has no
  canonical member). **Proposed fix: an optional `example:` / `placeholder:`
  annotation** on the schema node — a first-class hint in the closed vocabulary
  ([[D-0008-declarative-contract-dsl]]). Absent a hint, emit a visible `TODO`
  token and let it surface as a `frontmatter/pattern` "fill me in" finding.
- **Leaves with typed cells / items.** An empty row fails a cell schema like
  `{ format: url }`, so `minRows` rows can be structurally present yet
  content-invalid. Either synthesise a per-column specimen (the same inversion as
  frontmatter) or leave cells blank and accept bounded `content/table/cell` "fill
  me in" findings — a `--fill blank|placeholder|todo` policy chooses.

### 4. The self-check (round-trip)

After emitting, optionally load the string back through `validate`. The target:
**zero `structure/*` findings**, and only a bounded set of `frontmatter/*` /
`content/*` findings on fields the policy could not synthesise. With
`--fill placeholder` and any needed `example:` hints, the target is a *fully
clean* validate. This mirrors `init`'s self-check and becomes the capability's
backbone test (golden round-trip: `new <contract>` → `validate` → clean/bounded).

### 5. The typed builder (raised in review)

Beyond the blank `contract → string` scaffolder, expose a **typed factory**
`template.create(contract)(values) → string` whose `values` argument is derived
*from the contract* — the write-side dual of [[C-0002-typed-consumption]]. The
generator already walks the section/leaf/schema IR to *place* content; the only
addition is a static **input type** and a values-merge step:

- **Input type derivation.** Frontmatter comes from the schema — `z.input<>` of a
  Zod object, or the declarative fields — required/optional and enum unions
  preserved. Body fills come from the grammar and leaves: a prose section → a
  `string`; a `table` leaf → rows typed by its declared columns/cells (the same
  typed-row shape the consumption model already derives, `core/model.ts`); a
  `list` → items. This is the exact machinery C-0002 uses to type `read`, run in
  the input direction, so it costs little beyond what already exists.
- **Placement, not authoring.** `create(values)` fills the supplied values into
  the positions the walk emits (frontmatter keys, under-heading prose, table
  rows) and falls back to the skeleton's placeholder for anything omitted — so
  `create(contract)({})` *is* the blank scaffold, and `new` is the CLI over the
  empty-values case.
- **Stronger round-trip.** Because `values` is typed by the contract, whole
  classes of "fill me in" findings (a bad enum member, a missing required field)
  become **compile-time type errors** rather than post-hoc validation findings —
  the builder can't place a value the validator would reject.
- **Scope.** For a **declarative** contract the input type is data-derived and
  clean; for a **combinator Zod** contract it rides `z.input<>` directly (tighter
  than the generation side, which needs `z.toJSONSchema()`), with `.transform()`
  inputs the one rough edge. This is additive over §1–4: same walk, plus a type
  and a merge — no engine change.

## Why

- **It is the dual of an already-shipped transform.** `init` proves the IR is
  walkable and round-trippable in one direction; generation is the same IR walked
  the other way, so most of the risk is already retired.
- **Deterministic where it can be, honest where it can't.** Structure and the
  declarative schema invert cleanly; the parts that don't (arbitrary regex, opaque
  Zod, cross-cutting rules) are named as limits and handled with a placeholder +
  a "fill me in" finding, never a silent wrong value.
- **A vocabulary addition, not an engine change.** The only new *format* surface
  is an optional `example:`/`placeholder:` hint; everything else is a front-end
  code path over existing IR, preserving one-way layering and the read-only engine.
- **The round-trip keeps create/validate/read from drifting.** A scaffold that
  must pass the very contract that generated it cannot describe a different shape
  — the same single-source-of-truth promise validation and consumption already
  share, extended to creation.

## Consequences

- A new `declarative` front-end module (`new`/`scaffold`) plus a CLI verb;
  imports stay one-way `cli → runner → core` per [[D-0006-packaging]]; the engine
  and the read-only posture ([[D-0007-engine-scope-and-fidelity]]) are untouched.
- **A small format addition** — the optional `example:`/`placeholder:` schema
  annotation ([[D-0008-declarative-contract-dsl]]). It is inert for validation
  (ignored by the checker) and consumed only by the generator, so it is additive
  and backward-compatible.
- **Best-effort for combinator Zod.** Code contracts using `.refine()` /
  `.transform()` scaffold only their structural subset; this must be documented,
  not hidden. Pure declarative contracts scaffold fully.
- **Cross-cutting `rule` / `docRule` / text constraints are not guaranteed.**
  They are predicate functions a scaffold cannot invert; the generator leaves
  them as author-review items and (optionally) lists them via the self-check.
- The generator **depends on the validator** for its self-check — the same
  healthy producer↔consumer coupling `init` has.

## Options considered (draft)

- **Generate from the declarative IR (preferred) vs. from the compiled code
  contract.** The declarative object is the invertible one and makes generation
  the literal dual of `infer.ts`; a `Contract.new()` door for the code path is
  possible but is best-effort (via `z.toJSONSchema()`). Lead with declarative.
- **Blank scaffolder vs. typed builder — offer both (§5).** The `contract →
  string` scaffolder serves the CLI / human path; the typed
  `create(contract)(values)` factory serves tooling and moves fill errors to
  compile time. They share one walk (the builder is the scaffolder with a typed
  values-merge), so both ship from the same code path.
- **Regex inversion vs. `example:` annotation vs. TODO token.** Full regex
  generation is out of scope (unbounded); a restricted-subset generator is a
  maybe; the **annotation** is the clean, predictable fix, with a TODO token as
  the no-hint fallback.
- **Emit minimal-valid vs. fully-commented template.** A `--fill` / `--optional`
  policy exposes both rather than picking one.
- **Verb name — `new` vs `scaffold` / `generate` / `create` / `stub`.** `init`
  is taken by config scaffolding; `new` reads as "a new document of this type".
  Unresolved.

## Open questions (draft)

- Exact spelling and scope of the `example:` / `placeholder:` annotation — per
  field only, or also per table cell / list item? Does it live in the schema node
  or a sibling `examples:` block?
- How far to push combinator-Zod inversion via `z.toJSONSchema()` before
  declaring a field non-invertible?
- Should `new` optionally run the self-check by default, or only under a flag?
- Verb name, and whether `new <type>` resolves a contract by config key, path, or
  both.
- Is a markdown *emitter* (headings, tables, anchors, fences) worth extracting as
  a reusable module, given the parse dialect (`core/dialect`) is parse-only and
  offers no stringifier to reuse?

## Out of scope

- **Generating prose / content.** The generator emits *shape*; meaning is the
  author's. This is the line [[D-0007-engine-scope-and-fidelity]] draws.
- **Rewriting existing documents.** `new` creates a new file; it never edits one
  (the `fix`/`TextEdit` finding shape stays "describes only").
- **Full arbitrary-regex inversion** and **inverting opaque combinator predicates**
  (`.refine`/`.transform`) — named limits, handled by placeholders.
- **Interpolation / iteration / conditionals** — that is a template engine built
  *on* this primitive, not this primitive.

## References

- [[C-0011-document-scaffolding]] — the capability this decision analyses and
  proposes a shape for (the `new` command, product view).
- [[C-0008-config-scaffolding]] and [[D-0009-config-inference]] — the inverse
  transform (`docs → contract`) whose walk, serialisation, and self-check this
  mirrors.
- [[C-0006-declarative-yaml-contracts]] and [[D-0008-declarative-contract-dsl]] —
  the declarative format that inverts, and the vocabulary the `example:` hint
  would extend.
- [[C-0005-two-plane-contract-engine]] — the IR (`Spec` / `LeafSpec` / schema)
  the generator walks and the `validate` door the self-check uses.
- [[C-0003-corpus-cli]] — the binary `new` adds a verb to.
- [[D-0007-engine-scope-and-fidelity]] — the read-only posture the generator
  inherits (writes a new file, never edits docs; emits shape, never prose).
- [[D-0006-packaging]] — the one-way `cli → runner → core` layering the generator
  respects.
