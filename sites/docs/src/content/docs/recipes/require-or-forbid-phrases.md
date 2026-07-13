---
title: Require a phrase in a section, forbid one everywhere
description: Editorial rules a grep only half-enforces — every Security section must mention the threat model, and an internal codename must appear nowhere — as declarative phrase checks with positioned, levelled findings.
---

**The situation.** Your release notes carry two editorial rules that a shell
script half-enforces today: every **Security** section must actually say
something about the threat model, and the internal codename — *Nightfall*, the
product shipped as *Atlas* — must never leak into a published note. The grep
can't scope a match to one section, misses a phrase wrapped across a line
break, and treats every hit as equally fatal.

A contract expresses both rules as data: `requires:` / `forbids:` lists, scoped
either to one section or to the whole document, each entry with its own note
and level.

## 1. Write the phrase rules into the contract

Two scopes in one contract. `forbids:` on the **body root** (a sibling of
`sections:`) covers the entire document; `requires:` / `forbids:` on a
**section node** cover just that section's text:

```yaml
# release-note.contract.yaml
mcVersion: 1
kind: contract
body:
  allowUnknown: true
  forbids:
    - pattern: Nightfall
      note: internal codename — the public name is Atlas
  sections:
    - section: Summary
    - section: Security
      requires:
        - pattern: threat model
          ignoreCase: true
          note: say what the threat model is, even in one line
      forbids:
        - pattern: TBD
          level: warn
```

Each entry is a **match spec**: exactly one of `pattern` (a literal) or `regex`
(a regex source), tuned by `normalize` / `ignoreCase`, with optional `min` /
`max` occurrence bounds and `id` / `note` / `level`. The full vocabulary is in
the [YAML reference](/reference/yaml/#section-text-constraints--requires--forbids).

:::tip
Literal `pattern` matching is whitespace-flexible by default (`normalize: true`),
so "threat model" still matches when prose wraps it across a line break — the
case a plain grep misses. Set `normalize: false` when you need exact bytes.
:::

## 2. Run it

Here `release-notes/2.4.md` is clean, and `2.5.md` breaks all three rules:

```md
# Atlas 2.5

## Summary

Nightfall ships SSO for all plans.

## Security

Session lifetime is now configurable. Audit-log coverage: TBD.

## Rollout

Nightfall reaches all regions by Friday.
```

```sh
markdown-contract validate release-notes --contract release-note.contract.yaml
```

```text
Scanned 2 files; 2 matched, 0 unmatched

2.5.md:5 error text/forbids/doc/o9h1hc — forbidden phrase "Nightfall" present — internal codename — the public name is Atlas
2.5.md:7 error text/requires/security/1ksplcf — required phrase "threat model" not found in Security — say what the threat model is, even in one line
2.5.md:9 warn text/forbids/security/1en0qr7 — forbidden phrase "TBD" present
2.5.md:13 error text/forbids/doc/o9h1hc — forbidden phrase "Nightfall" present — internal codename — the public name is Atlas

4 finding(s): 3 error, 1 warn, 0 report
```

Read the positions: a **forbidden phrase that's present** lands on the
offending line, one finding per hit (lines 5 and 13 — both codename leaks are
reported, not just the first). A **required phrase that's absent** has no line
to point at, so `text/requires` lands on the section heading (line 7). The
`TBD` entry fires as a **warn**, and your note rides along in each message.

The run exits **1** because error-level findings are present. A run whose only
findings are warns exits **0** — `level: warn` flags without blocking. (See the
[exit-code contract](/reference/cli/#exit-codes).)

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
      - run: markdown-contract validate release-notes --contract release-note.contract.yaml
```

The codename check and the missing-threat-model check fail the build; the `TBD`
warning doesn't. To surface the warns visibly instead of losing them in a green
log, see [Errors block the build, warnings annotate the PR](/recipes/warnings-as-pr-annotations/).

## What's happening

- **Two scopes, one vocabulary.** On a section node, `requires:` / `forbids:`
  compile to node-local rules over that section's subtree; on the body root
  they compile to one document-scoped text rule. Same match specs, same
  findings either way — [YAML reference](/reference/yaml/#section-text-constraints--requires--forbids)
  and worked contracts in [Declarative YAML examples](/examples/declarative-yaml/).
- **The ids are synthesized.** `text/forbids/doc/o9h1hc` is
  `text/<kind>/<scopeKey>/<patternHash>` — stable when you reorder entries,
  unique per scope, and overridable per entry with `id`. The `text/*` families
  and their default levels are in the [findings reference](/reference/findings/).
- **Beyond present/absent:** `min` / `max` bound *how many times* a phrase may
  occur (`text/count` when violated), and `regex` matches a pattern — say,
  either of two status markers — instead of a fixed substring.

:::caution
The compiler rejects contradictory authoring up front rather than letting it
surface as confusing findings. Require and forbid the same literal at one scope
and the run stops before any file is read, exiting **2** (a config error, not a
finding):

```text
markdown-contract: body.sections[0]: contradiction in Security — the literal "TBD" is both required and forbidden
```
:::

## Next

- [Errors block the build, warnings annotate the PR](/recipes/warnings-as-pr-annotations/)
  — make that `level: warn` entry show up on the diff.
- [Guard a folder of docs in CI](/recipes/guard-a-folder-in-ci/) — the basic
  single-folder gate this recipe builds on.
- [A Decision section must cite an alternative](/recipes/decision-must-cite-alternative/)
  — the same text constraints enforcing an argumentation rule.
