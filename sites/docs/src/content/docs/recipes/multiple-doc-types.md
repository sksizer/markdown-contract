---
title: Validate several doc types in one repo
description: You have decisions, runbooks, and guides — each a different shape. One config routes every folder to the right contract in a single run.
---

**The situation.** Your repo has more than one kind of document: decision records
under `decisions/`, operational runbooks under `runbooks/`, and how-to guides
under `guides/`. Each needs a *different* contract, but you want **one command**
to check the whole tree — and you don't want your work-in-progress `_drafts`
folder to fail the build.

That's what a **config document** is for: it maps globs to contracts, first match
wins.

## 1. Write a contract per type

Keep the contracts together under `contracts/`. Three small ones:

```yaml
# contracts/decision.contract.yaml
mcVersion: 1
kind: contract
frontmatter:
  strict: true
  fields:
    id:     { type: string, pattern: '^D-\d{4}$' }
    status: { enum: [proposed, accepted, superseded] }
body:
  sections:
    - section: Context
    - section: Decision
```

```yaml
# contracts/runbook.contract.yaml
mcVersion: 1
kind: contract
frontmatter:
  fields:
    owner: { type: string }            # who's on the hook
body:
  sections:
    - section: Symptoms
    - section: Rollback
      content: { list: { everyItem: checkbox } }   # a real, tickable checklist
```

```yaml
# contracts/guide.contract.yaml
mcVersion: 1
kind: contract
body:
  order: recognized-relative
  allowUnknown: true
  sections:
    - section: Overview
      content: { maxWords: 120 }
```

## 2. Route them with one config

A `kind: config` document names each contract and lists the routing rules.
Contract paths resolve relative to the config file; the `include` globs match each
file's path relative to the run root. **The first matching rule wins**, so order
them most-specific first:

```yaml
# markdown-contract.yaml   (auto-discovered from the working directory)
mcVersion: 1
kind: config
contracts:
  decision: ./contracts/decision.contract.yaml
  runbook:  ./contracts/runbook.contract.yaml
  guide:    ./contracts/guide.contract.yaml
rules:
  - include: ['decisions/**/*.md']
    contract: decision
  - include: ['runbooks/**/*.md']
    contract: runbook
  - include: ['guides/**/*.md']
    exclude: ['**/_drafts/**']          # skip work-in-progress
    contract: guide
```

## 3. Run the whole tree at once

Because the config is named `markdown-contract.yaml`, `validate` **auto-discovers**
it — no flags needed. The summary reports how many files each contract matched:

```sh
markdown-contract validate .
```

```text
Scanned 8 files; 3 matched across 3 contracts, 5 unmatched
  decision: 1
  runbook: 1
  guide: 1

No findings.
```

The three markdown files each routed to their contract and passed, so the run
exits **0**. The "unmatched" count is every file that matched no rule — here the
config and contract YAML files themselves, plus the excluded `_drafts` note. A
file that breaks its contract would print a positioned finding and flip the exit
code to **1**, exactly as in [Guard a folder of docs in CI](/recipes/guard-a-folder-in-ci/).

## 4. Wire it into CI

One step still covers everything, because one command covers every type:

```yaml
# .github/workflows/docs.yml
name: docs
on: [push, pull_request]
jobs:
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Install markdown-contract (from source until it's on npm — see Getting started).
      - run: markdown-contract validate .
```

## What's happening

- **First-match-wins routing** means a file is checked by the first rule whose
  `include` matches (minus its `exclude`). Put narrower globs first. Full
  semantics: [Declarative YAML reference](/reference/yaml/) and
  [Declarative YAML examples](/examples/declarative-yaml/).
- **`exclude`** is how you carve out drafts, archives, or generated files without
  moving them.
- Mixing strictness is fine — the `decision` contract is `strict`, the `guide`
  contract is lenient (`allowUnknown`, `recognized-relative`) so it can grow
  while it's young.

## Next

- [Check an Astro content collection's body](/recipes/astro-content-collections/)
  — a content-level contract for a site.
- Want the config written for you? `init --meta` infers one contract per
  top-level folder plus the router — see [Scaffold & Guard](/examples/inference-init/).
- [Real-World Schemas](/examples/real-world-schemas/) — ADR, runbook, and
  postmortem contracts you can lift.
