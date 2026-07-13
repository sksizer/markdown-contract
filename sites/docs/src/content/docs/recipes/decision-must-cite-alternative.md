---
title: A Decision section must cite an alternative
description: A decision record that never mentions what was rejected is just an announcement. Require alternative-citing language in the Decision section itself.
---

**The situation.** Your decision records all have a **Decision** section — the
structure is fine. The problem is editorial: half of them read "We will use X."
and stop. No rejected option, no *instead of*, no trade-off. A decision that never
names what it turned down is an announcement, and six months later nobody can
tell whether the alternatives were weighed or never existed. You want the
validator to insist that the Decision section *cites an alternative*.

That's one `requires:` entry on one section — the declarative
[text constraints](/reference/yaml/) applied to a single high-value editorial rule.

## 1. Put `requires:` on the Decision section

A section node can carry a `requires:` list: phrases (or regexes) that must
appear somewhere in that section's text. Here the Decision section must contain
alternative-citing language, and the `note` explains *why* right in the finding:

```yaml
# decision.contract.yaml
mcVersion: 1
kind: contract
frontmatter:
  fields:
    status: { enum: [proposed, accepted, superseded] }
body:
  sections:
    - section: Context
    - section: Decision
      requires:
        - regex: 'alternative|instead of|rather than'
          ignoreCase: true
          note: name at least one rejected alternative
```

The regex is deliberately loose — it checks for the *language* of comparison, not
any particular phrasing. Tune the word list to how your team actually writes.

:::caution
`regex:` values are JavaScript regexes. Inline flags like `(?i)` are **not**
valid — the run aborts with `Invalid regular expression` and exit code **2**
(usage/config error). Use `ignoreCase: true` on the match spec instead, as above.
:::

## 2. Run it against an announcement

`decisions/` holds two records. `D-0042.md` already names the option it rejected;
`D-0041.md` has every required section but its Decision is pure announcement:

```markdown
## Decision

We will emit findings as JSON on `--format json` and treat the shape as a public API.
```

```sh
markdown-contract validate decisions --contract decision.contract.yaml
```

```text
Scanned 2 files; 2 matched, 0 unmatched

D-0041.md:9 error text/requires/decision/17y0yyo — required phrase /alternative|instead of|rather than/ not found in Decision — name at least one rejected alternative

1 finding(s): 1 error, 0 warn, 0 report
```

Exit **1**, so this gates CI as-is. The finding pins to line 9 — the `## Decision`
heading, the scope that was searched — and the message carries your `note`, so
the author reading the failure knows what to add and why, not just that a regex
didn't match.

## 3. Cite the alternative

One sentence fixes it — and makes the record better:

```markdown
## Decision

We will emit findings as JSON on `--format json` and treat the shape as a public
API, rather than asking scripts to parse the human-formatted lines.
```

```sh
markdown-contract validate decisions --contract decision.contract.yaml
```

```text
Scanned 2 files; 2 matched, 0 unmatched

No findings.
```

Exit **0**. Wiring this into CI is the standard one-liner —
[Guard a folder of docs in CI](/recipes/guard-a-folder-in-ci/) shows the workflow
step (installing from source until the package is on npm — see
[Getting started](/getting-started/)).

## What's happening

- **`requires:` on a section node** compiles to a rule scoped to that section's
  subtree — the phrase must appear under **Decision**, not merely somewhere in
  the file. A Context section that happens to say "alternative" doesn't satisfy
  it. The full match-spec vocabulary (`pattern` vs `regex`, `ignoreCase`,
  `min`/`max` counts, `level`) is in the
  [Declarative YAML reference](/reference/yaml/).
- **The id is synthesized.** `text/requires/decision/17y0yyo` is
  `text/<kind>/<scopeKey>/<patternHash>` — stable across entry reordering, unique
  per scope. See [Findings & rule IDs](/reference/findings/) for the `text/*`
  families.
- **`forbids:` is the mirror image** — the same match spec, failing when the
  phrase *is* present (ban "TBD", ban "just", ban internal codenames). The two
  together are covered in
  [Require a phrase in a section, forbid one everywhere](/recipes/require-or-forbid-phrases/).

:::tip
Prefer a readable id over the hash? Set `id:` on the match spec:

```yaml
      requires:
        - regex: 'alternative|instead of|rather than'
          ignoreCase: true
          id: decision/cites-alternative
          note: name at least one rejected alternative
```

The same violation then reports as
`D-0041.md:9 error decision/cites-alternative — …` — nicer in CI logs and
stable for baselines or suppressions.
:::

:::note
This is a *language* check, not a comprehension check — "rather than doing
nothing" technically passes. That's the right trade: the contract makes the
lazy path (saying nothing about alternatives) fail loudly, and review handles
the rest.
:::

## Next

- [Require a phrase in a section, forbid one everywhere](/recipes/require-or-forbid-phrases/)
  — the general tour of `requires` / `forbids`, including document-scoped rules.
- [Turn your ADR convention into an enforced template](/recipes/enforce-adr-template/)
  — the full decision-record contract this rule slots into.
- The match-spec table lives in the
  [Declarative YAML reference](/reference/yaml/).
