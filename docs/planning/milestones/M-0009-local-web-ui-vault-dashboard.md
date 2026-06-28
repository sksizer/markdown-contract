---
type: milestone
schema_version: '1'
id: M-0009
title: Local web UI & vault dashboard — the bundled daemon surface
status: open/tbd
created: '2026-06-28'
related:
  - '[[C-0010-single-binary-and-vault-dashboard]]'
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
  - '[[M-0008-single-exec-distribution]]'
contains: []
tags:
  - web-ui
  - dashboard
  - daemon
  - nuxt
  - milestone
need_human_review: true
---

# Local web UI & vault dashboard — the bundled daemon surface

## Summary

- The local, embedded **web UI / vault dashboard**: a daemon mode that serves a Nuxt SPA (bundled into the same binary) showing the live status of the several managed markdown vaults on a host. Per the capability [[C-0010-single-binary-and-vault-dashboard]] and the web-UI half of [[D-0012-distribution-single-exec-and-web-ui]]. ^summary
- **Later / tbd** — scope, sequencing, and design are not yet settled. This is the second face of the single binary ([[M-0008-single-exec-distribution]] ships the CLI-only binary and validates the SPA-embed approach first).

## Outcome

A user runs the binary in daemon mode and opens a local web dashboard that tracks the status of every managed vault/config on the machine — no separate install, the same binary that runs the CLI.

## Scope

**In (provisional):** the bundled Nuxt SPA; daemon/serve mode; the flat-file vault registry; in-memory live status over SSE; optional persisted history.
**Out (provisional):** anything not yet decided — this milestone is a placeholder pending design.

## Success criteria

- _To be defined._ Placeholder milestone capturing the agreed "later/tbd" web UI / vault dashboard work so the roadmap is complete; success criteria are set once the milestone is scoped.
