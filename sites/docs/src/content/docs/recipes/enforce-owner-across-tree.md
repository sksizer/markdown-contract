---
title: Every document names a real owner
description: A tree-wide governance rule — every doc carries an owner, and it's one of the team's actual handles — layered over your per-type contracts as a second validation pass.
---

**The situation.** Your repo already routes decisions and runbooks to their own
contracts, as in [Validate several doc types in one repo](/recipes/multiple-doc-types/).
Now the team adds a governance rule that cuts *across* every type: **every
document names an owner, and the owner is a real handle** — `mira`, `tomas`,
`priya`, or `jordan` — not a team alias, not a typo, not absent. You don't want
to care what kind of document it is; you want one rule over the whole tree.

One mechanical constraint shapes the answer: **routing is first-match-wins, and each
file gets exactly one contract per run**. There is no "also apply this contract"
layer — so you can't stack a governance contract on top of the per-type rules in
a single run. Two real deployments work:

1. **A second CI pass** — keep the per-type run as-is, then run the whole tree
   against a tiny governance contract with `--contract`. Two commands, clean
   separation. *(This recipe.)*
2. **Fold `owner` into every per-type contract** — one run, but the rule is
   duplicated in each contract. *(The tradeoff, below.)*

## 1. Keep the per-type setup you have

Nothing changes here. The `markdown-contract.yaml` config still routes
`decisions/` and `runbooks/` to their own contracts, and neither contract says
a word about `owner` — that's the governance contract's job:

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

## 2. Write the governance contract

One frontmatter field, pinned to the team's real handles. `strict: false` is
essential — this contract will run over *every* document type, so it must
tolerate whatever other frontmatter each type carries. And there's no `body` at
all: structure is the per-type contracts' business.

```yaml
# governance.contract.yaml — the tree-wide owner rule, nothing else
mcVersion: 1
kind: contract
frontmatter:
  strict: false                        # per-type contracts own the rest of the keys
  fields:
    owner: { enum: [mira, tomas, priya, jordan] }   # the team's real handles
```

A contract may have `frontmatter`, `body`, or both — see the
[Declarative YAML reference](/reference/yaml/). This one deliberately has the
smallest possible surface, so it composes with anything.

## 3. Run both passes

Pass one is the run you already had — the config is auto-discovered, files route
to their per-type contracts. With one clean decision, one decision that forgot
its owner, and one runbook whose owner is the typo `jordan-h`:

```sh
markdown-contract validate .
```

```text
Scanned 7 files; 3 matched across 2 contracts, 4 unmatched
  decision: 2
  runbook: 1

No findings.
```

Exit **0** — because per-type shape is intact; nothing here checks `owner`. The
four "unmatched" files are the config and contract YAMLs themselves.

Pass two sweeps the same tree with the governance contract. `--contract`
bypasses the config entirely and applies one contract to every `*.md` under the
path:

```sh
markdown-contract validate . --contract governance.contract.yaml
```

```text
Scanned 7 files; 3 matched, 4 unmatched

decisions/D-0002.md error frontmatter/enum — frontmatter field ‘owner’ must be one of ‘mira’, ‘tomas’, ‘priya’, ‘jordan’
runbooks/cache-flush.md:2 error frontmatter/enum — frontmatter field ‘owner’ must be one of ‘mira’, ‘tomas’, ‘priya’, ‘jordan’

2 finding(s): 2 error, 0 warn, 0 report
```

Exit **1**. Both failure modes surface as `frontmatter/enum`: the runbook's
`jordan-h` pins to line 2, where the bad value sits; the decision that has *no*
`owner` key prints with no `:line`, because there's no line to point at. Add
`owner: priya` to the decision and fix the typo, and the same command prints
`No findings.` and exits **0**.

:::note
The pass-two summary has no per-contract breakdown — an inline `--contract` run
is a single unnamed catch-all rule, so only the total line prints. Details in
the [CLI reference](/reference/cli/).
:::

## 4. Wire both passes into CI

Two commands, two gates — either one failing fails the job:

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
      # npm; see Getting started. Then run both passes:
      - run: markdown-contract validate .
      - run: markdown-contract validate . --contract governance.contract.yaml
```

:::caution
The governance pass matches **every** `*.md` under the run root — including
drafts or archives your config's rules deliberately skip. If those shouldn't
need an owner yet, carve them out the same way on the command line:
`--exclude '**/_drafts/**'`.
:::

## The tradeoff: two passes vs. folded-in

The alternative is to add the same `owner` field to `decision.contract.yaml`,
`runbook.contract.yaml`, and every contract you add later. Weigh them honestly:

- **Second pass (this recipe).** The governance rule lives in exactly one file,
  and it automatically covers new doc types — add a `guides/` tree tomorrow and
  the owner rule already applies, even before you write `guide.contract.yaml`.
  The cost: two commands, two findings lists, and a file with *two* problems
  gets reported across two runs.
- **Folded in.** One command, one findings list, and each contract fully
  describes its type in one place. The cost: the handle list is duplicated per
  contract, so when `jordan` leaves the team you edit N files — and a brand-new
  doc type silently escapes governance until someone remembers to include the
  field.

A reasonable rule of thumb: fold in while you have two contracts and one team;
switch to the second pass when the contract count or the churn in the handle
list makes duplication a liability.

## What's happening

- **One contract per file, per run.** A config's rules are first-match-wins, so
  a file is checked by exactly one contract in a run — there is no layering
  mechanism. Running the tree twice *is* the layering: same files, different
  contract binding each time. Routing semantics:
  [Declarative YAML reference](/reference/yaml/).
- **`enum` catches both failure modes.** A missing `owner` and a wrong `owner`
  both violate the enum, and both surface as `frontmatter/enum` — the missing
  key just has no source position, so its finding prints as a bare path. The
  full rule catalog is in the [Findings reference](/reference/findings/).
- **`strict: false` is what makes the contract stackable.** A strict governance
  contract would reject every per-type key (`id`, `status`, …) as
  `frontmatter/unknown-key`. Lenient frontmatter plus no `body` means the
  contract asserts *only* the governance rule, whatever document it lands on.

## Next

- [depends_on must point at documents that exist](/recipes/cross-document-references/)
  — the other tree-wide governance rule: references that resolve.
- [Validate several doc types in one repo](/recipes/multiple-doc-types/) — the
  per-type routing this recipe layers on top of.
- [Embed & Automate](/examples/embed-and-ci/) — CI variations: SARIF
  annotations, pre-commit hooks, parsing JSON findings in a script.
