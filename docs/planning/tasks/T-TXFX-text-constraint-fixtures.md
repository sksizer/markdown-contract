---
type: task
schema_version: '5'
id: T-TXFX
status: open/ready
created: '2026-06-28'
related:
- '[[M-0004-declarative-text-constraints]]'
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
# Text-constraint dogfood + final closeout

## Goal

Seal the milestone: prove the vocabulary on a **live** in-repo document (not just dummy fixtures) and confirm the gated fixture corpus is fully active and green. The dummy-data fixtures and the `text-*` gates are authored up front by [[T-TXSC-text-constraint-fixture-scaffold]] and greened slice-by-slice by the implementation tasks; this task adds the real-document dogfood and the final census check that nothing text-related is left skipped.

## Today

By the time this task runs, the gated text fixtures (TS + `.contract.yaml` peers) are green and both `text-*` flags are `true`; no contract dogfoods the feature on a real document.

| Location | Role today |
|---|---|
| `tests/components.ts#IMPLEMENTED` | `text-api` / `text-yaml` flipped `true` by [[T-TXAP-text-predicate-builders]] / [[T-TXYL-declarative-requires-forbids]] |
| `tests/yaml-parity.test.ts` | Asserts the text fixtures' YAML peers match their TS twins (greened in T-TXYL) |
| `contracts/` | The dogfooded in-repo `*.contract.yaml` set — no `requires` / `forbids` yet |
| `tests/harness.ts` | Emits the census (`active / skipped / total`) per fixture component |

## Proposed

At least one contract under `contracts/` gains a `requires` / `forbids` block exercising a real check against the document(s) it binds, confirming the vocabulary works on live repo content (not only dummy fixtures). A census/closeout assertion confirms no `text-*` fixture remains skipped and the full suite is green. The SDLC corpus is untouched.

## Approach

1. Add a `requires` / `forbids` block to one existing `contracts/*.contract.yaml` (or a small new one) that asserts a real, true invariant of the document(s) it binds; run `markdown-contract validate` to confirm it passes.
2. Confirm both `text-api` and `text-yaml` are `true` and the census reports zero skipped `text-*` fixtures.
3. Run the full suite (`vitest run`) and the docs lint; ensure everything is green.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `contracts/` | modify | Dogfood `requires` / `forbids` on one in-repo contract against a real document |

## Acceptance criteria

- [ ] AC-1: At least one `contracts/*.contract.yaml` carries a working `requires` / `forbids` block (dogfood) that validates cleanly against its target document(s) via `markdown-contract validate`.
- [ ] AC-2: `IMPLEMENTED["text-api"]` and `IMPLEMENTED["text-yaml"]` are both `true`, and the harness census reports zero skipped `text-*` fixtures.
- [ ] AC-3: The full suite (`vitest run`) and `markdown-contract validate docs/planning` are green.
- [ ] AC-4: The dogfood asserts a genuine invariant of a real document; the SDLC corpus and dummy fixtures are untouched.

## Out of scope

- Authoring the dummy fixtures and the `text-*` gates — [[T-TXSC-text-constraint-fixture-scaffold]].
- The matcher, builders, and declarative compiler and their peer unit tests — [[T-TXMC-text-match-core]], [[T-TXAP-text-predicate-builders]], [[T-TXYL-declarative-requires-forbids]].
- Migrating the SDLC plugin's `invariants.yaml` onto contracts — the consumer's work ([[DR-0005-validate-sdlc-corpus]]).

## Dependencies

- Hard: needs the full feature live — `[[T-TXYL-declarative-requires-forbids]]` (and transitively the builders, matcher, and scaffold) — since the dogfood exercises a real `.contract.yaml`.
