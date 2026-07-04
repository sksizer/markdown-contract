---
type: task
schema_version: '5'
id: T-DEMO
status: planning/needs-definition
created: '2026-06-30'
related:
- '[[M-0008-single-exec-distribution]]'
- '[[D-0012-distribution-single-exec-and-web-ui]]'
- '[[C-0010-single-binary-and-vault-dashboard]]'
- '[[T-UDPO-extract-single-binary-example]]'
depends_on:
- '[[T-SPAE-spa-embed]]'
tags:
- distribution
- prototype
- demo
- docs
need_human_review: true
impact: high
complexity: small
autonomy: supervised
definition_gap: 'The ## Today table references the modeling-source path `tests/corpus/`,
  which no longer exists: the corpus moved to `packages/core/tests/fixtures/corpus/`
  in the monorepo split, so the touchpoint resolves to directory-missing and fails
  the implementation-ready gate. Update that one Today-table row to the current path
  (it is a secondary modeling reference, not a file the task edits); every other referenced
  path (examples/single-binary/, its daemon fixture vault, README.md) resolves and
  the demo deliverable is fully feasible against the current binary. No other sections
  are missing, thin, or placeholder-bearing.'
---
# End-to-end feasibility demo — the fully illustrated example

## Goal

Tie the prototype together into **one reproducible, illustrated walkthrough** that proves
the whole [[D-0012-distribution-single-exec-and-web-ui]] shape works end to end: build the
single binary, run it as a CLI, run it as a `daemon`, open the embedded web UI in a browser,
validate a sample vault, and see the findings render — all from one self-contained file. This
walkthrough is the headline deliverable of [[M-0008-single-exec-distribution]] (the "fully
illustrated example").

## Today

| Location | Role today |
|---|---|
| `README.md` | The project front door; no single-binary / daemon walkthrough yet. |
| `examples/single-binary/` | The canonical example the walkthrough demonstrates ([[T-UDPO-extract-single-binary-example]]): `bun run build:binary` there emits `dist/markdown-contract`, the two-faces binary with the embedded SPA. |
| `examples/single-binary/src/daemon/fixtures/vault/` | A tiny passing/failing vault pair the demo can model its sample vault on. |
| `tests/corpus/` | Larger fixture vaults, another modeling source. |

The binary already builds from the example (host target); the cross-compile matrix and CI
smoke are [[T-BMTX-bun-compile-matrix]]. This task is the illustrated demonstration over it.

## Proposed

A committed sample vault, a `scripts/demo.sh` that drives the whole loop, and a docs page
(`docs/prototype-demo.md`, linked from `README.md`) with the exact commands and a couple of
captured screenshots/output blocks — so a reviewer reproduces the feasibility result in one
run without prior context.

## Approach

1. **Sample vault.** Add `examples/demo-vault/` — a handful of markdown files plus a
   `markdown-contract.yaml`, one file deliberately failing a rule, so validation shows both a
   clean and an error finding.
2. **Demo script.** Add `scripts/demo.sh`: build the binary
   (`moon run example-single-binary:build`, or the [[T-BMTX-bun-compile-matrix]] `compile`
   task once it lands), run `<binary> validate examples/demo-vault`, then start
   `<binary> daemon --open` (port 4320), `curl` `POST /api/validate` for the sample vault, and
   print the findings JSON — failing loudly if any step regresses.
3. **Walkthrough doc.** Write `docs/prototype-demo.md`: prerequisites, the build command
   (`bun run build:binary` in `examples/single-binary/` → `dist/markdown-contract`), the
   CLI run with its output, the daemon run, the browser URL, and a screenshot of the findings
   view; state explicitly what is proven (one binary = CLI + embedded-SPA daemon) and what is
   deferred to [[M-0009-local-web-ui-vault-dashboard]] — pointing at
   `examples/single-binary/README.md` for the architecture discussion.
4. **Link it.** Add a "Try the single-binary prototype" section to `README.md` pointing at the doc.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `examples/demo-vault/` | new | Sample vault: a few markdown files + `markdown-contract.yaml`, one intentional failing case. |
| `scripts/demo.sh` | new | Drives build → CLI validate → daemon → API call; fails on regression. |
| `docs/prototype-demo.md` | new | The illustrated walkthrough (commands, output, screenshot, what's proven vs deferred). |
| `README.md` | modify | Add a "Try the single-binary prototype" section linking the walkthrough. |

## Acceptance criteria

- [ ] AC-1: `scripts/demo.sh` runs the full loop (build the binary → `validate` the sample vault → start `daemon` → call `/api/validate`) and exits `0` on success, non-zero on any regression.
- [ ] AC-2: `examples/demo-vault/` contains at least one passing file and one intentionally failing file, so validation shows both states.
- [ ] AC-3: `docs/prototype-demo.md` documents the exact commands and the browser step, includes a captured findings view, and states what the prototype proves and what is deferred to [[M-0009-local-web-ui-vault-dashboard]].
- [ ] AC-4: `README.md` links the walkthrough.

## Out of scope

- Any new product capability — this task only demonstrates the prototype the other M-0008 tasks build.
- Releasing / installing the binary — [[T-RELS-release-channels]] / [[T-INST-convenience-installer]].
- The production dashboard the demo previews — [[M-0009-local-web-ui-vault-dashboard]].

## Dependencies

- Depends on [[T-SPAE-spa-embed]] (the working binary with the embedded UI — landed; the demo's subject now lives at `examples/single-binary/` per [[T-UDPO-extract-single-binary-example]]), which pulled in [[T-DAEM-daemon-and-json-api]] and [[T-WEBU-nuxt-spa-ui]]. [[T-BMTX-bun-compile-matrix]] supplies the cross-compile/CI story the demo can cite. Governed by [[D-0012-distribution-single-exec-and-web-ui]].
