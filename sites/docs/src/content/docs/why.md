---
title: Why markdown-contract
description: The problems markdown-contract solves — untrustworthy document structure and hand-rolled parsing — and the one idea behind the solution.
sidebar:
  order: 2
---

Teams keep their durable knowledge in markdown — decision records, runbooks,
planning docs, changelogs. It is the cheapest format people actually keep
writing: plain text, diffs well, works in every editor.

The trouble starts when you need to **rely** on those documents:

- Does every decision record actually have a *Decision* section?
- Is `status` one of the values your tooling expects?
- Can a script read the *Ports* table without hand-rolled parsing?

## The problems

**Structure you can't trust.** Markdown has no schema. A required section gets
dropped in review, a status field picks up a typo, a table loses a column —
and nothing notices until a human or a script trips over it. The rules exist;
they live in people's heads and in review comments, where they don't scale.

**Checks that don't transfer.** Where teams do enforce document rules, it is
with ad-hoc regex and bespoke per-repo scripts. Each one re-implements the same
things — frontmatter slicing, section walking, table parsing — slightly
differently, and they drift apart silently. This project was born from a
planning corpus that had accreted seven copies of the same frontmatter regex
and three section-alias tables that no longer agreed.

**Consumers that re-parse what was already checked.** Even with validation in
place, every dashboard, report generator, or migration script that *reads* the
documents parses them again from scratch — its own selectors, its own cell
splitting, its own bugs.

**A gap no existing tool fills.** Frontmatter validators check the YAML and
stop. Markdown linters check style, not meaning. Body-structure contracts —
"these sections, in this order, this table with these columns" — exist nowhere
off the shelf, and a CMS solves the problem only by taking the documents away
from plain markdown. The alternative at the other extreme, ad-hoc scripts, you
have already met. markdown-contract is the missing middle.

## The solution: one contract, two payoffs

You declare a **contract** per document type: the frontmatter fields, the
section structure, the shape of tables and lists, and any cross-cutting rules.
From that single declaration you get both:

- **Validation** — [findings](/reference/findings/) with `path:line` positions,
  ready for a terminal, a JSON pipeline, or a SARIF upload to code scanning,
  with CI-ready exit codes.
- **A typed [model](/reference/model/)** — the same contract that checks a
  document also types it, so a section's prose, a table's rows, and a
  frontmatter field are ordinary typed reads, not string spelunking.

Check and consume are never two definitions that drift apart; they are one.
That single idea — *validation and consumption are the same contract* — is the
core of the design.

## What shaped it

- **Findings you can act on.** Every mechanism reports the same finding shape,
  positioned to the source line. Severity (`error` / `warn` / `report`) is
  declared in the contract, not chosen at the call site, so a rule can't be
  strict in one place and lax in another by accident.
- **The right tool per axis.** A schema language cannot express "these
  sections, in this order, with room for extras" — and a tree grammar is poor
  at datatypes. So markdown-contract uses both where each is strong: a small
  section grammar for structure, [Zod](https://zod.dev) for content, and named
  rules for everything cross-cutting. See [How it works](/how-it-works/).
- **Read-only by design.** The validator never rewrites your documents.
  Formatting, repair, and normalization are deliberately someone else's job.
- **Deterministic, no model in the loop.** Every finding comes from ordinary
  code, so the same input always produces the same verdict — the property a CI
  gate needs.
- **Generic engine, declarative corpus.** The engine carries no knowledge of
  any particular repository. A [`markdown-contract.yaml`](/reference/yaml/)
  maps directories and globs to contracts, so validating a whole docs tree is
  configuration, not code — and simple contracts need no TypeScript at all.
- **Proven on itself.** This repository validates its own planning corpus —
  189 documents across six contracts — with the tool it ships. See [the
  dogfood example](/appendix/examples/automate/automate-04/).

## What it is not

- **Not a formatter.** Line length, wrapping, and table padding belong to a
  formatter. markdown-contract asserts *presence and shape*, never placement
  and whitespace.
- **Not a CMS or site generator.** Your files stay plain markdown in your
  repo; markdown-contract only validates and reads them. (A CMS could be built
  *on* it — a contract already provides save-time validation and typed reads —
  but that is a consumer's job, not this library's.)
- **Not a template engine.** Contracts validate documents; they never generate
  prose. The closest they come is [`init`](/reference/cli/), which infers a
  contract *from* existing documents — the inverse of generation.

:::note[See also]
The [glossary](/reference/glossary/) defines the load-bearing terms (*contract*,
*finding*, *plane*, *dialect*), and each mechanism has its own reference page:
[findings](/reference/findings/), [model](/reference/model/),
[CLI](/reference/cli/), [YAML](/reference/yaml/), and [API](/reference/api/).
:::

Next: [How it works](/how-it-works/) for the technical approach,
[Architecture](/architecture/) for the shape of the codebase, or
[Getting started](/getting-started/) to run it.
