---
title: Turn your ADR convention into an enforced template
description: Your team agreed every ADR has Status, Context, Decision, and Consequences — but the agreement lives in a wiki page nobody reads. Make it a contract CI enforces.
---

**The situation.** Your team keeps architecture decision records in `docs/adr/`,
and long ago agreed what one looks like: an `ADR-NNNN` id, a status from a fixed
set, a date, and four sections — **Status**, **Context**, **Decision**,
**Consequences** — in that order. The agreement lives in a wiki page nobody
reads. New ADRs invent statuses, skip *Decision* entirely, and reorder the rest;
you only notice months later, when you're trying to find out why something was
decided.

The template is already precise enough to be a contract. Write it down once as
YAML and let CI enforce it, so the wiki page becomes documentation of a rule
that's actually checked.

## 1. Write the contract

One plain YAML file captures the whole convention — the typed frontmatter *and*
the four-section body:

```yaml
# adr.contract.yaml
mcVersion: 1
kind: contract
frontmatter:
  strict: true                         # only the keys below are allowed
  fields:
    id:     { type: string, pattern: '^ADR-\d+$' }
    status: { enum: [proposed, accepted, superseded] }
    date:   { type: string, format: date }
body:
  order: strict                        # the four sections, in this order
  allowUnknown: true                   # extra sections are fine
  sections:
    - section: Status
    - section: Context
    - section: Decision
    - section: Consequences
```

Three frontmatter fields, three different constraints: `pattern` pins the id
format, `enum` closes the status set, and `format: date` requires a real
ISO-8601 date — not just any string. On the body, `order: strict` means the four
sections must appear in exactly this order, while `allowUnknown: true` still
lets an author add a *References* or *Notes* section without breaking the build.
All four sections are required here; if your team treats *Consequences* as
optional, add `optional: true` to that node. Every key is documented in the
[Declarative YAML reference](/reference/yaml/).

:::tip
Don't want to transcribe the wiki page by hand? Run `init` over the ADR folder
you already have and it infers a starting contract from the documents
themselves — see [Infer a contract from docs you already have](/recipes/infer-a-contract-with-init/).
You'll usually tighten what it emits (it can't know `rejected` was a typo),
but it does the tedious part.
:::

## 2. Run it

Point `validate` at the folder. Here `ADR-0007.md` follows the template;
`ADR-0008.md` has `status: rejected` (not in the agreed set) and jumps straight
from *Context* to *Consequences* with no *Decision*:

```sh
markdown-contract validate docs/adr --contract adr.contract.yaml
```

```text
Scanned 2 files; 2 matched, 0 unmatched

ADR-0008.md:3 error frontmatter/enum — frontmatter field ‘status’ must be one of ‘proposed’, ‘accepted’, ‘superseded’
ADR-0008.md:7 error structure/section-missing — required section ‘Decision’ is missing
ADR-0008.md:15 error structure/section-order — ‘Consequences’ appears before required section ‘Decision’; strict order is violated

3 finding(s): 3 error, 0 warn, 0 report
```

Every finding lands on a source line: the bad status on line 3 where it's
written, the missing section where the body starts, and — because the order is
`strict` — a third finding on line 15, where *Consequences* turned up before the
*Decision* that should have preceded it. That last one is the same root cause
seen from the order axis; restoring the *Decision* section clears both. The run
exits **1**, so CI fails; the clean file alone prints `No findings.` and exits
**0**. (Rule ids like `frontmatter/enum` are catalogued in the
[Findings reference](/reference/findings/).)

## 3. Wire it into CI

The exit code is the gate, so the CI step is one line:

```yaml
# .github/workflows/adr.yml
name: adr
on: [push, pull_request]
jobs:
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Install markdown-contract first — it's built from source until it's on
      # npm; see Getting started. Then enforce the template:
      - run: markdown-contract validate docs/adr --contract adr.contract.yaml
```

From now on the convention isn't a wiki page — it's a failing check. A new ADR
that invents `status: rejected` gets a red build and a finding pointing at the
exact line, before anyone has to review it by hand.

:::note
The validator is **read-only**: it flags the divergence, it never rewrites the
ADR. Superseding an old decision is still an ordinary edit —
`status: superseded` is in the enum precisely so history stays valid under the
contract.
:::

## What's happening

- **Both planes, one parse.** `pattern` / `enum` / `format` are the content
  plane (Zod under the hood); `order`, `allowUnknown`, and the section list are
  the structure plane. The same parse feeds both — [how it works](/how-it-works/).
- **Strictness is per-plane.** Frontmatter is `strict: true` (an unknown key is
  a finding) while the body is `allowUnknown: true` (an extra section is fine).
  That's the usual shape for ADRs: the metadata is machine-read, so it's closed;
  the prose is for humans, so it's open.
- **`format: date` beats a hand-rolled pattern** — it's real ISO-8601
  validation, and it reads as intent. The full named-format set is in the
  [Declarative YAML reference](/reference/yaml/).
- This contract is rungs 1–2 of the Real-World Schemas ladder, which then builds
  the same ADR up rung by rung — a typed table inside *Consequences*, a custom
  rule, a corpus config — in [Real-World Schemas](/examples/real-world-schemas/).

## Next

- [A Decision section must cite an alternative](/recipes/decision-must-cite-alternative/)
  — go beyond structure: require the *Decision* prose to name what was rejected.
- [Catch docs drifting from their agreed shape](/recipes/catch-drift-with-init-check/)
  — the inferred-contract variant of this gate.
- [Validate several doc types in one repo](/recipes/multiple-doc-types/) — route
  ADRs, runbooks, and guides to their own contracts in one run.
