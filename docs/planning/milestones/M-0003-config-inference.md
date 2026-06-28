---
type: milestone
schema_version: '1'
id: M-0003
title: Config inference & `init` scaffolding
status: open/active
created: '2026-06-28'
related:
  - '[[C-0008-config-scaffolding]]'
  - '[[D-0009-config-inference]]'
  - '[[C-0006-declarative-yaml-contracts]]'
  - '[[C-0007-declarative-corpus-meta-config]]'
  - '[[C-0003-corpus-cli]]'
  - '[[M-0002-declarative-yaml-contracts-v1]]'
contains:
  - '[[T-INIT-config-inference-init-verb]]'
  - '[[T-2CSL-const-string-length-cap]]'
  - '[[T-3MCE-min-examples-before-const]]'
  - '[[T-NULL-nullable-field-inference]]'
  - '[[T-KCOL-infer-heading-key-collisions]]'
  - '[[T-RUNS-validate-run-summary]]'
tags:
  - yaml
  - declarative
  - inference
  - init
  - scaffolding
  - milestone
need_human_review: true
---

# Config inference & `init` scaffolding

## Summary

- Ship `markdown-contract init <dir>…`: infer a tight-but-accepting config (single-contract, or a `--meta` tree cut at `--depth`) from existing markdown, guaranteed by an accept-by-construction self-check — per [[C-0008-config-scaffolding]] / [[D-0009-config-inference]]. The first additive feature after the v1 declarative front-end ([[M-0002-declarative-yaml-contracts-v1]]). ^summary
- The core verb is shipped; hardening is in flight (const string-length cap, min-const-examples floor, nullable fields, heading key-collision handling, a zero-findings run summary).

## Outcome

A consumer bootstraps a runnable, self-accepting config from a directory of markdown in one command, then tightens or `--relax`es it by hand.

## Scope

**In:** the `init` verb (single + meta modes, `--depth`, `--inline`, `--check`, `--include`/`--exclude` scoping); the value-type ladder; the accept-by-construction self-check; the inference hardening tasks.
**Out:** content-plane leaf inference and deep nested grammars ([[D-0009-config-inference]] § Out of scope).

## Success criteria

- `markdown-contract init` produces a config that validates its own corpus with zero findings, in both single-contract and `--meta` modes.
- The value ladder (const / number / boolean / format / enum / string) and its guards (string-length cap, min-examples floor, nullable, heading key-collision) behave per [[D-0009-config-inference]].
- `--check` works as a CI drift guard (exit 1 when a doc drifts from the inferred shape).
