---
title: Fail only on new findings vs a baseline
description: Adopting contracts on a legacy corpus means inheriting hundreds of findings you can't fix today. Snapshot them to a baseline JSON and fail CI only on findings that aren't in it.
---

**The situation.** You've written a contract for a corpus that predates it, and
the first `validate` run reports 400 findings. You cannot fix them all this
sprint — but you *can* insist that no **new** violation lands from today on.
You want a committed baseline of the findings you're tolerating, and a CI gate
that fails only on findings that aren't in it.

The pieces are already there: `--format json` emits the findings as a stable
`Finding[]` array, and a ~40-line script diffs it against a snapshot. The demo
corpus below has one legacy finding standing in for your 400.

## 1. See what you're inheriting

The contract itself isn't the point — any contract over a pre-existing tree
will do. Here it's a small runbook contract (an `owner` field, a **Symptoms**
and a **Rollback** section):

```yaml
# runbook.contract.yaml
mcVersion: 1
kind: contract
frontmatter:
  fields:
    owner: { type: string }
body:
  sections:
    - section: Symptoms
    - section: Rollback
```

Run it over the legacy folder — `docs/` has two runbooks, and one of them
predates the Rollback rule:

```sh
markdown-contract validate docs --contract runbook.contract.yaml
```

```text
Scanned 2 files; 2 matched, 0 unmatched

restart-cache.md:7 error structure/section-missing — required section ‘Rollback’ is missing

1 finding(s): 1 error, 0 warn, 0 report
```

Exit **1**. Wired straight into CI, this would fail every build until someone
writes that Rollback section — which is exactly the pressure that makes teams
give up on adoption. So don't gate on the exit code yet; gate on the *diff*.

## 2. Add the baseline script

One script does both jobs: `--write` snapshots the current findings to a
baseline file, and the plain form fails only on findings whose key isn't in
it. The key is **`path + id + message`** — deliberately *not* the line number:

```js
// scripts/check-baseline.mjs — gate a validate run against a committed baseline.
//
//   snapshot:  node scripts/check-baseline.mjs --write <baseline.json> <current.json>
//   gate:      node scripts/check-baseline.mjs <baseline.json> <current.json>
//
// <current.json> is the CLI's `--format json` output: a Finding[] array.
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const write = args[0] === "--write";
const [baselinePath, currentPath] = write ? args.slice(1) : args;

const findings = JSON.parse(readFileSync(currentPath, "utf8"));

// Key by path + id + message — deliberately NOT the line number, so edits
// elsewhere in a file can move a legacy finding without churning the baseline.
const key = (f) => [f.path, f.id, f.message].join("\n");

if (write) {
  const entries = new Map();
  for (const f of findings) {
    entries.set(key(f), { path: f.path, id: f.id, message: f.message });
  }
  const sorted = [...entries.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, e]) => e);
  writeFileSync(baselinePath, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`baseline written: ${sorted.length} finding key(s) -> ${baselinePath}`);
  process.exit(0);
}

const baseline = new Set(
  JSON.parse(readFileSync(baselinePath, "utf8")).map(key),
);

const fresh = findings.filter((f) => !baseline.has(key(f)));
const currentKeys = new Set(findings.map(key));
const stale = [...baseline].filter((k) => !currentKeys.has(k)).length;

if (stale > 0) {
  console.log(`note: ${stale} baseline entry(ies) no longer fire — prune them`);
}
if (fresh.length === 0) {
  console.log(`no new findings (${findings.length} current, ${baseline.size} baselined)`);
  process.exit(0);
}
console.error(`${fresh.length} new finding(s) not in baseline:`);
for (const f of fresh) {
  console.error(`  ${f.path}:${f.pos?.line ?? "-"} ${f.level} ${f.id} — ${f.message}`);
}
process.exit(1);
```

Why line-agnostic? A finding's `pos` moves whenever anyone edits *anything
above it* in the file. Keying on the line would make every unrelated edit
churn the baseline — a merge-conflict magnet nobody re-reviews. With
`path + id + message`, we later added an intro paragraph to
`restart-cache.md` that pushed the legacy finding from line 7 to line 9, and
the gate stayed green with the baseline untouched.

Snapshot the current state and commit both files:

```sh
markdown-contract validate docs --contract runbook.contract.yaml --format json > current.json || true
node scripts/check-baseline.mjs --write .mc-baseline.json current.json
```

```text
baseline written: 1 finding key(s) -> .mc-baseline.json
```

The `|| true` matters: `validate` rightly exits **1** while legacy findings
exist, but here its JSON output is an input, not the verdict. The committed
baseline is small, sorted, and human-reviewable:

```json
[
  {
    "path": "restart-cache.md",
    "id": "structure/section-missing",
    "message": "required section ‘Rollback’ is missing"
  }
]
```

## 3. Fail only on what's new

With nothing changed, the gate passes even though `validate` still reports the
legacy finding:

```sh
node scripts/check-baseline.mjs .mc-baseline.json current.json
```

```text
no new findings (1 current, 1 baselined)
```

Exit **0**. Now someone edits `rotate-keys.md` and drops its `owner` field.
`validate` reports both findings, old and new:

```text
Scanned 2 files; 2 matched, 0 unmatched

restart-cache.md:7 error structure/section-missing — required section ‘Rollback’ is missing
rotate-keys.md error frontmatter/required — frontmatter field ‘owner’ is required

2 finding(s): 2 error, 0 warn, 0 report
```

…but the gate reports **only the one that isn't baselined**, and flips the
exit code:

```text
1 new finding(s) not in baseline:
  rotate-keys.md:- error frontmatter/required — frontmatter field ‘owner’ is required
```

Exit **1**. (The `-` where a line number would go: `frontmatter/required` is a
whole-document finding with no `pos` — see the
[finding shape](/reference/findings/).)

## 4. Wire it into CI

Two steps: produce the JSON, gate on the diff. The *script's* exit code is now
the gate, so the `validate` step must not fail the job on its own:

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
      # npm; see Getting started. Then diff findings against the baseline:
      - run: markdown-contract validate docs --contract runbook.contract.yaml --format json > current.json || true
      - run: node scripts/check-baseline.mjs .mc-baseline.json current.json
```

:::caution
Findings carry paths **relative to the run root** (`restart-cache.md`, not
`docs/restart-cache.md`). Snapshot and gate with the same `validate`
invocation from the same directory — same root, same contract flags —
or every key changes at once.
:::

## What's happening

- **`--format json` is the contract for tooling.** It emits the raw
  `Finding[]` exactly as the runner returns it — stable, two-space-indented,
  `JSON.parse`-round-trippable — and findings arrive in deterministic order,
  so the snapshot only changes when the findings do. Shape and formats:
  [Findings & rule IDs](/reference/findings/), [CLI reference](/reference/cli/).
- **The exit code moves from `validate` to the script.** The CLI still exits
  `1` (there *are* error-level findings — the baselined ones), which is why the
  produce step ends in `|| true`. The gate step's `0`/`1` is what CI acts on.
- **Ratchet it down.** The baseline is a debt ledger, not a license: every
  time someone fixes a legacy finding, the gate prints
  `note: 1 baseline entry(ies) no longer fire — prune them` — delete that entry
  and commit, and the baseline only ever shrinks. (Strict version: make stale
  entries exit non-zero too, so fixes *must* be recorded.)

:::tip
A baseline diff is the lenient door for *old* files; you can combine it with a
stricter posture for new ones — see
[Strict for published docs, lenient for drafts](/recipes/strict-published-lenient-drafts/)
for splitting postures by folder instead of by time.
:::

## Next

- [Validate only the files changed in a PR](/recipes/check-only-changed-files/)
  — a different way to keep legacy debt out of the gate.
- [Errors block the build, warnings annotate the PR](/recipes/warnings-as-pr-annotations/)
  — route by level instead of by baseline.
- [Embed & Automate](/examples/embed-and-ci/) — the JSON-parsing and baseline
  patterns this recipe builds on, including an in-process `runCorpus` variant.
