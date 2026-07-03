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
dialect for the Obsidian conventions many docs corpora already use:

- line-terminal `^block-id` **anchors**, which make sections, tables, and
  blocks addressable,
- `[[wikilinks]]` and `![[transclusions]]`, with `|alias` and `#fragment`
  parts recognized.

The parse is projected into a **position-carrying section tree**: every
section, table, list, and code block knows its source line. That is what lets
every finding land as `path:line` instead of an opaque JSON pointer.

## Three cooperating planes

A contract declares three kinds of expectations, each handled by the mechanism
that is actually good at it:

- **Structure** — a small tree grammar over sections and block kinds:
  `sections`, `section`, `optional`, `oneOf`, and `gap`, nested to any depth,
  with `order` and `allowUnknown` set per level. This covers the one axis a
  schema language cannot express: *these sections, in this order, with room
  for extras*.
- **Content** — [Zod](https://zod.dev) at every leaf. The frontmatter is a
  plain Zod schema; inside sections, a finite leaf vocabulary (`table`,
  `list`, `code`, `maxWords`) compiles to Zod checks over the projected
  nodes, with raw Zod as the escape hatch for anything richer.
- **Rules** — named functions for what neither plane covers: `rule` attaches
  to a section, `docRule` sees the whole document (so a frontmatter field can
  gate a body section), and `textRule`/`requires`/`forbids` declare text
  constraints without writing a function at all.

The split is deliberate: schema languages and tree grammars are formally
incomparable, so markdown-contract never forces one to fake the other. It is
the same "grammar + datatype library + rules" shape the XML structured-authoring
world (RELAX NG, Schematron) ran on for decades — applied to markdown.

## One finding shape

Every mechanism reports the same record:

```ts
{ id: "structure/section-missing", level: "error", path: "D-9001.md",
  pos: { line: 8, col: 1 }, message: "required section 'Decision' is missing" }
```

Rule ids are namespaced, severity (`error` / `warn` / `report`) is contract
data, and the CLI renders findings as human text, raw JSON, or SARIF 2.1.0 for
code scanning.

## Validation and consumption are the same contract

A compiled contract has two doors:

- `contract.validate(src, { path })` returns `{ findings, doc?, tree }` and
  **never throws** — the shape CI wants.
- `contract.read(src, { path })` returns the typed `Doc` or throws a
  `ContractError` carrying the findings — the shape a consumer wants.

The `Doc` is a navigable typed view of the document: `doc.frontmatter` is
typed by the frontmatter schema; `doc.body` reaches sections by camelCase key
(`doc.body.summary`) or exact heading (`doc.body.section("Summary")`); tables
are iterable typed-row collections; anchors resolve with `doc.byAnchor(id)`.
Because the model is derived from the contract, checking and consuming can
never drift apart.

## Architecture

The package is three layers, and imports flow one way:

| Layer | Role |
|---|---|
| `core` | one document × one contract → findings + tree + doc. Pure — no file system, no `process`. |
| `runner` | a corpus config (globs → contracts) → aggregated findings across a tree of files, with first-match routing. |
| `cli` | the `markdown-contract` bin: argv → runner → format → exit code. A thin shell over the library. |

The engine carries no knowledge of any particular repository — corpora are
described declaratively (see [Getting started](/getting-started/)) — and the
validator is strictly **read-only**: it never rewrites a document.
