---
title: Every vault note exposes a ^summary block
description: Your index notes transclude ![[note#^summary]] — and silently break when a note lacks the anchor. A contract makes the ^summary block-id mandatory.
---

**The situation.** Your Obsidian vault has index notes that pull each note's
summary in by transclusion:

```md
# Reading queue

- ![[parser-rewrite#^summary]]
- ![[queue-migration#^summary]]
```

This works only while every note actually carries a `^summary` block-id. Nothing
enforces that: when someone adds a note without the anchor, the vault doesn't
error — the transclusion just renders as a broken embed, and you find out when
you next open the index. You want the convention "every note's **Summary**
section exposes `^summary`" to be checkable, so a missing anchor is a finding,
not a surprise.

## 1. Write the contract

One `anchor` key on the section does it. The contract stays lenient everywhere
else so notes can grow freely:

```yaml
# note.contract.yaml
mcVersion: 1
kind: contract
body:
  order: recognized-relative
  allowUnknown: true                 # notes grow freely past the Summary
  sections:
    - section: Summary
      anchor: summary                # a ^summary block-id must resolve here
```

Declaring `anchor: summary` asks the structure plane to check that a `^summary`
block-id resolves inside the **Summary** section — the
[Declarative YAML reference](/reference/yaml/) documents the key.

## 2. Run it

From the vault root, point `validate` at the notes folder. With one note that
carries the anchor and one that doesn't:

```sh
markdown-contract validate notes --contract note.contract.yaml
```

```text
Scanned 2 files; 2 matched, 0 unmatched

queue-migration.md:1 error structure/anchor-missing — section ‘Summary’ is missing required block-id ^summary

1 finding(s): 1 error, 0 warn, 0 report
```

Exit **1**. The finding pins to the section's heading line — the section exists,
but no `^summary` resolves inside it, which is exactly the state that breaks the
index's `![[queue-migration#^summary]]` embed.

## 3. Add the anchor

The conforming form is a standalone `^summary` line right after the summary
paragraph:

```md
## Summary

Moves the job queue from Redis to Postgres.
^summary

## Details

Migration plan and rollback notes.
```

A standalone `^id` line binds to the block above it, so the transclusion now has
a real target. Re-run:

```text
Scanned 2 files; 2 matched, 0 unmatched

No findings.
```

Exit **0** — every note in the folder is safe to transclude.

:::caution
Don't put the anchor on the heading line itself. `## Summary ^summary` is not an
anchored section — a `^id` on a heading is never lifted off, so the heading text
becomes literally `Summary ^summary` and the run reports
`structure/section-missing` instead: the section itself no longer matches.
Anchor a *block inside* the section, or use a standalone `^summary` line.
:::

## 4. Wire it into CI

If the vault lives in git, the exit code gates the push like any other repo:

```yaml
# .github/workflows/vault.yml
name: vault
on: [push, pull_request]
jobs:
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # Install markdown-contract first — it's built from source until it's on
      # npm; see Getting started. Then gate on the contract:
      - run: markdown-contract validate notes --contract note.contract.yaml
```

For a local-first vault, the same command works as a
[pre-commit hook](/recipes/pre-commit-hook/) instead.

## What's happening

- **`anchor: summary` is a structure-plane check.** The parser's Obsidian dialect
  recognizes line-terminal `^block-id` tokens; the declared anchor asks that a
  matching one resolve in the section, and a miss is the
  `structure/anchor-missing` rule (default level: error) — see the
  [findings reference](/reference/findings/).
- **Block anchors vs section anchors.** A trailing `prose… ^summary` or a
  standalone `^summary` line binds to a *block*; a standalone `^summary` directly
  under the heading, with no block before it, records on the *section* itself.
  Either placement satisfies the contract — both resolve inside the section.
  For Obsidian transclusion, prefer anchoring the paragraph: `![[note#^summary]]`
  then embeds exactly that block. The binding rules (including the table
  special case) are in the [dialect reference](/reference/dialect/).
- The validator only ever **reads** — it flags the missing anchor; it never
  inserts one.

:::note
This contract guarantees the **anchor side**: every note under `notes/` exposes
`^summary`, so any `![[note#^summary]]` embed has a target. Checking the *link
side* — that each `![[…]]` in the index points at a note that exists — is a
cross-file job the tool doesn't do out of the box today. The programmatic API's
custom rules can get there; see
[Cross-document references](/recipes/cross-document-references/) for that
pattern.
:::

## Next

- [Cap the summary and make it addressable](/recipes/summary-length-and-anchor/)
  — the same anchor plus a word budget, so the embed stays short.
- [Dialect examples](/examples/dialect/) — worked documents covering anchors,
  wikilinks, and transclusions, including
  [requiring an anchor with a contract](/examples/dialect/dialect-09/).
- [Dialect reference](/reference/dialect/) — the exact `^block-id` syntax and
  where each anchor binds.
