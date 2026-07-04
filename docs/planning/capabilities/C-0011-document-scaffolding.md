---
type: capability
schema_version: '1'
id: C-0011
kind: feature
title: Document scaffolding
status: open/proposed
created: '2026-07-03'
parent_key: null
contains: []
related:
  - '[[D-0017-contract-to-document-generation]]'
  - '[[C-0008-config-scaffolding]]'
  - '[[C-0001-contract-validation]]'
  - '[[C-0002-typed-consumption]]'
  - '[[C-0006-declarative-yaml-contracts]]'
  - '[[C-0005-two-plane-contract-engine]]'
  - '[[C-0003-corpus-cli]]'
  - '[[D-0008-declarative-contract-dsl]]'
tags:
  - scaffolding
  - generation
  - template
  - cms
  - init
  - draft
need_human_review: true
---

# Document scaffolding

> **Draft.** This is a product-perspective capability sketch for review, not a
> committed feature. The engineering feasibility, the gaps, and the surface are
> analysed in the companion decision [[D-0017-contract-to-document-generation]];
> open questions are collected at the end.

## Summary

- **`markdown-contract new <contract>`** turns a contract into a **starting
  document** — an empty-but-valid markdown skeleton that already carries the
  required frontmatter keys, the required sections in the right order, and stub
  blocks (a table's header row, a checkbox list) — for a human (or a form) to
  fill in. It is the missing third door beside [[C-0001-contract-validation]]
  (*validate*) and [[C-0002-typed-consumption]] (*read*): from one contract you
  get **create, validate, read**. ^summary
- It is the **exact dual of [[C-0008-config-scaffolding]]**: `init` reads a
  folder of documents and writes the contract they share; `new` reads a contract
  and writes a document that satisfies it. The same declarative shape drives both
  directions, so a scaffolded document and the contract that gates it can never
  describe different things.
- Scaffolding emits **shape, never prose.** The generator produces the document's
  structure and placeholder values; the author supplies the meaning. This keeps
  it inside the read-only, "never generate content" line the project draws — the
  stub is *structure a human completes*, not authored content — while making the
  claim on the docs site precise: markdown-contract is **not** a template engine
  or a CMS, but `new` is the primitive one would build either on.

## Statement

A consumer who already has a contract — hand-authored in code or YAML, or
inferred by `init` — wants a conforming document to start from. Today they copy a
sibling file and delete its content, or keep a hand-maintained template that
silently drifts from the contract. Document scaffolding removes that step: point
`new` at a contract and it walks the contract's declared shape and emits a fresh
`.md` whose structure passes that contract by construction.

The generated document is a **filled outline**: YAML frontmatter with every
required key and a starter value (an enum's first member, a `const`'s literal, a
`format: date` set to today, an `optional` key omitted); the required sections as
headings in the contract's order, at the right nesting depth; and, where a section
declares a leaf, a stub for it — a table's header row from its declared columns, a
checkbox list, a fenced code block tagged with the right language. What the
generator cannot synthesise (a free-form `pattern` field, the prose under a
heading) is left as a visible placeholder for the author, and — by design —
surfaces as a bounded, enumerable set of "fill me in" findings when the stub is
re-validated, never as a structural failure.

This adds no new engine surface and no new format. It is a code path that *writes*
a well-formed document, then (optionally) loads it back through `validate` to
prove the scaffold satisfies its own contract — the same producer-then-consumer
shape [[C-0008-config-scaffolding]] already uses.

## What it provides

- A new CLI verb — **`markdown-contract new <contract> [--out <file>]`** — that
  emits one conforming markdown document from a contract, to stdout or a file.
- A library entry point beside `validate` / `read`, in **two shapes**: a pure
  `contract → string` scaffolder for the blank skeleton, and a **typed builder**
  `template.create(contract)(values) → string` whose `values` argument is typed
  *by the contract* (see [Typed builder](#typed-builder--the-write-dual-of-read)).
  Tools (an editor "New" command, a CMS, a bot) use either without shelling out.
- **Deterministic structure from the contract**: required sections as ordered
  headings, correct heading depth from nested grammars, block-id `^anchors` where
  the contract declares them, and per-leaf stubs (table header row + separator,
  checkbox/ordered list, fenced code with the declared `lang`).
- **Starter frontmatter values** synthesised as tightly as the contract allows:
  `const` and `default` verbatim, `enum` → first member, `format` → a canonical
  specimen (`date` → today, `email`/`url`/`uuid` → a placeholder specimen),
  numbers → `0`, booleans → `false`, arrays → empty (or a stub element). Required
  keys are emitted; optional keys are omitted (or emitted commented, by policy).
- **Policy knobs** for the choices a contract leaves open: whether `optional`
  sections are omitted or emitted as commented hints, which branch of a `oneOf`
  to emit, and how unsatisfiable leaves are filled (`blank` / `placeholder` /
  `todo`).
- A **round-trip guarantee** the author can rely on: a scaffold validates with
  **zero structural findings**, and (with placeholders enabled and any needed
  hints present) a fully clean validate — a document that is valid the moment it
  is created. See [[D-0017-contract-to-document-generation]].

## Inputs

- **One contract** — a compiled code contract, or a declarative
  `*.contract.yaml` ([[C-0006-declarative-yaml-contracts]]) — plus optional
  policy flags. Optionally a corpus config, so `new <type>` can name a contract
  by its config key rather than a path.

```bash
# from a YAML contract file
markdown-contract new ./contracts/decision.contract.yaml --out D-0018.md

# by contract key, resolved through the discovered markdown-contract.yaml
markdown-contract new decision --out docs/planning/decisions/D-0018.md
```

What it reads from the contract: the **frontmatter schema** (fields, types,
enums, formats, defaults, required/optional), the **section grammar** (sections,
order, nesting, `optional`/`oneOf`/`gap`, anchors), and each section's **leaf**
declaration (`table` columns, `list` shape, `code` lang, `maxWords`).

## Outputs

- A single **conforming markdown document** — the same bytes a human would author
  to satisfy the contract, minus the prose. Written to `--out` or printed to
  stdout (`--dry-run`-style) so it can be piped or previewed.

```markdown
---
type: decision
id: D-0000            # TODO: assign (pattern ^D-\d{4}$)
title: ''            # TODO
status: open/proposed
created: '2026-07-03'
---

# TODO: title

## Summary

<!-- TODO -->

## Context

<!-- TODO -->

## Decision

<!-- TODO -->

## Why

<!-- TODO -->

## Consequences

<!-- TODO -->

## References

<!-- TODO: cite at least one [[related entity]] -->
```

The console reports what it emitted and what it could not synthesise (which
fields fell to a placeholder, which sections were left as `oneOf`/`optional`
choices) so the author knows exactly what remains to fill in.

## Typed builder — the write-dual of `read`

The blank skeleton above is the *human* on-ramp. For tooling, the same contract
should also produce a **typed builder**: a factory bound to the contract that
takes a typed structure of the values to fill in and places them in the right
positions. It is the exact write-side mirror of [[C-0002-typed-consumption]] —
the contract that types a document for *reading* (`doc.frontmatter.status` is a
typed read) types the value structure for *writing* just as well.

```ts
import { contract, template } from "markdown-contract";
import { z } from "zod";

const decision = contract({
  frontmatter: z.object({ status: z.enum(["active", "closed", "pending"]) }),
  body: /* sections(…) */,
});

const make = template.create(decision);          // typed factory bound to the contract
const md = make({ frontmatter: { status: "closed" } });
//                              ^ typed "active" | "closed" | "pending";
//                                a wrong value is a compile error, not a runtime finding
```

- **The input type is derived from the contract**, not hand-written: frontmatter
  from its schema (`z.input` of the Zod object / the declarative fields), body
  fills from the section grammar and leaves (a prose section → a string; a `table`
  leaf → rows typed by its declared columns; a `list` → items). Required fields
  are required in the input, optional fields optional, enums narrowed to their
  unions.
- **The builder *places* the values** — frontmatter keys into the YAML block,
  prose under the right heading, rows into the declared table — the same positions
  the validator checks and `read` navigates. Anything not supplied falls back to
  the skeleton's placeholder, so `make({})` is exactly the blank scaffold.
- **One contract, typed both ways.** `read`: document → typed values;
  `create`: typed values → document. Because both derive from the same contract,
  a builder can't place a value the validator would reject, and the two can never
  drift. This is the shape closest to a real template engine — a typed template
  instantiated with data — while still not authoring prose: it places values, it
  does not invent content.

*(Origin: reviewer idea on this PR — a typed function/wrapper over the contract
that supplies a typed data structure of the fill-in values.)*

## Hook points

- **The scaffold is a starting point; the author owns the content.** Generated
  markdown is ordinary — nothing about it is generated-and-locked; the author
  edits freely, and the contract that produced it is the contract that then gates
  the edits.
- **Fill policy is the one product dial.** `--fill blank|placeholder|todo` and
  the `optional`/`oneOf` policies decide how much scaffolding the author sees:
  the minimum valid skeleton, or a fully-commented "here is everything you may
  add" template.
- **Producer of the same shapes it validates, so it tracks them.** As the
  [[D-0008-declarative-contract-dsl]] vocabulary grows (new `format`s, richer
  leaves), `new` can emit more — it writes the shape, it does not define it.
- **This is the "New document" primitive.** An editor command, a project's
  document-type picker, or a CMS create-button is a thin wrapper over `new`; a
  form-driven editor is a scaffold pre-populated with field input and re-validated
  on save (see [Product framing](#product-framing)).

## Underlying implementation

- A new code path in the same front-end layer as the loaders and `init` — the
  `markdown-contract/declarative` subpath over `src/core` — plus a thin `new`
  verb in the CLI ([[C-0003-corpus-cli]]). Imports stay one-way `cli → runner →
  core` per [[D-0006-packaging]]; the engine is untouched and stays read-only.
- The generator walks the contract's own IR (the same section/leaf/schema data
  the validator consumes) and emits markdown; it then optionally loads the result
  back through `validate` for the accept-by-construction self-check — the inverse
  of `init`'s round-trip.
- The exact walk, the value-synthesis ladder, the gaps that need new contract
  metadata (an `example:`/`placeholder:` hint), and the honest limits (arbitrary
  regex `pattern`s, opaque combinator Zod, cross-cutting rules) are fixed by
  [[D-0017-contract-to-document-generation]].
- **Not yet built** — draft capability under review.

## Product framing

From a product view, a document class needs three operations, and one contract
should supply all three so they never drift:

| Operation | Door | Status |
|---|---|---|
| **Create** a conforming starting point | `new` (this capability) | proposed |
| **Validate** edits | `validate` ([[C-0001-contract-validation]]) | shipped |
| **Read** into a typed model | `read` ([[C-0002-typed-consumption]]) | shipped |

- **Basis for a template engine.** A template engine's job is to turn a
  declaration into a starting artefact. `new` does exactly that for *shape*;
  layering prose defaults, interpolation, or iteration on top is a template
  engine built *on* markdown-contract, with the contract guaranteeing the output
  is valid. markdown-contract stays "not a template engine" — it supplies the
  scaffolding primitive, not the content templating.
- **A component of a CMS.** A CMS's "new document" button, its save-time
  validation, and its typed reads are precisely create/validate/read. With `new`,
  all three come from one contract, so a CMS could sit on markdown-contract
  without a second source of truth for a document type's shape.
- **Who wants it:** authors starting a new decision/task/runbook from its type;
  tooling that opens a pre-shaped file in the editor; bots and agents that must
  produce a document another tool will then validate; adopters who ran `init` and
  now want a blank of the type it inferred.

## Notes

- Builds directly on [[C-0006-declarative-yaml-contracts]] and the engine's IR
  ([[C-0005-two-plane-contract-engine]]); it is the natural sequel to
  [[C-0008-config-scaffolding]] — that bootstraps the *contract* from documents,
  this bootstraps a *document* from the contract, closing the loop.
- Scope guard: `new` emits **structure**, not prose, and creates a **new** file —
  it never rewrites an existing document. That keeps the read-only posture
  ([[D-0007-engine-scope-and-fidelity]]) intact and keeps the docs-site framing
  ("not a template engine; never generates content") honest.

## Open questions (draft)

- Verb spelling: `new` vs `scaffold` vs `create` vs `stub`. (`init` is taken by
  config scaffolding; `new` reads as "new document of this type".)
- Should `new <type>` resolve a contract by config key, by path, or both?
- Default fill policy: minimal-valid skeleton, or fully-commented template?
- How much of the "fill me in" story is TODO comments vs. a re-validate pass that
  lists the outstanding findings — or both?
