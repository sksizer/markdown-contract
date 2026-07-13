---
title: Errors block the build, warnings annotate the PR
description: Some rules should fail CI; others should only nag. One run splits them by level — the exit code carries the errors, a SARIF upload turns the warnings into PR annotations.
---

**The situation.** Your guides must have a **Steps** section — no exceptions,
that should fail CI. But a stray `TODO` in the prose? You want reviewers to *see*
it on the PR, not have the build die over it. Two severities, one run: errors
gate, warnings annotate.

The split is built in. Only **error**-level findings flip the exit code, so a
warn-level rule can fire all it likes without failing the job — and
`--format sarif` carries both levels to GitHub code scanning, which draws them
on the PR diff.

## 1. Write the contract, choosing each rule's level

Structural requirements (`sections`) are error-level by nature. A `forbids`
text constraint takes an explicit `level: warn` — that one key is the whole
policy:

```yaml
# guide.contract.yaml
mcVersion: 1
kind: contract
body:
  forbids:
    - pattern: "TODO"
      level: warn                      # nag, don't fail
      id: docs/no-todo                 # readable rule id for annotations
  sections:
    - section: Overview
    - section: Steps                   # structural — missing it is an error
```

`forbids` on the body root scans the whole document; the same list can sit on a
single `section` node instead. The full match-spec vocabulary (`pattern`,
`regex`, `ignoreCase`, `min`/`max`, …) is in the
[Declarative YAML reference](/reference/yaml/).

:::tip
Without `id`, a text constraint gets a synthesized id like
`text/forbids/doc/mf4oln` — stable, but opaque. Naming it `docs/no-todo` makes
the finding line, and later the code-scanning annotation, self-explanatory.
:::

## 2. Prove warnings don't fail the run

`guides/deploy.md` has both required sections but a `TODO` in its overview. The
run reports the warning — and still exits **0**:

```sh
markdown-contract validate guides --contract guide.contract.yaml; echo "exit: $?"
```

```text
Scanned 1 file; 1 matched, 0 unmatched

deploy.md:7 warn docs/no-todo — forbidden phrase "TODO" present

1 finding(s): 0 error, 1 warn, 0 report
exit: 0
```

That's the [exit-code contract](/reference/cli/#exit-codes): warn- and
report-level findings never affect the exit code. Now add `guides/rollback.md`,
which has a `TODO` *and* is missing its **Steps** section:

```text
Scanned 2 files; 2 matched, 0 unmatched

deploy.md:7 warn docs/no-todo — forbidden phrase "TODO" present
rollback.md:3 error structure/section-missing — required section ‘Steps’ is missing
rollback.md:7 warn docs/no-todo — forbidden phrase "TODO" present

3 finding(s): 1 error, 2 warn, 0 report
exit: 1
```

One error present → exit **1** → the build fails. The two warnings ride along
without changing the verdict.

## 3. Emit SARIF for code scanning

The same corpus, formatted as a SARIF 2.1.0 log — this time run from the
repository root so file paths come out repo-relative (see the caution below).
Note the level mapping: the `warn` finding becomes SARIF `warning`, the `error`
stays `error`:

```sh
markdown-contract validate . --contract guide.contract.yaml \
  --include 'guides/**/*.md' --format sarif > mc.sarif
```

The interesting slice of `mc.sarif` — one `result` per finding (the full log
also lists a second `docs/no-todo` result on `guides/rollback.md`):

```json
      "results": [
        {
          "ruleId": "docs/no-todo",
          "level": "warning",
          "message": {
            "text": "forbidden phrase \"TODO\" present"
          },
          "locations": [
            {
              "physicalLocation": {
                "artifactLocation": {
                  "uri": "guides/deploy.md"
                },
                "region": {
                  "startLine": 7
                }
              }
            }
          ]
        },
        {
          "ruleId": "structure/section-missing",
          "level": "error",
          "message": {
            "text": "required section ‘Steps’ is missing"
          },
          ...
```

:::caution
SARIF file paths are relative to the **run root**. Run `validate .` from the
repository root (scoping with `--include` as above) rather than `validate guides`
— otherwise the `uri` comes out as `deploy.md` instead of `guides/deploy.md`,
and GitHub can't pin the annotation to the file.
:::

## 4. Wire it into CI

One command, two consumers: upload the SARIF so *every* finding annotates the PR, then let
the validate step's own exit code — which only errors flip — gate the build:

```yaml
# .github/workflows/docs.yml
name: docs
on: [push, pull_request]
permissions:
  security-events: write              # required by upload-sarif
  contents: read
jobs:
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Install markdown-contract first — it's built from source until it's on
      # npm; see Getting started.
      - name: Validate to SARIF
        id: validate
        continue-on-error: true       # keep going so the SARIF still uploads
        run: |
          markdown-contract validate . --contract guide.contract.yaml \
            --include 'guides/**/*.md' --format sarif > mc.sarif
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: mc.sarif
      - name: Gate on errors
        if: steps.validate.outcome == 'failure'
        run: exit 1
```

A PR that only leaves a `TODO` behind gets a `warning` annotation on the exact
line and a green check. A PR that drops the **Steps** section gets an `error`
annotation *and* a red build. No parsing, no separate configs — the levels in
the contract already encode the policy.

## What's happening

- **Only `error` findings gate.** The CLI exits `1` exactly when an error-level
  finding is present; `warn` and `report` never touch the exit code. See
  [exit codes](/reference/cli/#exit-codes) and the level semantics in
  [Findings & rule IDs](/reference/findings/).
- **Severity is contract data.** Engine rules have registered defaults
  (`structure/section-missing` is `error`); each `requires`/`forbids` entry may
  set its own `level` (`error` or `warn`). You tune the policy in the YAML, not
  in CI scripting.
- **SARIF maps the three levels** onto code scanning's vocabulary:
  `error → error`, `warn → warning`, `report → note`. Each finding becomes one
  `result` with its rule id, message, and `region.startLine` — that's what GitHub
  renders as an inline PR annotation.
- **`continue-on-error` + an outcome gate** lets one command serve both
  consumers: the SARIF upload always happens, and the recorded step outcome
  (driven purely by error-level findings) still fails the job.

## Next

- [Require a phrase in a section, forbid one everywhere](/recipes/require-or-forbid-phrases/)
  — more of the text-constraint vocabulary this recipe's `forbids` comes from.
- [Fail only on new findings vs a baseline](/recipes/baseline-and-diff-findings/)
  — adopt contracts on a corpus that already has findings.
- [Guard a folder of docs in CI](/recipes/guard-a-folder-in-ci/) — the plain
  errors-only gate, and [Embed & Automate](/examples/embed-and-ci/) for more CI
  variations.
