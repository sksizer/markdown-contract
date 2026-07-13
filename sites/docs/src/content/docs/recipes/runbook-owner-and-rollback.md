---
title: Runbooks with an on-call owner and a real rollback
description: A runbook is only useful mid-incident. Require a pageable owner in frontmatter and make the Rollback section a step-by-step checklist, not prose.
---

**The situation.** It's 3am, the pager just fired, and the runbook is the
product. Two things decide whether the incident ends in ten minutes or two
hours: the runbook names a person you can actually page, and the rollback is a
step-by-step checklist you can execute half-asleep — not a paragraph of prose
that assumes context you don't have. Nothing enforces either, so runbooks decay
into "ask the team" and "roll back if needed."

This is the full runbook template. [Validate several doc types in one
repo](/recipes/multiple-doc-types/) uses a two-line mini version of it as one
rule among many; here the runbook gets the whole contract — a typed owner, a
service name, and a rollback that must be a real, non-trivial checklist.

## 1. Write the contract

Frontmatter pins *who* and *what*; the body pins the shape of the response.
The `format: email` on `owner` is the difference between a pageable human and
"the payments team":

```yaml
# runbook.contract.yaml
mcVersion: 1
kind: contract
frontmatter:
  fields:
    owner:   { type: string, format: email }   # a person you can page, not a team name
    service: { type: string }
body:
  sections:
    - section: Symptoms
    - section: Diagnosis
      optional: true
    - section: Rollback
      content:
        list: { everyItem: checkbox, minItems: 2 }   # step-by-step, tickable, non-trivial
```

`Diagnosis` is `optional` — some rollbacks are unconditional. `Rollback` is not,
and its `content` leaf says the section must contain a **list** whose every item
is a **task-list checkbox** (`- [ ]` / `- [x]`), at least two of them. Every key
is documented in the [Declarative YAML reference](/reference/yaml/).

## 2. Run it

Three runbooks under `runbooks/`: one clean, one with no `owner` and a prose
rollback ("pin the previous release and keep an eye on the dashboard"), and one
whose rollback is plain bullets instead of checkboxes:

```sh
markdown-contract validate runbooks --contract runbook.contract.yaml
```

```text
Scanned 3 files; 3 matched, 0 unmatched

queue-backlog.md:12 error content/list/item-kind — list item is not a checkbox (‘- [ ]’ / ‘- [x]’)
queue-backlog.md:13 error content/list/item-kind — list item is not a checkbox (‘- [ ]’ / ‘- [x]’)
search-latency.md error frontmatter/required — frontmatter field ‘owner’ is required
search-latency.md:11 error structure/block-kind — block in section ‘Rollback’ is a paragraph; expected a list

4 finding(s): 4 error, 0 warn, 0 report
```

Both failure modes the contract exists for, on their exact lines: the prose
rollback is `structure/block-kind` (a paragraph where a list was declared), the
plain bullets are `content/list/item-kind` (a list, but not a tickable one).
The missing `owner` prints with no `:line` — there is no line to point at when
the key is absent, so the finding is pinned to the file. Exit **1**, so CI
fails.

:::tip
The `minItems: 2` floor catches the degenerate "checklist" too. A rollback
that is one checkbox — `- [ ] roll back` — gets its own finding:

```text
one-step.md:12 error content/list/min-items — list has 1 items; expected at least 2
```

If one tickable step genuinely is the whole rollback, it can say more than
"roll back" — which command, and what to watch afterwards.
:::

Add the owner and turn both rollbacks into checkboxes, and the run is clean:

```text
Scanned 3 files; 3 matched, 0 unmatched

No findings.
```

Exit **0** — the gate is the exit code, as always
([exit-code contract](/reference/cli/#exit-codes)).

## 3. Wire it into CI

One step; any non-zero exit fails the job:

```yaml
# .github/workflows/runbooks.yml
name: runbooks
on: [push, pull_request]
jobs:
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Install markdown-contract first — it's built from source until it's on
      # npm; see Getting started. Then gate the runbooks:
      - run: markdown-contract validate runbooks --contract runbook.contract.yaml
```

When runbooks are one doc type among several, fold this contract into a
`markdown-contract.yaml` config instead and validate the whole tree with one
command — [Validate several doc types in one repo](/recipes/multiple-doc-types/).

## What's happening

- **`format: email` is a named string format** (one of a closed set — `url`,
  `uuid`, `date`, and friends; see the field vocabulary in the
  [Declarative YAML reference](/reference/yaml/)). A present but
  non-email owner fails too: `owner: the payments team` yields
  `frontmatter/type — frontmatter field ‘owner’ is not a valid email`.
- **The rollback fails three distinct ways**, and each gets its own rule id:
  prose instead of a list is `structure/block-kind`, plain bullets are
  `content/list/item-kind`, and too few steps is `content/list/min-items`. The
  first is the structure plane (is the right kind of block there?), the other
  two are the content plane (is the block right?) — one parse feeds both; see
  [how it works](/how-it-works/) and the full rule catalog in the
  [Findings reference](/reference/findings/).
- **`frontmatter/required` is document-scoped** — an absent key has no source
  line, so the finding carries the path alone. Every other finding above is
  position-pinned to the offending line.

:::note
The contract checks that the checklist is *structurally* real — tickable,
non-trivial steps. It can't check that `deployctl pin payments --prev` is the
right command; that part is still on the author. What it removes is the failure
mode where nobody notices the rollback section is an IOU until the night it's
needed.
:::

## Next

- [Postmortems with a timeline table and action items](/recipes/postmortem-timeline-and-actions/)
  — the companion incident doc, with a `table` leaf beside the checklist.
- [Every document names a real owner](/recipes/enforce-owner-across-tree/) —
  push the `owner` requirement across the whole tree, not just runbooks.
- The runbook schema in [Real-World Schemas](/examples/real-world-schemas/real-world-schemas-07/)
  is a liftable variant with a severity enum.
