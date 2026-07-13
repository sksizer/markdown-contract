---
title: Validate only the files changed in a PR
description: A ten-thousand-file docs tree doesn't need a full scan on every pull request. Pipe git's changed-file list into repeated --include flags and gate exactly what the PR touched.
---

**The situation.** Your docs tree is huge, and it's already under contract — a
`markdown-contract.yaml` routes every folder to the right shape, as in
[Validate several doc types in one repo](/recipes/multiple-doc-types/). But a
PR that fixes a typo in one runbook shouldn't wait on (or be failed by) a scan
of ten thousand untouched files. You want the PR check scoped to **exactly the
files the PR changed**, and nothing else.

The mechanism is one flag: `--include` is **repeatable**, so a list of changed
paths becomes a list of `--include` flags.

## 1. Start from your routed config

Nothing about the config changes. This recipe assumes the usual setup — a
`markdown-contract.yaml` at the repo root routing folders to contracts (here a
`decisions/` tree and a `runbooks/` tree, with the contracts from
[Validate several doc types in one repo](/recipes/multiple-doc-types/)):

```yaml
# markdown-contract.yaml   (auto-discovered from the working directory)
mcVersion: 1
kind: config
contracts:
  decision: ./contracts/decision.contract.yaml
  runbook:  ./contracts/runbook.contract.yaml
rules:
  - include: ['decisions/**/*.md']
    contract: decision
  - include: ['runbooks/**/*.md']
    contract: runbook
```

## 2. Scope one run with repeated `--include`

`--include` is a pre-filter applied **on top of** the resolved config: routing
still decides which contract checks each file, but only files matching an
include are validated. It takes a glob — and a plain relative path is a glob
that matches exactly one file. Suppose the PR touched two files:

```sh
markdown-contract validate . \
  --include 'decisions/D-0003.md' \
  --include 'runbooks/restart-api.md'
```

```text
Scanned 9 files; 2 matched across 2 contracts, 7 unmatched
  decision: 1
  runbook: 1

decisions/D-0003.md:3 error frontmatter/enum — frontmatter field ‘status’ must be one of ‘proposed’, ‘accepted’, ‘superseded’
decisions/D-0003.md:6 error structure/section-missing — required section ‘Decision’ is missing

2 finding(s): 2 error, 0 warn, 0 report
```

Exit **1**. Each of the two included files was routed to its contract
(`decision: 1`, `runbook: 1`); everything else in the tree counted as
*unmatched* and was never validated. The findings — and the exit code — come
only from the files the PR touched.

:::caution
`--include` globs resolve **relative to the run root**, and `git diff` prints
paths **relative to the repo root**. Run `validate .` from the repo root so the
two coordinate systems line up. If your docs config lives in a subdirectory,
strip the prefix from the git paths (or `cd` there and diff with
`--relative`).
:::

## 3. Pipe the git diff into the flags

The changed-file list comes from `git diff --name-only` against the merge base
(the three-dot `...` form), restricted to markdown. Turn each line into an
`--include` flag:

```sh
#!/usr/bin/env bash
set -euo pipefail

args=()
while IFS= read -r f; do
  args+=(--include "$f")
done < <(git diff --name-only --diff-filter=d origin/main...HEAD -- '*.md')

if [ ${#args[@]} -eq 0 ]; then
  echo "No markdown changed — skipping"
  exit 0
fi

markdown-contract validate . "${args[@]}"
```

Three details are load-bearing:

- **`origin/main...HEAD`** (three dots) diffs against the merge base — only the
  PR's own changes, not whatever landed on `main` since the branch was cut.
- **`--diff-filter=d`** drops deleted files. (Harmless either way — an include
  that matches nothing validates nothing — but there's no point passing them.)
- **The empty-list guard matters.** `validate .` with *no* `--include` flags
  scans the **whole tree**, so a docs-free PR would silently fall back to a
  full run. Bail out before that happens.

## 4. Wire it into a PR workflow

The one GitHub Actions wrinkle: a default checkout is a shallow single commit,
so `origin/main` doesn't exist to diff against. `fetch-depth: 0` fixes that.
Diff against `github.base_ref` so the job works for PRs targeting any branch:

```yaml
# .github/workflows/docs-pr.yml
name: docs-pr
on: [pull_request]
jobs:
  changed-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0                # full history, so the base branch is diffable
      # Install markdown-contract first — it's built from source until it's on
      # npm; see Getting started. Then validate only what the PR touched:
      - name: Validate changed markdown
        run: |
          args=()
          while IFS= read -r f; do
            args+=(--include "$f")
          done < <(git diff --name-only --diff-filter=d "origin/${{ github.base_ref }}"...HEAD -- '*.md')
          if [ ${#args[@]} -eq 0 ]; then
            echo "No markdown changed — skipping"
            exit 0
          fi
          markdown-contract validate . "${args[@]}"
```

## 5. Keep a full run on main

A scoped run checks each touched file against its contract — but it can't see
what it doesn't scan. Watch what happens when the same broken `D-0003.md`
already exists on the branch but the PR doesn't touch it:

```sh
markdown-contract validate . \
  --include 'decisions/D-0001.md' \
  --include 'runbooks/restart-api.md'
```

```text
Scanned 9 files; 2 matched across 2 contracts, 7 unmatched
  decision: 1
  runbook: 1

No findings.
```

Exit **0** — the broken file matched no include, so it was never validated. A
green scoped run means *the PR's files conform*, not *the tree conforms*. So
keep the cheap full-tree run where it belongs — on pushes to `main` (and
optionally a schedule), where latency doesn't gate anyone:

```yaml
# .github/workflows/docs-main.yml
name: docs-main
on:
  push:
    branches: [main]
jobs:
  all-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Install markdown-contract (from source until it's on npm — see Getting started).
      - run: markdown-contract validate .
```

Fast, scoped feedback on every PR; the whole-tree safety net on every merge.

## What's happening

- **`--include` is a repeatable global pre-filter.** It (and its alias
  `--glob`) restricts which files a run validates, *after* the config's rules
  decide the routing — it works the same in every mode, `--config` or
  `--contract`. Flag semantics: [CLI reference](/reference/cli/); a single
  `--include` in isolation is shown in the [CLI examples](/examples/cli/).
- **A non-matching include is inert.** A path that no longer exists (or a
  config-routed file outside the include set) just lands in the *unmatched*
  count — no error, no finding. That's what makes piping raw git output safe,
  and also why step 5's full run exists.
- **The exit code is still the whole gate.** Error-level findings in the scoped
  set exit `1`; a clean scoped set exits `0` — same
  [exit-code contract](/reference/cli/#exit-codes) as a full run, just over
  fewer files.

## Next

- [Guard a folder of docs in CI](/recipes/guard-a-folder-in-ci/) — the
  unscoped, whole-folder version of this gate.
- [Errors block the build, warnings annotate the PR](/recipes/warnings-as-pr-annotations/)
  — pair the scoped run with SARIF so findings land as inline PR annotations.
- [Fail only on new findings vs a baseline](/recipes/baseline-and-diff-findings/)
  — the other way to keep a legacy tree from failing every PR.
