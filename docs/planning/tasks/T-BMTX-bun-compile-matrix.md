---
type: task
schema_version: '5'
id: T-BMTX
status: planning/draft
created: '2026-06-28'
related:
  - '[[M-0008-single-exec-distribution]]'
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
  - '[[D-0010-monorepo-tooling]]'
depends_on:
  - '[[T-WKSP-bun-workspace-split]]'
tags:
  - distribution
  - bun
  - compile
  - ci
need_human_review: true
impact: high
complexity: large
autonomy: supervised
---
# Cross-compile the CLI to a single binary per OS/arch with `bun build --compile`

## Goal

Produce a self-contained `markdown-contract` binary for **macOS / Linux / Windows × x64 / arm64** from one host, built via `bun build --compile` as cached moon tasks over the workspace — the foundation of [[M-0008-single-exec-distribution]], per [[D-0012-distribution-single-exec-and-web-ui]] §D2.

## Today

The CLI runs only as `node dist/cli/index.js` (the npm bin); there is no standalone binary and no cross-compile pipeline. moon + the Bun toolchain are in place ([[T-MOON-adopt-moon-monorepo]]); the workspace split ([[T-WKSP-bun-workspace-split]]) gives `packages/core` as the compile target.

## Proposed

A moon task (per target triple) running `bun build --compile --target=<triple>` against the CLI entry in `packages/core`, emitting one binary per OS/arch into a `dist-bin/` layout, with the matrix runnable from a single host.

## Approach

Define a parameterized moon task / target list for the 6 triples (darwin-x64, darwin-arm64, linux-x64, linux-arm64, windows-x64, windows-arm64; +musl as needed), wire `bun build --compile` with the CLI entrypoint, cache by inputs (`packages/core/src/**`), and verify each produced binary runs `validate`/`init`. Note Deno `compile` as the documented fallback if Bun proves unsuitable (D-0012 §D2).

## Files to touch

- `packages/core` build config; a `moon.yml` compile task (matrix over targets).
- a `dist-bin/` output convention; `.gitignore`.

## Acceptance criteria

- [ ] `bun build --compile` produces a runnable binary for each of macOS/Linux/Windows × x64/arm64 from one host, via moon tasks.
- [ ] Each binary runs the CLI identically to the npm bin (`validate`/`init`/etc.) — a parity smoke check.
- [ ] The npm publish flow (`tsc` → `dist`) is unchanged.

## Out of scope

- Release upload / channels ([[T-RELS-release-channels]]); installers ([[T-INST-convenience-installer]]); signing/notarisation (deferred, D-0012 §D5).
- Embedding the web UI SPA — that is the spike [[T-SPAE-spa-embed-spike]].

## Dependencies

- Depends on [[T-WKSP-bun-workspace-split]] (compile target = `packages/core`) and the moon/Bun toolchain ([[T-MOON-adopt-moon-monorepo]]). Governed by [[D-0012-distribution-single-exec-and-web-ui]] / [[D-0010-monorepo-tooling]].
