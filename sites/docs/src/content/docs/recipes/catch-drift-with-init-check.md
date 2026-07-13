---
title: Catch docs drifting from their agreed shape
description: The contract was right when you adopted it — months later the docs have quietly outgrown it. init --check re-verifies the committed scaffold on every build, no inference, no writes.
---

**The situation.** Months ago you ran `init` over your notes folder and
committed the scaffold it inferred. It was right then. Since then the docs kept
evolving — someone added a frontmatter key here, dropped a section there — and
nothing re-checked the agreement. You want a CI gate that answers one question
on every build: **does this tree still conform to the contract we committed?**
Without re-inferring anything, and without touching a single file.

That's `init --check`: it loads the *existing* scaffold and verifies the tree
against it. Exit **0** means still conforming; exit **1** means something
drifted.

## 1. Start from a scaffolded folder

This recipe picks up where
[Infer a contract from docs you already have](/recipes/infer-a-contract-with-init/)
leaves off: three notes in `notes/` sharing `title` / `status` / `date`
frontmatter and **Summary** / **Details** sections, scaffolded with

```sh
markdown-contract init notes
```

```text
init: inferred 1 contract(s); wrote 2 file(s):
  markdown-contract.yaml
  notes.contract.yaml
self-check: clean (the scaffold accepts its own corpus)
```

Both generated files live **inside `notes/`** and are committed. The contract
is closed on both fronts — that's what makes drift detectable at all:

```yaml
# notes/notes.contract.yaml — generated verbatim
mcVersion: 1
kind: contract
frontmatter:
  strict: true                # no frontmatter key the corpus never had
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
  allowUnknown: false         # no section the corpus never had
  sections:
    - section: Summary
    - section: Details
    - section: Links
      optional: true
```

## 2. Run the drift gate

`--check` skips inference entirely. It loads the `markdown-contract.yaml` that
`init` wrote into the folder and runs it over the tree — read-only, one summary
line per root:

```sh
markdown-contract init notes --check
```

```text
check /home/user/team-docs/notes: clean
```

Exit **0**. Nothing was inferred and nothing was written; the committed
scaffold still accepts every file, exactly as it did on the day it was
generated.

:::caution
`--check` verifies a scaffold that **already exists**. If there's no
`markdown-contract.yaml` inside the root, it doesn't fall back to inferring one
— it's a usage error (exit **2**), so a missing scaffold can never
silently pass as "clean".
:::

## 3. Let a doc drift

Now the quiet kind of change that never gets flagged in review: someone starts
recording who reviewed each note, on one file, without updating the contract.

```diff
 ---
 title: Retry budget for outbound calls
 status: published
 date: 2026-05-11
+reviewer: alex
 ---
```

The same command, unchanged:

```sh
markdown-contract init notes --check
```

```text
check /home/user/team-docs/notes: 1 error finding(s) — drifted
```

Exit **1**. The inferred contract is `strict: true` — its key set is closed by
construction — so a frontmatter key the corpus never had is exactly the kind of
drift it exists to catch. In CI this exit code fails the build until either the
doc or the contract is updated.

## 4. Diagnose, then decide

`--check` is a gate, so its output is deliberately terse: a per-root verdict
and an exit code. To see *which* line drifted, run `validate` from inside the
folder — the generated router is named `markdown-contract.yaml`, so it's
auto-discovered with no flags:

```sh
cd notes
markdown-contract validate .
```

```text
Scanned 5 files; 3 matched across 1 contract, 2 unmatched
  notes: 3

retries.md:5 error frontmatter/unknown-key — unknown frontmatter key ‘reviewer’

1 finding(s): 1 error, 0 warn, 0 report
```

Same contract, same finding, now positioned: `retries.md`, line 5. From here
drift resolves one of three ways:

- **The doc is wrong** — revert the stray key; `--check` goes green.
- **The contract is behind** — the docs legitimately grew. Hand-edit the
  contract (e.g. `reviewer: { type: string, optional: true }`) to write the new
  agreement down.
- **Re-infer** — `init notes --force` regenerates the scaffold from the tree as
  it stands now. On this corpus that yields
  `reviewer: { enum: [alex], optional: true }` — tight-but-accepting again,
  with the new key admitted.

:::tip
Treat drift as a decision point, not just a failure. Exit 1 means the docs and
the written agreement disagree — *which one is right* is a judgment call the
gate surfaces but can't make for you.
:::

## 5. Wire it into CI

The exit code is the whole interface, so the CI step is one line:

```yaml
# .github/workflows/docs.yml
name: docs
on: [push, pull_request]
jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Install markdown-contract first — it's built from source until it's on
      # npm; see Getting started. Then run the drift gate:
      - run: markdown-contract init notes --check
```

Green while the tree conforms; red the moment a document outgrows the committed
scaffold. See [Getting started](/getting-started/) for the install step.

## What's happening

- **`--check` never infers and never writes.** It resolves
  `markdown-contract.yaml` inside each root, loads it through the same
  declarative loader `validate` uses, and runs the corpus over the tree. The
  only outputs are the per-root summary lines and the exit code — `0` clean,
  `1` drifted, `2` when there's no config to check. (Flag table and exit-code
  contract: [CLI reference](/reference/cli/#init).)
- **Drift is only detectable because inference is tight.** The generated
  contract closes what it observed — `strict: true`, `allowUnknown: false` — so
  a new key or section is an error rather than silently admitted. A hand-loosened
  scaffold (`--relax`) trades some of this detection away by design; see
  [Scaffold & Guard](/examples/inference-init/).
- **Gate vs. diagnosis.** `--check` and `validate` run the *same* contract over
  the *same* files; `--check` compresses the result to a verdict for CI, while
  `validate` prints each finding as `path:line level id — message`
  ([finding shape](/reference/findings/)). Use the first in the pipeline, the
  second at your desk.

## Next

- [Infer a contract from docs you already have](/recipes/infer-a-contract-with-init/)
  — the setup this recipe assumes: what `init` writes and why.
- [Scaffold & Guard](/examples/inference-init/) — `--dry-run`, `--relax`,
  `--meta`, and both sides of the drift gate, one example each.
- Prefer failing only on *new* findings while you pay down existing ones?
  [Fail only on new findings vs a baseline](/recipes/baseline-and-diff-findings/).
