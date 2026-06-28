---
type: milestone
schema_version: '1'
id: M-0006
title: Single-executable distribution — the cross-platform CLI binary
status: open/planned
created: '2026-06-28'
related:
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
  - '[[D-0010-monorepo-tooling]]'
  - '[[C-0010-single-binary-and-vault-dashboard]]'
  - '[[PR-0002-markdown-contract-cli]]'
contains: []
tags:
  - distribution
  - packaging
  - cli
  - bun
  - single-binary
  - milestone
need_human_review: true
---

# Single-executable distribution — the cross-platform CLI binary

## Summary

- Ship `markdown-contract` as a single self-contained, cross-platform binary built with Bun `build --compile` (macOS/Linux/Windows × x64/arm64), distributed via GitHub Releases + Homebrew/Scoop/curl alongside the unchanged npm package; v1 unsigned. Per [[D-0012-distribution-single-exec-and-web-ui]] (binary half), built on the workspace of [[D-0010-monorepo-tooling]]. ^summary
- CLI binary only; the embedded web UI / vault dashboard is the later/tbd milestone (capability [[C-0010-single-binary-and-vault-dashboard]]).

## Outcome

A user downloads one file per OS/arch and runs the full CLI without a Node toolchain.

## Scope

**In:** the `bun build --compile` matrix; release channels; unsigned-v1 install notes; the SPA-embed packaging spike (so the later UI milestone ships in the same binary).
**Out:** the web UI / daemon / vault dashboard (later/tbd); signing/notarisation (deferred); Tauri.

## Success criteria

- Cross-compiled binaries for macOS/Linux/Windows × x64/arm64 produced from one host via moon tasks.
- Each binary runs the CLI identically to the npm bin (`validate`/`init`/etc.).
- Binaries published on GitHub Releases (with checksums) plus at least one convenience installer; the npm package unchanged.
- The SPA-embed approach is validated (the one packaging spike) so the later UI milestone reuses the same binary.
