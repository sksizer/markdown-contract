---
title: Every how-to needs a code block and a checklist
description: Your how-to pages must carry a runnable command block and a prerequisites checklist — but reviewers miss it when one is prose-only. Two content leaves make the check mechanical.
---

**The situation.** Every how-to in `guides/` is supposed to end in a **Run it**
section with an actual shell block — copy, paste, done — and open with a
**Prerequisites** checklist the reader can tick off. But nothing enforces it, so
pages slip through where the "command" is a Python snippet, the prerequisites
are plain prose bullets, or the run step is a paragraph telling you to click
around a dashboard. Reviewers miss it because the *headings* are all there —
it's what's inside them that drifted.

That's a job for **content leaves**: a `code` leaf that pins the language, and a
`list` leaf that requires real checkboxes.

## 1. Write the contract

Two sections, each with a content requirement. Everything else about the page is
left open (`allowUnknown: true`), so authors can add whatever extra sections
they like — as long as these two carry the right kind of content:

```yaml
# howto.contract.yaml
mcVersion: 1
kind: contract
body:
  order: recognized-relative
  allowUnknown: true
  sections:
    - section: Prerequisites
      content: { list: { everyItem: checkbox } }   # every item a tickable box
    - section: Run it
      content: { code: { lang: sh } }              # a fenced sh block
```

`code` and `list` are two of the four content leaves (`maxWords` and `table` are
the others) — all documented in the
[Declarative YAML reference](/reference/yaml/).

## 2. Run it

The corpus: one conforming page, and this one — headings present, contents
wrong. The prerequisites are plain bullets and the "command" is Python:

````md
# Restart the worker

## Prerequisites

- kubectl configured
- access to the staging cluster

## Run it

```python
subprocess.run(["kubectl", "rollout", "restart", "deploy/worker"])
```
````

A third page (`clear-cache.md`) writes its run step as a prose paragraph — no
code block at all. Validate the folder:

```sh
markdown-contract validate guides --contract howto.contract.yaml
```

```text
Scanned 3 files; 3 matched, 0 unmatched

clear-cache.md:9 error structure/block-kind — block in section ‘Run it’ is a paragraph; expected a code
restart-worker.md:5 error content/list/item-kind — list item is not a checkbox (‘- [ ]’ / ‘- [x]’)
restart-worker.md:6 error content/list/item-kind — list item is not a checkbox (‘- [ ]’ / ‘- [x]’)
restart-worker.md:10 error content/code/lang — code block language ‘python’ does not match required ‘sh’

4 finding(s): 4 error, 0 warn, 0 report
```

Every finding lands on the exact line a reviewer would have to point at by hand:
each plain bullet gets its own `content/list/item-kind` (lines 5 and 6), and the
Python fence gets `content/code/lang` at line 10. The prose-only run step is
reported by the *structure* plane — `structure/block-kind`, pinned to the
offending paragraph. Exit **1**, so CI fails.

:::note[Missing vs. wrong-kind]
The structural side has two ids, and which one fires depends on what's in the
section. A section that contains the wrong kind of block (a paragraph, a list,
…) where `code` was declared is `structure/block-kind`, as above. A section
that's **empty** — heading with nothing under it — is `structure/block-missing`,
pinned to the heading:

```text
empty-section.md:7 error structure/block-missing — section ‘Run it’ is missing a code block
```

Both default to `error`, so either way the gate holds. The full catalog is in
the [Findings & rule IDs reference](/reference/findings/).
:::

## 3. Wire it into CI

The exit code is the gate, so the CI step is one line:

```yaml
# .github/workflows/docs.yml
name: docs
on: [push, pull_request]
jobs:
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Install markdown-contract first — it's built from source until it's on
      # npm; see Getting started. Then gate on the contract:
      - run: markdown-contract validate guides --contract howto.contract.yaml
```

See [Getting started](/getting-started/) for the install step.

## What's happening

- **Structure gates content.** For each declared `content` leaf, the structure
  plane first confirms a block of the right kind is present
  (`structure/block-missing`, `structure/block-kind`); only then does the
  content plane look *inside* it (`content/code/lang`,
  `content/list/item-kind`). That's why the prose-only page and the
  wrong-language page report different ids for what feels like the same sin —
  one never produced a code block to inspect. The planes are walked one at a
  time in [Contracts in Code](/examples/validation-planes/).
- **`everyItem: checkbox`** requires GFM task-list items (`- [ ]` / `- [x]`) —
  ticked or unticked both pass; a plain bullet fails, one finding per item. Add
  `minItems: 1` if an empty checklist shouldn't count.
- **`lang: sh`** matches the fence's language exactly — `bash` is not `sh`.
  Write `content: { code: {} }` to require *a* code block in any language.
- The validator is **read-only** — it flags the prose-only page; it never
  rewrites it.

## Next

- [Tables your tooling can rely on: typed columns](/recipes/typed-table-columns/)
  — the `table` leaf, the other half of the content vocabulary.
- [Runbooks with an on-call owner and a real rollback](/recipes/runbook-owner-and-rollback/)
  — the same checkbox leaf inside a fuller real-world contract.
- The full rule-id catalog, with each id's plane and trigger, is in the
  [Findings & rule IDs reference](/reference/findings/).
