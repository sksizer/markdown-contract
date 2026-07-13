---
title: "Tables your tooling can rely on: typed columns"
description: A script reads a markdown table and breaks whenever someone renames a column or typos a value. Pin the columns and type the cells, and the breakage becomes a CI finding instead.
---

**The situation.** Your service roster lives in markdown — one file per team,
each with a `Services` table: `Service | Tier | Owner`. A script reads that
table to page the right owner and pick the right SLO. It works until someone
renames `Owner` to `Team`, or types `platinum` into a column that only knows
`gold`, `silver`, and `bronze` — and then the script breaks (or worse, silently
pages nobody) at the exact moment you need it.

The fix is to make the table's shape part of the contract: **named columns**,
a **per-column cell schema**, and a **row-count floor**. Renames and typos
become positioned findings before merge, not runtime surprises after.

## 1. Write the contract

The `table` content leaf declares the header and types the cells. `columns`
pins the header names; `cells` binds a schema to one column (`Tier` must be
one of three values); `minRows` rejects a header with no data under it:

```yaml
# roster.contract.yaml
mcVersion: 1
kind: contract
body:
  sections:
    - section: Services
      content:
        table:
          columns: [Service, Tier, Owner]
          minRows: 1
          cells:
            Tier: { enum: [gold, silver, bronze] }
```

Columns without a `cells` entry (`Service`, `Owner`) only have to *exist* —
their values are free-form. The full `table` config (`anchor`,
`extraColumns`, …) is in the [Declarative YAML reference](/reference/yaml/).

:::note
The `cells` schema vocabulary is the same closed node vocabulary as
frontmatter `fields` — `type`, `enum`, `const`, plus constraints like
`pattern`. Declare a cell the way you'd declare a frontmatter field.
:::

## 2. Run it

Two roster files: `roster/payments.md` conforms; `roster/platform.md` carries
both classic breakages — the renamed column and the invented tier:

```markdown
# Platform team

## Services

| Service    | Tier     | Team   |
| ---------- | -------- | ------ |
| identity   | gold     | priya  |
| billing    | platinum | jordan |
```

```sh
markdown-contract validate roster --contract roster.contract.yaml
```

```text
Scanned 2 files; 2 matched, 0 unmatched

platform.md:5 error content/table/column-missing — table is missing declared column ‘Owner’
platform.md:8 error content/table/cell — cell ‘platinum’ in column ‘Tier’ is invalid

2 finding(s): 2 error, 0 warn, 0 report
```

Both findings land on the line where the fix goes: the missing-column finding
pins to the table header (line 5), and the bad cell pins to **its own row**
(line 8, the `billing` row) — not vaguely to "the table". The run exits **1**;
rename `Team` back to `Owner`, demote `billing` to a real tier, and it's:

```text
Scanned 2 files; 2 matched, 0 unmatched

No findings.
```

— exit **0** (the [exit-code contract](/reference/cli/#exit-codes)).

:::tip
`columns` only asserts that the declared columns are *present* — an extra
column someone adds is ignored by default. If the roster's header should be
closed, add `extraColumns: error` to get `content/table/column-extra` findings
too.
:::

## 3. Wire it into CI

The exit code is the gate, so the CI step is one line:

```yaml
# .github/workflows/roster.yml
name: roster
on: [push, pull_request]
jobs:
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Install markdown-contract first — it's built from source until it's on
      # npm; see Getting started. Then gate on the contract:
      - run: markdown-contract validate roster --contract roster.contract.yaml
```

Now a column rename fails the PR that renames it, with a finding pointing at
the exact header line — instead of failing the paging script three weeks
later.

## 4. The payoff: read the table back as typed rows

The script that started all this no longer needs its own table parser. The
same contract that validated the roster **reads it back** as data — and
because the `Services` section's sole content is that one table, the section
key *is* the table:

```js
// roster-index.mjs
import { readFileSync } from "node:fs";
import { loadContractFile } from "markdown-contract/declarative";

const contract = loadContractFile("roster.contract.yaml");
const doc = contract.read(readFileSync("roster/payments.md", "utf8"), {
  path: "roster/payments.md",
});

// The Services section's sole content is its table, so the key IS the table
for (const row of doc.body.services) {
  console.log(`${row.Service}: tier ${row.Tier}, page ${row.Owner}`);
}
```

```text
checkout: tier gold, page dana
refunds: tier silver, page miguel
```

`read()` throws on any error-level finding, so a row you iterate is a row
that already passed the column and cell checks — `row.Owner` cannot be
`undefined` because the column was validated into existence. The row shape,
`column()` / `find()` accessors, and the promotion rule are in the
[typed model reference](/reference/model/); worked read-back examples are in
[Consume as Data](/examples/consume-as-data/).

## What's happening

- **Structure admits, content checks.** The structure plane requires the
  `Services` section and that its content slot holds a table at all
  (`structure/block-missing` / `structure/block-kind` if not); the content
  plane then checks the header, rows, and cells. One parse, both planes —
  [how it works](/how-it-works/).
- **`content/table/column-missing`**, **`content/table/cell`**, and friends
  (`min-rows`, `column-extra`) are stable rule ids you can filter or route on;
  the full catalog is in the [Findings reference](/reference/findings/).
- **Cell findings are row-pinned.** The `cells` schema runs per cell, and a
  rejection carries the offending row's source line — which is what makes the
  finding fixable from the CI log alone.
- The validator is **read-only**; typed read-back is a separate, explicit
  `read()` call ([Iterate a TableView's typed rows](/examples/consume-as-data/consume-as-data-04/)).

## Next

- [Build an index from your docs' frontmatter and tables](/recipes/build-an-index-from-frontmatter/)
  — the read-back loop grown into a real generator.
- [Postmortems with a timeline table and action items](/recipes/postmortem-timeline-and-actions/)
  — typed columns as one requirement among several in a bigger template.
- The `table` leaf next to its siblings (`list`, `code`, `maxWords`):
  [Declarative YAML reference](/reference/yaml/).
