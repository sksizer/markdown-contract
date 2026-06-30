---
type: task
schema_version: '5'
id: T-DEMO
status: open/ready
created: '2026-06-30'
related:
  - '[[M-0008-single-exec-distribution]]'
  - '[[D-0012-distribution-single-exec-and-web-ui]]'
  - '[[C-0010-single-binary-and-vault-dashboard]]'
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
| `tests/corpus/` | Existing fixture vaults the demo can model a sample vault on. |

The binary itself does not exist yet — it is produced by [[T-BMTX-bun-compile-matrix]] with
the embedded UI from [[T-SPAE-spa-embed]]; this task is the demonstration over it.

## Proposed

A committed sample vault, a `scripts/demo.sh` that drives the whole loop, and a docs page
(`docs/prototype-demo.md`, linked from `README.md`) with the exact commands and a couple of
captured screenshots/output blocks — so a reviewer reproduces the feasibility result in one
run without prior context.

## Approach

1. **Sample vault.** Add `examples/demo-vault/` — a handful of markdown files plus a
   `markdown-contract.yaml`, one file deliberately failing a rule, so validation shows both a
   clean and an error finding.
2. **Demo script.** Add `scripts/demo.sh`: build the binary (invoke the
   [[T-BMTX-bun-compile-matrix]] moon `compile` task), run `<binary> validate examples/demo-vault`,
   then start `<binary> daemon --open`, `curl` `POST /api/validate` for the sample vault, and
   print the findings JSON — failing loudly if any step regresses.
3. **Walkthrough doc.** Write `docs/prototype-demo.md`: prerequisites, the build command, the
   CLI run with its output, the daemon run, the browser URL, and a screenshot of the findings
   view; state explicitly what is proven (one binary = CLI + embedded-SPA daemon) and what is
   deferred to [[M-0009-local-web-ui-vault-dashboard]].
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

- Depends on [[T-SPAE-spa-embed]] (the working binary with the embedded UI), which in turn pulls in [[T-DAEM-daemon-and-json-api]], [[T-WEBU-nuxt-spa-ui]], and [[T-BMTX-bun-compile-matrix]]. Governed by [[D-0012-distribution-single-exec-and-web-ui]].
