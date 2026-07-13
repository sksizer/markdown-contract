---
title: Postmortems with a timeline table and action items
description: Postmortems get written in a hurry, and the two parts you mine later — the timeline and the action items — are the parts that go missing. Make them non-negotiable.
---

**The situation.** Your postmortems live in `postmortems/`, written in the
exhausted hour after an incident. Six months later someone asks "how long was
detection-to-mitigation trending?" and half the files have a *Timeline* section
that's a paragraph of prose, an *Action items* section that says "we should
probably add an alert", and no severity you can group by. The narrative parts
take care of themselves — it's the **mineable** parts that go missing.

The contract below makes them structural: severity from a fixed set, a timeline
that is a real table with at least two rows, and action items that are a real
checkbox list.

## 1. Write the contract

```yaml
# postmortem.contract.yaml
mcVersion: 1
kind: contract
frontmatter:
  fields:
    severity: { enum: [sev1, sev2, sev3] }
    date:     { type: string, format: date }
body:
  order: recognized-relative
  allowUnknown: true                     # extra sections (Root cause, Lessons) are fine
  sections:
    - section: Impact
      content: { maxWords: 120 }         # a scoping paragraph, not the whole story
    - section: Timeline
      content:
        table:
          columns: [Time, Event]
          minRows: 2                     # a one-row "timeline" is a caption
    - section: Action items
      content:
        list: { everyItem: checkbox, minItems: 1 }
```

Three `content` leaves do the work: `maxWords` keeps *Impact* a summary,
`table` demands `Time` / `Event` columns with at least two rows, and
`list: { everyItem: checkbox }` means action items are tickable — not prose.
All three leaves are in the [Declarative YAML reference](/reference/yaml/).

## 2. Run it — the hurried postmortem fails

Here's the classic hurried write-up. The frontmatter is fine; the mineable
sections aren't:

```md
## Timeline

Around lunchtime the queue backed up, someone restarted the workers, and it
drained by mid-afternoon.

## Action items

We should probably add a queue-depth alert at some point.
```

```sh
markdown-contract validate postmortems --contract postmortem.contract.yaml
```

```text
Scanned 2 files; 2 matched, 0 unmatched

2026-07-09-queue-backlog.md:12 error structure/block-kind — block in section ‘Timeline’ is a paragraph; expected a table
2026-07-09-queue-backlog.md:17 error structure/block-kind — block in section ‘Action items’ is a paragraph; expected a list

2 finding(s): 2 error, 0 warn, 0 report
```

Exit **1**: the sections exist, but neither holds the *kind of block* the
contract declares, so the structure plane flags both — pinned to the lines
where the prose sits.

## 3. Fixing the shape isn't enough

Suppose the author converts the prose to a table and a bullet list — but the
table has one row and the bullet isn't a checkbox. Now the structure plane is
satisfied, and the **content** plane takes over:

```text
Scanned 2 files; 2 matched, 0 unmatched

2026-07-09-queue-backlog.md:12 error content/table/min-rows — table has 1 rows; expected at least 2
2026-07-09-queue-backlog.md:18 error content/list/item-kind — list item is not a checkbox (‘- [ ]’ / ‘- [x]’)

2 finding(s): 2 error, 0 warn, 0 report
```

With two timeline rows and a real `- [ ]` item, the run prints `No findings.`
and exits **0**. Both postmortems in that clean run are ordinary
markdown — nothing about them is tool-specific.

:::tip
`minRows: 2` is deliberate: a timeline needs at least a start and an end before
you can compute a duration from it. If your review dashboard needs
detection/mitigation timestamps specifically, tighten the `Time` column with a
per-cell schema — see [Tables your tooling can rely on](/recipes/typed-table-columns/).
:::

## 4. Wire it into CI

The exit code is the gate, so the CI step is one line:

```yaml
# .github/workflows/postmortems.yml
name: postmortems
on: [push, pull_request]
jobs:
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Install markdown-contract first — it's built from source until it's on
      # npm; see Getting started. Then gate on the contract:
      - run: markdown-contract validate postmortems --contract postmortem.contract.yaml
```

See [Getting started](/getting-started/) for the install step and the
[CLI reference](/reference/cli/) for exit codes and output formats.

## What's happening

- **Two planes, two kinds of finding.** Prose where a table belongs is
  `structure/block-kind` — the wrong *kind* of block in a declared slot. Once a
  table exists, `content/table/min-rows` (and `content/table/cell`, if you add
  per-column schemas) judge what's *inside* it. Presence and kind are the
  structure plane's job; the content plane never re-reports them. The full
  catalog is in the [Findings & rule IDs reference](/reference/findings/).
- **`severity` is an enum, `date` is a named format** — `format: date` accepts
  ISO-8601 dates only, so `2026-7-9` or "last Thursday" is a
  `frontmatter/*` finding, not a value your dashboard has to sanitize later.
- **The validator is read-only.** It fails the hurried postmortem; it never
  rewrites it.
- This recipe is [REAL-WORLD-SCHEMAS-08](/examples/real-world-schemas/) in the
  example gallery, one of a set of incident-process contracts you can lift.

:::note
The payoff for the strictness: because *Timeline* is now guaranteed to be a
`[Time, Event]` table and *Action items* a checkbox list, the same contract can
`read()` every postmortem back as **typed data** — rows and items, not
markdown — and feed a review dashboard directly. That's
[Build an index from your docs' frontmatter and tables](/recipes/build-an-index-from-frontmatter/).
:::

## Next

- [Build an index from your docs' frontmatter and tables](/recipes/build-an-index-from-frontmatter/)
  — mine the tables this contract guarantees.
- [Runbooks with an on-call owner and a real rollback](/recipes/runbook-owner-and-rollback/)
  — the same treatment for the other incident doc.
- [Tables your tooling can rely on: typed columns](/recipes/typed-table-columns/)
  — per-cell schemas on top of `columns` / `minRows`.
