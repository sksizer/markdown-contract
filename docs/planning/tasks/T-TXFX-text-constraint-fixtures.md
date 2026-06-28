---
type: task
schema_version: '5'
id: T-TXFX
status: open/ready
created: '2026-06-28'
related:
- '[[M-0003-declarative-text-constraints]]'
- '[[D-0011-declarative-text-constraints]]'
- '[[C-0009-declarative-text-constraints]]'
- '[[DR-0005-validate-sdlc-corpus]]'
depends_on:
- '[[T-TXYL-declarative-requires-forbids]]'
tags:
- text-match
- fixtures
- tests
need_human_review: true
impact: medium
complexity: small
autonomy: supervised
---
# Text-constraint fixture corpus + dogfood

## Goal

Prove the feature end-to-end and lock it against regression: a fixture-corpus case showing a YAML `requires` / `forbids` contract and its TS-authored equivalent produce identical findings, plus at least one in-repo `*.contract.yaml` that dogfoods the vocabulary. The per-module peer unit tests are owned by the implementation tasks; this task owns the assembled-pipeline proof under `tests/`.

## Today

The fixture corpus and the YAML/TS parity harness exist but cover no text constraint.

| Location | Role today |
|---|---|
| `tests/yaml-parity.test.ts` | Asserts every TS fixture has a `.contract.yaml` peer yielding identical findings |
| `tests/harness.ts` | `loadSource(import.meta.url, "./x.md")` — verbatim fixture-document loader |
| `tests/fixtures/validation/17-node-level-custom-rule.ts` | The model case (`.ts` + `.contract.yaml` + `.pass.md` + `.fail.md`) |
| `contracts/` | The dogfooded in-repo `*.contract.yaml` set |

## Proposed

A new validation fixture (e.g. `tests/fixtures/validation/NN-text-constraints.*`) carries a TS contract using `requires` / `forbids` / `textRule`, its `.contract.yaml` peer, and pass/fail `.md` documents — so the parity harness asserts the YAML and TS surfaces emit the same `text/*` findings (id, level, line). At least one contract under `contracts/` gains a `requires` / `forbids` block exercising a real check, confirming the vocabulary works on live documents. Fixtures use dummy data; the SDLC corpus is untouched.

## Approach

1. Author `NN-text-constraints.ts` (section `requires`, body-root `forbids`, a count, a `regex`) plus its `.contract.yaml` peer and `.pass.md` / `.fail.md` documents, following the fixture-17 shape and the peer-`.md` rule (verbatim bytes via `loadSource`).
2. Confirm `tests/yaml-parity.test.ts` picks up the new pair and asserts identical findings; add a focused parity assertion if the harness needs an explicit entry.
3. Add a `requires` / `forbids` block to one existing `contracts/*.contract.yaml` (or a small new one) to dogfood the feature against a real document.
4. Run the full suite; ensure vitest discovers the new fixtures and everything is green.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `tests/fixtures/validation/` | modify | New `NN-text-constraints` fixture set (`.ts` + `.contract.yaml` + `.pass.md` + `.fail.md`) |
| `tests/yaml-parity.test.ts` | modify | Ensure the new TS/YAML pair is exercised for finding parity |
| `contracts/` | modify | Dogfood `requires` / `forbids` on one in-repo contract |

## Acceptance criteria

- [ ] AC-1: A validation fixture exists with a TS contract using `requires` / `forbids` / `textRule`, a `.contract.yaml` peer, and `.pass.md` / `.fail.md` documents authored as peer `.md` files (verbatim bytes).
- [ ] AC-2: `tests/yaml-parity.test.ts` asserts the YAML and TS forms emit identical `text/*` findings (id, level, line) on the shared documents.
- [ ] AC-3: The fail document yields the expected `text/requires` / `text/forbids` / `text/count` findings at the expected lines; the pass document yields none.
- [ ] AC-4: At least one `contracts/*.contract.yaml` carries a working `requires` / `forbids` block (dogfood), validating cleanly against its target document(s).
- [ ] AC-5: `vitest` discovers the new fixtures (`tests/**/*.test.ts`) and the full suite is green; all fixtures use dummy data.

## Out of scope

- The matcher, builders, and declarative compiler and their peer unit tests — [[T-TXMC-text-match-core]], [[T-TXAP-text-predicate-builders]], [[T-TXYL-declarative-requires-forbids]].
- Migrating the SDLC plugin's `invariants.yaml` onto contracts — the consumer's work ([[DR-0005-validate-sdlc-corpus]]).

## Dependencies

- Hard: needs the declarative surface from `[[T-TXYL-declarative-requires-forbids]]` (and transitively the builders and core). Parity requires both the TS and YAML surfaces to exist.
