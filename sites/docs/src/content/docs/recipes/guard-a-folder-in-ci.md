---
title: Guard a folder of docs in CI
description: You have a folder of markdown and want CI to fail if any file breaks its agreed shape. One contract, one command, one exit code.
---

**The situation.** You keep decision records in `docs/decisions/`. Every one is
supposed to have a `status` from a fixed set and a **Decision** section — but
nothing enforces it, so they drift. You want CI to fail the moment one doesn't
conform.

This is the five-minute adoption path: one contract, one `validate` command, and
the exit code does the gating.

## 1. Write the contract

A contract is a plain YAML file — no TypeScript. This one pins two frontmatter
fields and requires the body sections, in order, while still allowing extra
sections you haven't listed:

```yaml
# decision.contract.yaml
mcVersion: 1
kind: contract
frontmatter:
  strict: true                         # reject unknown frontmatter keys
  fields:
    id:     { type: string, pattern: '^D-\d{4}$' }
    status: { enum: [proposed, accepted, superseded] }
body:
  order: strict                        # sections must appear in this order
  allowUnknown: true                   # ...but extra sections are fine
  sections:
    - section: Context
    - section: Decision
    - section: Consequences
      optional: true
```

Every key here is documented in the [Declarative YAML reference](/reference/yaml/).

## 2. Run it

Point `validate` at the folder and hand it the contract. With one clean file and
one broken one, you get:

```sh
markdown-contract validate docs/decisions --contract decision.contract.yaml
```

```text
Scanned 2 files; 2 matched, 0 unmatched

D-0002.md:3 error frontmatter/enum — frontmatter field ‘status’ must be one of ‘proposed’, ‘accepted’, ‘superseded’
D-0002.md:6 error structure/section-missing — required section ‘Decision’ is missing

2 finding(s): 2 error, 0 warn, 0 report
```

Each finding is `path:line level id — message`. The command exits **1** because
error-level findings are present; a clean folder prints `No findings.` and exits
**0**. (See the [exit-code contract](/reference/cli/#exit-codes) and the
[finding shape](/reference/findings/).)

## 3. Wire it into CI

Because the exit code is the gate, the CI step is a single line — any non-zero
status fails the job:

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
      - run: markdown-contract validate docs/decisions --contract decision.contract.yaml
```

That's the whole gate. See [Getting started](/getting-started/) for the install
step, and [Embed & Automate](/examples/embed-and-ci/) for the CI variations
(SARIF annotations, a pre-commit hook, parsing JSON findings in a script).

## What's happening

- **`--contract`** applies one contract to every `*.md` under the path, no config
  file needed — the config-less form of a run. When you outgrow one folder, a
  `markdown-contract.yaml` maps several globs to several contracts; see
  [Validate several doc types in one repo](/recipes/multiple-doc-types/).
- **`strict` + `enum`** are the content plane (Zod under the hood); **`order`**,
  **`allowUnknown`**, and the section list are the structure plane. One parse,
  both planes — [how it works](/how-it-works/).
- The validator is **read-only** — it never rewrites your documents.

## Next

- [Validate several doc types in one repo](/recipes/multiple-doc-types/) — route
  globs to per-type contracts.
- Don't want to hand-write the contract? `init` can infer one from the folder you
  already have — see [Scaffold & Guard](/examples/inference-init/).
- The full flag list is in the [CLI reference](/reference/cli/).
