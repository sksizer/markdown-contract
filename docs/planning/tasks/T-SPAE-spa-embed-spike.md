---
type: task
schema_version: '5'
id: T-SPAE
status: planning/draft
created: '2026-06-28'
related:
  - '[[M-0008-single-exec-distribution]]'
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
  - '[[C-0010-single-binary-and-vault-dashboard]]'
  - '[[M-0009-local-web-ui-vault-dashboard]]'
depends_on:
  - '[[T-BMTX-bun-compile-matrix]]'
tags:
  - distribution
  - bun
  - spike
  - web-ui
need_human_review: true
impact: high
complexity: medium
autonomy: supervised
---
# Spike: embed the built web-UI SPA into the compiled binary (the M-0009 bridge)

## Goal

De-risk the "one binary, two faces" plan by proving end-to-end that the built Nuxt **client SPA** can be embedded into the `bun build --compile` binary and served at runtime — so the later web-UI milestone ([[M-0009-local-web-ui-vault-dashboard]]) ships in the **same** binary, per [[D-0012-distribution-single-exec-and-web-ui]] §D2 and [[C-0010-single-binary-and-vault-dashboard]].

## Today

The compile path ([[T-BMTX-bun-compile-matrix]]) targets the CLI only; whether Bun's HTML-import / `Bun.embeddedFiles` mechanism can bundle a whole built SPA directory into the binary and serve it is unproven. This is the single open packaging risk gating M-0009.

## Proposed

A minimal spike: build a trivial SPA (or the real Nuxt client output), embed it via Bun's HTML import / explicit embedded files, compile to a binary, and serve the embedded assets from a daemon stub — confirming asset paths resolve from inside the binary.

## Approach

Stand up the smallest possible `apps/web` client build, wire a `Bun.serve` that serves `Bun.embeddedFiles` (or the HTML-import graph), `bun build --compile` it, and run the binary to fetch an embedded asset. Document the working mechanism and any gaps (e.g. whole-directory embedding limitations) and the Deno-compile fallback.

## Files to touch

- a throwaway/minimal `apps/web` client + serve stub (spike scope).
- notes captured back into [[D-0012-distribution-single-exec-and-web-ui]] / [[M-0009-local-web-ui-vault-dashboard]].

## Acceptance criteria

- [ ] A compiled binary serves an embedded SPA asset fetched over HTTP from inside the binary (no external files).
- [ ] The working embed mechanism (and any limitations / fallback) is documented for M-0009 to build on.
- [ ] The spike does not regress the CLI-only binary parity from [[T-BMTX-bun-compile-matrix]].

## Out of scope

- The actual daemon, vault registry, live status, and dashboard UI — [[M-0009-local-web-ui-vault-dashboard]].
- Production hardening — this is a packaging spike.

## Dependencies

- Depends on [[T-BMTX-bun-compile-matrix]] (the compile path). Bridges to [[M-0009-local-web-ui-vault-dashboard]].
