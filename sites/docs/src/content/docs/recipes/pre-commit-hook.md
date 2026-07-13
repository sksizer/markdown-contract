---
title: Block bad docs at commit time
description: CI catches contract violations, but only after the push. Because validate's exit code is the gate, a pre-commit hook is one line — plain git hook or lefthook.
---

**The situation.** Your CI gate from [Guard a folder of docs in
CI](/recipes/guard-a-folder-in-ci/) works — but the feedback loop is a whole
push-and-wait. A broken decision record gets committed, pushed, and only turns
the PR red minutes later. You want the same check to run *before the commit
lands*, on your machine, in under a second.

The CLI's [exit-code contract](/reference/cli/#exit-codes) — `0` clean, `1`
error-level findings, `2` usage error — is exactly what a git hook gates on. Any
non-zero exit aborts the commit, so the hook is the `validate` command and
nothing else.

## 1. The contract

The same contract the CI recipe uses — two pinned frontmatter fields, two
required sections:

```yaml
# decision.contract.yaml
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

## 2. The hook: one line

The plain-git version is a shell script at `.git/hooks/pre-commit`. A hook's
exit status is the exit status of its last command, so `validate` *is* the
hook:

```sh
#!/bin/sh
# .git/hooks/pre-commit
# markdown-contract is built from source until it's on npm — see Getting started.
markdown-contract validate docs/decisions --contract decision.contract.yaml
```

Make it executable and it's armed:

```sh
chmod +x .git/hooks/pre-commit
```

## 3. Watch it block a commit

Stage a decision record with a bad `status` and no **Decision** section, then
try to commit:

```sh
git commit -m "add D-0002: choose a hook runner"
```

```text
Scanned 2 files; 2 matched, 0 unmatched

D-0002.md:3 error frontmatter/enum — frontmatter field ‘status’ must be one of ‘proposed’, ‘accepted’, ‘superseded’
D-0002.md:6 error structure/section-missing — required section ‘Decision’ is missing

2 finding(s): 2 error, 0 warn, 0 report
```

`validate` exits **1**, so git aborts — no commit is created, and the findings
point at the exact lines to fix. Fix the two problems, commit again, and the
hook prints `No findings.` and lets the commit through (exit **0**).

:::note
Hooks are advisory: `git commit --no-verify` skips them, and `.git/hooks/`
isn't versioned, so every clone has to install the script by hand. That's why
the CI gate stays — the hook is the fast local mirror of it, not a replacement.
:::

## 4. The lefthook variant

A hook *manager* fixes the not-versioned problem: the config is a committed
file, and everyone's clone arms the same hooks on install. With
[lefthook](https://github.com/evilmartians/lefthook), the equivalent gate is:

```yaml
# lefthook.yml
pre-commit:
  commands:
    contracts:
      glob: 'docs/decisions/*.md'
      run: markdown-contract validate docs/decisions --contract decision.contract.yaml
```

The `glob` is a cheap pre-gate: lefthook only runs the command when a staged
file matches it, so commits that don't touch `docs/decisions/` skip the check
entirely. When one does, the same findings print inside lefthook's summary and
the non-zero exit aborts the commit exactly as before.

Arm it once per clone with `lefthook install` — or put that in your
`package.json` `"prepare"` script so installing dependencies installs the hooks
too.

:::tip
To validate *only* the staged files instead of the whole folder, feed the
staged paths to repeated `--include` flags (each one narrows the run):

```sh
#!/bin/sh
# .git/hooks/pre-commit — staged decision records only
changed=$(git diff --cached --name-only --diff-filter=ACM -- 'docs/decisions/*.md')
[ -z "$changed" ] && exit 0
markdown-contract validate . --contract decision.contract.yaml \
  $(printf -- '--include %s ' $changed)
```

This is the same mechanism as scoping a CI run to a PR's changed files —
[Validate only the files changed in a PR](/recipes/check-only-changed-files/)
walks through it.
:::

## What's happening

- **The exit code is the whole integration.** `validate` exits `0` when clean
  and `1` on any error-level finding; git aborts a commit on any non-zero hook
  exit. No output parsing, no wrapper — see the
  [exit-code contract](/reference/cli/#exit-codes). (Warn- and report-level
  findings never flip the exit code, so a warning-only doc still commits.)
- **The hook and CI run the identical command**, so they can never disagree
  about what "valid" means. The CI half is
  [Guard a folder of docs in CI](/recipes/guard-a-folder-in-ci/).
- **`--include` is a pre-filter on the run**, applied before contract matching
  — that's what makes the staged-files variant possible. Flag semantics are in
  the [CLI reference](/reference/cli/).
- The validator is **read-only** — unlike a formatter hook, it never rewrites
  or re-stages your files.

## Next

- [Validate only the files changed in a PR](/recipes/check-only-changed-files/)
  — the same `--include` scoping, applied in CI.
- [Guard a folder of docs in CI](/recipes/guard-a-folder-in-ci/) — the backstop
  this hook mirrors.
- [Embed & Automate](/examples/embed-and-ci/) — more gates: SARIF PR
  annotations, `init --check` drift detection, JSON findings in scripts.
