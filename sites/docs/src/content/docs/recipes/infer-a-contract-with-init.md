---
title: Infer a contract from docs you already have
description: You have a folder of notes that already share a shape — don't hand-author the contract. init reads the folder and writes the tightest contract that still accepts every file.
---

**The situation.** You have a folder of engineering notes that grew a de-facto
shape — same frontmatter keys, same sections — but nothing wrote that shape
down, and you're not going to reverse-engineer it into YAML by hand. `init`
does the reverse-engineering for you: it reads the folder, infers the
**tightest contract that still accepts every file**, writes it, and proves the
result against the very docs it read.

## 1. Start from the docs, not the contract

Three notes in `notes/`, each with `title` / `status` / `date` frontmatter and
**Summary** and **Details** sections. One of them — `retries.md` — also has a
**Links** section the others don't:

```markdown
---
title: Retry budget for outbound calls
status: published
date: 2026-05-11
---

# Retry budget for outbound calls

## Summary

Outbound HTTP calls get three attempts with jittered backoff, capped by a
per-service retry budget.

## Details

The budget is 10% of request volume. When retries would exceed it, calls
fail fast instead of amplifying an outage.

## Links

- Retry budget dashboard
- Incident 2026-04-19 postmortem
```

That one straggler is deliberate: it's exactly the kind of variation inference
has to handle without either rejecting the file or giving up on the section.

## 2. Run `init`

Point `init` at the folder. (The binary is built from source until the package
is on npm — see [Getting started](/getting-started/).)

```sh
markdown-contract init notes
```

```text
init: inferred 1 contract(s); wrote 2 file(s):
  markdown-contract.yaml
  notes.contract.yaml
self-check: clean (the scaffold accepts its own corpus)
```

Both files land **inside `notes/`** — the default `--out` is the inferred root
itself, so the scaffold travels with the docs it describes (pass `--out` to put
it elsewhere). The `self-check` line is `init` validating its own output: it
loads the contracts back and runs them over the folder. If an inferred
constraint were ever tighter than the data allows, that line would report it
and the command would exit **1** — here it's clean, exit **0**.

## 3. Read what it inferred

Two files came out. The router is a one-rule config that makes the folder
self-validating:

```yaml
# notes/markdown-contract.yaml — generated verbatim
mcVersion: 1
kind: config
contracts:
  notes: ./notes.contract.yaml
rules:
  - include:
      - "**/*.md"
    contract: notes
```

And the contract is plain declarative YAML — the same dialect you'd write by
hand, ready to hand-tune:

```yaml
# notes/notes.contract.yaml — generated verbatim
mcVersion: 1
kind: contract
frontmatter:
  strict: true
  fields:
    title:
      type: string
    status:
      type: string
    date:
      type: string
      format: date
body:
  order: recognized-relative
  allowUnknown: false
  sections:
    - section: Summary
    - section: Details
    - section: Links
      optional: true
```

Every choice traces back to the corpus: **Summary** and **Details** appeared in
every note, so they're required; **Links** appeared in only one, so it's
`optional: true`. All three dates parsed as dates, so `date` got
`format: date`. And no note carried an unlisted frontmatter key or section, so
the contract is closed on both fronts (`strict: true`, `allowUnknown: false`).

## 4. Validate against it

Because the generated router is named `markdown-contract.yaml`, a `validate`
run from inside the folder **auto-discovers** it — no flags:

```sh
cd notes
markdown-contract validate .
```

```text
Scanned 5 files; 3 matched across 1 contract, 2 unmatched
  notes: 3

No findings.
```

Exit **0**. The two "unmatched" files are the generated YAML pair themselves —
they match no rule, which is exactly right. Commit all of it and the folder is
guarded from here on: a new note that skips **Details** or invents a
frontmatter key fails the same command with a positioned finding and exit
**1**, just like a hand-written contract would
([Guard a folder of docs in CI](/recipes/guard-a-folder-in-ci/)).

## What's happening

- **Tight-but-accepting** is the whole inference policy: emit the most
  specific constraint that still admits every observed file. Sections that are
  **universal become required**; sections that appear in only some files become
  `optional` rather than being dropped; the observed shared ordering becomes
  `order: recognized-relative`.
- **Frontmatter fields climb a value ladder** — const (all values identical),
  number/boolean, format (date/datetime/email/url/…), enum (a small closed
  set), else plain string — and each field settles on the tightest rung that
  admits every value it saw. That's why `date` earned `format: date` while
  `title` stayed a bare `string`.
- **Thin evidence stays loose.** `status` had two values (`published`,
  `draft`) — a plausible enum — but the enum rung requires the distinct values
  to be few relative to the corpus (fewer than half the files), and 2-of-3 is a
  coincidence, not a category. If you *know* the set, tighten it by hand:
  `status: { enum: [published, draft] }`. The scaffold is a starting point you
  own, not a fixed artifact.
- The **self-check** closes the loop: accept-by-construction is verified, not
  assumed, on every run.

:::tip
Three flags change the shape of the scaffold: `--dry-run` prints the would-be
files to stdout and writes nothing, `--relax` loosens toward a permissive floor
(`order: none`, `allowUnknown: true`, non-strict frontmatter, no enums) for a
corpus that's still evolving, and `--meta` cuts a bigger tree into one contract
per top-level directory plus a glob-routed config. Each is shown one at a time
in [Scaffold & Guard](/examples/inference-init/).
:::

## Next

- [Catch docs drifting from their agreed shape](/recipes/catch-drift-with-init-check/)
  — `init --check` re-verifies the committed scaffold in CI without
  re-inferring.
- [Scaffold & Guard](/examples/inference-init/) — `--dry-run`, `--relax`,
  `--meta`, `--depth`, and the drift gate, one example each.
- The full `init` flag table is in the [CLI reference](/reference/cli/#init).
