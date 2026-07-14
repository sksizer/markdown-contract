---
title: How it works
description: One parse, three cooperating validation planes, one finding shape — and a typed model from the same contract.
sidebar:
  order: 3
---

markdown-contract parses a document once and runs everything — structure
checks, content checks, cross-cutting rules, and the typed model — off that
single parse.

## One parse

Each document is parsed with [remark/mdast](https://github.com/syntax-tree/mdast)
(GitHub-flavored markdown plus YAML frontmatter), extended with an in-house
[dialect](/reference/dialect/) for two Obsidian conventions many docs corpora
already use:

- line-terminal `^block-id` **anchors**, which make sections, tables, and
  blocks addressable,
- `[[wikilinks]]` and `![[transclusions]]`, with `|alias` and `#fragment`
  parts recognized.

The parse is projected into a **position-carrying section tree**: every
section, table, list, and code block knows its source line. That is what lets
every finding land as `path:line` instead of an opaque JSON pointer.

## Three cooperating planes

A contract declares three kinds of expectations, and each is handled by the
mechanism that is actually good at it:

- **Structure** — a small tree grammar over sections and block kinds:
  `sections`, `section`, `optional`, `oneOf`, and `gap`, nested to any depth,
  with `order` and `allowUnknown` set per level. This covers the one axis a
  schema language cannot express: *these sections, in this order, with room
  for extras*.
- **Content** — [Zod](https://zod.dev) at every leaf. The frontmatter is a
  plain Zod schema; inside sections, a small leaf vocabulary (`table`, `list`,
  `code`, `maxWords`) compiles to Zod checks over the projected blocks, with
  raw Zod as the escape hatch for anything richer.
- **Rules** — named checks for what neither plane covers: `rule` attaches to a
  section, `docRule` sees the whole document (so a frontmatter field can gate
  a body section), and `requires` / `forbids` declare text constraints without
  writing a function at all.

The split is deliberate. Schema languages and tree grammars can each express
things the other cannot, so markdown-contract never forces one to fake the
other — the same "grammar + datatype library + rules" shape the XML
structured-authoring world (RELAX NG, Schematron) ran on for decades, applied
to markdown. The working doctrine: **kind and presence are structure; data
shape is content.**

## One finding shape

Every mechanism reports the same record:

```ts
{ id: "structure/section-missing", level: "error", path: "D-9001.md",
  pos: { line: 8, col: 1 }, message: "required section 'Decision' is missing" }
```

Rule ids are namespaced by plane, severity (`error` / `warn` / `report`) is
contract data, and the CLI renders findings as human text, raw JSON, or SARIF
2.1.0 for code scanning. Findings sort deterministically — by line, then
column, then plane — so two runs over the same input always report the same
thing in the same order.

The finding record and its rule ids are catalogued in the [findings
reference](/reference/findings/); the output formats and flags are in the [CLI
reference](/reference/cli/).

## Validation and consumption are the same contract

A compiled contract has two doors (both in the [API reference](/reference/api/)):

- `contract.validate(src, { path })` returns `{ findings, doc?, tree }` and
  **never throws** — the shape CI wants.
- `contract.read(src, { path })` returns the typed `Doc` or throws a
  `ContractError` carrying the findings — the shape a consumer wants.

The `Doc` is a navigable typed view of the document (its full surface is the
[model reference](/reference/model/)): `doc.frontmatter` is typed by the
frontmatter schema; `doc.body` reaches each declared section by its heading
(`doc.body.Summary`, or `doc.body.section("Summary")` for dynamic names);
tables read back as iterable typed-row collections; anchors resolve with
`doc.byAnchor(id)`. Because the model is derived from the contract, checking
and consuming can never drift apart.

Two smaller conveniences fall out of the same design:

- **Repeatable sections.** A heading that legitimately recurs — a changelog's
  `## Release`, a log's `## Entry` — is declared `repeatable` (with optional
  `min` / `max` bounds) and reads back as a positional array, while an
  *undeclared* duplicate heading is still an error.
- **No contract required to navigate.** `parse()` alone yields the positioned
  tree, with helpers for finding sections, filtering blocks, and recovering
  verbatim table cells — see the [read examples](/appendix/examples/read/).

## From one document to a corpus

Everything above is one document against one contract. The **corpus runner**
scales it to a tree: a config maps include/exclude globs to contracts
(first match wins), the runner walks the files, validates each against its
contract, and aggregates the findings into one report with an exit code. The
CLI is a thin shell over exactly this call — anything it does, your own code
can do in-process with [`runCorpus`](/reference/api/).

For where each of these pieces lives in the codebase — and how the CLI,
runner, and engine relate — see [Architecture](/architecture/).
