---
type: task
schema_version: "5"
id: T-TXFX
status: in-progress
created: 2026-06-28
related:
  - "[[M-0004-declarative-text-constraints]]"
  - "[[D-0011-declarative-text-constraints]]"
  - "[[C-0009-declarative-text-constraints]]"
  - "[[DR-0005-validate-sdlc-corpus]]"
depends_on:
  - "[[T-TXYL-declarative-requires-forbids]]"
tags:
  - text-match
  - fixtures
  - tests
need_human_review: true
impact: medium
complexity: small
autonomy: supervised
readiness_verified_at: 2026-06-30T06:25:26Z
last_reviewed: 2026-06-30
prs:
  - https://github.com/sksizer/markdown-contract/pull/95
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

## Post-mortem

_Captured by /sdlc:task-work on 2026-06-30. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — `node dist/cli/index.js validate docs/planning` (`npm run lint:docs`) reports `No findings`; the new section-scoped `requires` in `contracts/decision.contract.yaml` validates cleanly against all 12 live `D-*.md` decisions.
- AC-2: auto — `tests/components.ts` has `IMPLEMENTED["text-api"]` and `["text-yaml"]` both `true`; the harness census reports `validation: 58 active / 0 skipped / 58 total` (zero skipped `text-*` fixtures — v22–v25 and their yaml-parity peers all run).
- AC-3: auto — `vitest run` is green (561 passed / 0 failed across 29 files) and `validate docs/planning` is clean.
- AC-4: auto — a negative sanity check (temporarily pointing the regex at a marker no References section contains) produced exactly 12 `text/requires/references/...` findings, then reverting returned `No findings` — proving the invariant is genuine and non-vacuous. `git diff` confirms only `contracts/decision.contract.yaml` changed; the SDLC corpus (`docs/planning/**`) and dummy fixtures (`tests/fixtures/**`) are untouched.

### What worked

- The dogfood loop (author the `requires` → `npm run lint:docs` → read findings) made calibrating the regex trivial, and an empirical projection probe up front confirmed `[[wikilink]]` brackets survive projection intact, so the regex matched on the first real run.
- The baseline-gated `quality run` cleanly separated the 4 pre-existing `npm run typecheck` findings from this branch's drift (zero), so the gate gave an unambiguous `OK 2/2` without manual triage.

### Friction and automation gaps

- `sdlc quality run --diff-against-baseline` defaults `--baseline-dir` to the worktree's `.sdlc/quality-baselines/`, but `/sdlc:task-work` Step 3a captures the baseline in the MAIN checkout's `.sdlc/quality-baselines/`; the gate failed `baseline not found` until `--baseline-dir <main-repo>/.sdlc/quality-baselines` was passed explicitly — the gate should resolve the baseline dir against the git common dir (main checkout) when invoked from a worktree, rather than cwd. → [[T-A1SR-quality-gate-resolves-superproject-baseline]]

### Spawned follow-up tasks

- [[T-A1SR-quality-gate-resolves-superproject-baseline]] (https://github.com/sksizer/dev/pull/514) — **linked to existing upstream PR** (Upstream-plugin, `sdlc-meta`). De-duplicated against the already-open `sksizer/dev#514`, which was spawned from [[T-RUNS-validate-run-summary]]'s post-mortem on 2026-06-30 for the identical gap (the worktree quality gate resolving its baseline dir against the main checkout / git common dir). Not re-spawned, to avoid fragmenting the upstream backlog. The complementary task-work-side fix — passing `--baseline-dir` at the Step 7 gate run — is in flight as `sksizer/dev#509` (`task-work-threads-main-baseline-dir`).
