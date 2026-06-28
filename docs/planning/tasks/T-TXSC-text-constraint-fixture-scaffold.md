---
type: task
schema_version: '5'
id: T-TXSC
status: planning/draft
created: '2026-06-28'
related:
- '[[M-0004-declarative-text-constraints]]'
- '[[D-0011-declarative-text-constraints]]'
- '[[C-0009-declarative-text-constraints]]'
- '[[T-9XB3-test-harness-and-fixtures]]'
tags:
- text-match
- fixtures
- tests
- scaffold
need_human_review: true
impact: high
complexity: medium
autonomy: supervised
---
# Text-constraint fixture scaffold + the `text-*` enable gates

## Goal

Author the text-constraint fixtures **first**, gated off, so every implementation task in this milestone has a concrete target to green — the pattern T-9XB3 established for the engine and the `infer-*` pipeline reused. Each gated fixture is skipped (green, not failing) until its component flag flips; an implementation task greens its slice by flipping ITS flag in the same PR that lands the component. This task lands the fixtures, the new `text-*` gates, and the minimal stub the gated TS fixtures type-check against — no behavior.

## Today

The harness already supports gated, grow-as-you-implement fixtures; there is no text-constraint coverage and no `text-*` component.

| Location | Role today |
|---|---|
| `tests/components.ts#IMPLEMENTED` | The `component → bool` gate; a fixture runs only when its flag is `true`, else `describe.skip` (green) |
| `tests/harness.ts` | Runs each fixture under `IMPLEMENTED[fx.component] ? describe : describe.skip`; emits a census (`active / skipped / total`) |
| `tests/fixtures/validation/17-node-level-custom-rule.ts` | The shape to mirror (`.ts` + `.pass.md` + `.fail.md`; a `.contract.yaml` peer added later) |
| `tests/yaml-parity.test.ts` | Auto-pairs each `.ts` fixture with its `.contract.yaml` peer for finding parity |

## Proposed

`tests/components.ts` gains two text-constraint components — `text-api` (the TS builder surface) and `text-yaml` (the declarative surface) — both seeded `false`, mirroring the staged `infer-core → … → infer-cli` pipeline. New validation fixtures (TS `build()` using `requires` / `forbids` / `textRule`, with `.pass.md` / `.fail.md` documents and the expected `text/*` findings) declare `component: "text-api"` and are therefore skipped-green until [[T-TXAP-text-predicate-builders]] flips that flag. So the gated TS fixtures type-check before the builders exist, a minimal stub of the public builders is added (a no-op returning an empty-finding rule), replaced by the real implementation in [[T-TXAP-text-predicate-builders]] over the matcher from [[T-TXMC-text-match-core]]. The `.contract.yaml` parity peers are deliberately **not** added here — they would fail the always-on parity harness before the loader understands `requires` / `forbids`; [[T-TXYL-declarative-requires-forbids]] adds them when it flips `text-yaml`. (The matcher itself, [[T-TXMC-text-match-core]], is covered by its own peer unit test, not a gated corpus fixture — a validate-level fixture needs the builders to exist.)

## Approach

1. Add `text-api` / `text-yaml` to the `Component` union and `IMPLEMENTED` (both `false`) in `tests/components.ts`, with a comment documenting the flip order (`text-api → text-yaml`).
2. Add `src/core/text-constraints.ts` as a **stub**: `requires` / `forbids` / `textRule` with their intended signatures, each returning a rule/docRule that emits no findings; export from `src/core/index.ts` and `src/index.ts` so the gated TS fixtures compile.
3. Author the gated validation fixtures under `tests/fixtures/validation/`: a section-scoped `requires`, a body-root `forbids`, an occurrence `count`, and a `regex` case — each a `.ts` (`component: "text-api"`) with `.pass.md` / `.fail.md` peer documents (verbatim via `loadSource`) and the expected `text/*` findings.
4. Confirm the suite is green with both `text-*` flags `false` (fixtures skip), and the census reports them as skipped.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `tests/components.ts` | modify | Add `text-api` / `text-yaml` to `Component` + `IMPLEMENTED` (both `false`) |
| `src/core/text-constraints.ts` | new | Stub `requires` / `forbids` / `textRule` so gated fixtures type-check (impl in T-TXMC/T-TXAP) |
| `src/core/index.ts` | modify | Re-export the stub builders |
| `src/index.ts` | modify | Re-export `requires` / `forbids` / `textRule` from the public barrel |
| `tests/fixtures/validation/` | new | The gated text-constraint fixtures (`.ts` + `.pass.md` + `.fail.md` + expected findings) |

## Acceptance criteria

- [ ] AC-1: `tests/components.ts` declares `text-api` and `text-yaml`, both `false`, with a documented flip order (`text-api → text-yaml`).
- [ ] AC-2: Validation fixtures exist for a section-scoped `requires`, a body-root `forbids`, an occurrence `count`, and a `regex` case, each declaring `component: "text-api"` and carrying `.pass.md` / `.fail.md` peer documents plus expected `text/*` findings.
- [ ] AC-3: A no-op stub of `requires` / `forbids` / `textRule` is exported from `src/index.ts`, so the gated TS fixtures type-check without the real implementation.
- [ ] AC-4: With every `text-*` flag `false`, the full suite is green and the census reports the new fixtures as skipped (not failing).
- [ ] AC-5: No `.contract.yaml` parity peers for the text fixtures are added here (they arrive with `text-yaml` in T-TXYL); the parity harness stays green.
- [ ] AC-6: The fixtures use dummy data; the SDLC corpus and existing fixtures are untouched.

## Out of scope

- The matcher, finding area, builders, and declarative loader behavior — [[T-TXMC-text-match-core]], [[T-TXAP-text-predicate-builders]], [[T-TXYL-declarative-requires-forbids]] each green their slice.
- The `.contract.yaml` parity peers — added by [[T-TXYL-declarative-requires-forbids]].
- The live dogfood contract and the final census-clean closeout — [[T-TXFX-text-constraint-fixtures]].

## Dependencies

- None. This is the first task in the milestone — the target the implementation tasks green against.
