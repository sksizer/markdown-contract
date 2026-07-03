---
title: Why markdown-contract
description: The problem markdown-contract solves and the drivers behind its design.
sidebar:
  order: 2
---

Teams keep their durable knowledge in markdown — decision records, runbooks,
planning docs, changelogs. It is the cheapest format people will actually keep
writing: plain text, diffs well, works in every editor.

The trouble starts when you need to **rely** on those documents:

- Does every decision record actually have a *Decision* section?
- Is `status` one of the values your tooling expects?
- Can a script read the *Files to touch* table without hand-rolled parsing?

Today the answers come from ad-hoc regex, a bespoke linter per repo, or a
heavyweight CMS that takes the documents away from plain markdown. Existing
markdown tooling validates frontmatter and then *transforms* the body — none of
it lets you declare what a document's body must look like and check it.
markdown-contract fills that gap.

## One contract, two payoffs

You declare a **contract** per document type: the frontmatter fields, the
section structure, the shape of tables and lists, and any cross-cutting rules.
From that single declaration you get both:

- **Validation** — findings with `path:line` positions, ready for a terminal,
  JSON pipeline, or SARIF upload to code scanning.
- **A typed model** — the same contract that checks a document also types it,
  so `doc.frontmatter.status` and `doc.body.summary.text()` are ordinary typed
  reads, not string spelunking.

Check and consume are never two definitions that drift apart; they are one.

## Design drivers

A few forces shaped how the library works:

- **Findings you can act on.** Every mechanism reports the same finding shape,
  positioned to the source line. Severity (`error` / `warn` / `report`) is
  declared in the contract, not chosen at the call site, so a rule can't be
  strict in one place and lax in another by accident.
- **The right tool per axis.** A schema language can't express "these sections,
  in this order, with optional gaps" — and a tree grammar is poor at datatypes.
  So markdown-contract uses both where each is strong: a small section grammar
  for structure, [Zod](https://zod.dev) for content, and named rules for
  everything cross-cutting. See [How it works](/how-it-works/).
- **Read-only by design.** The validator never rewrites your documents.
  Formatting, repair, and normalization are deliberately someone else's job.
- **Generic engine, declarative corpus.** The engine carries no knowledge of
  any particular repository. A `markdown-contract.yaml` maps directories and
  globs to contracts, so validating a whole docs tree is configuration, not
  code — and simple contracts need no TypeScript at all.

## What it is not

- **Not a formatter.** Line length, wrapping, whitespace, and table padding
  belong to a formatter. markdown-contract asserts *presence and shape*, never
  placement and whitespace.
- **Not a CMS or site generator — but a foundation one could sit on.** Your
  files stay plain markdown in your repo; markdown-contract only validates and
  reads them, and it has no interest in managing or publishing content. That
  said, a CMS needs three operations over a document type — *create* a
  conforming starting point, *validate* edits, and *read* the result into a
  typed model — and markdown-contract already delivers the last two from a
  single contract. That same contract is the natural source of the first, so a
  CMS's "new document", save-time validation, and typed reads could all rest on
  markdown-contract without those three ever drifting apart.
- **Not a template engine — but it could be the basis for one.** Contracts
  validate documents (including your scaffolding templates); they never
  generate *content*. They do, however, declare a document's *shape* — its
  frontmatter fields, its sections in order, its table columns — and that
  declaration can be walked to emit an empty-but-valid **skeleton**: the
  headings in the right order, a frontmatter block with starter values, a
  table's header row. Generating that stub is the exact dual of the `init`
  command, which already infers a contract *from* a folder of documents.
  Emitting *shape* (never prose) is the core of a template engine, and a
  contract already carries everything such a scaffolder would need.

Next: [How it works](/how-it-works/) for the technical approach, or
[Getting started](/getting-started/) to run it.
