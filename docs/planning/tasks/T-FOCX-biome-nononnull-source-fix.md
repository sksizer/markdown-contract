---
type: task
schema_version: "5"
id: T-FOCX
status: in-progress
created: 2026-07-03
related:
  - "[[M-0010 Quality Tooling]]"
  - "[[T-0MVN-biome-lint-format]]"
  - "[[T-JGCX-biome-noexplicitany-source-fix]]"
tags:
  - quality
  - lint
  - biome
  - tech-debt
need_human_review: false
impact: medium
complexity: medium
readiness_verified_at: 2026-07-04T02:06:16Z
last_reviewed: 2026-07-04
prs:
  - https://github.com/sksizer/markdown-contract/pull/214
---
# Fix noNonNullAssertion warnings with real narrowing and promote the rule

## Goal

T-0MVN parked `lint/style/noNonNullAssertion` at `warn`, leaving 198 findings
surfaced on every lint run. A source analysis (2026-07-03) found the debt
tractable: only **31 findings are production code** (7 files, each falling
into a known mechanical sub-pattern — `Map.get()!` after guaranteed populate,
length-guarded `arr[0]!`, cursor loops, parallel arrays); the other 167 are
tests/fixtures, where two shared helpers collapse the bulk. Replace the `!`
assertions with real narrowing (guards, restructures, assertion helpers) and
promote the rule to `error`, so `strict` + `noUncheckedIndexedAccess` — the
root driver of these assertions — is honored rather than overridden.

## Today

198 findings (current Biome 2.5.1 count; the `biome.jsonc` comment saying 185
is stale). Split: 31 production `src` · 145 co-located unit tests · 20 under
`tests/` · 2 in `apps/`. Shape census: indexed access `arr[i]!` 110 ·
optional-property `x.prop!` ~28 · call-result `fn(...)!` 17.

| Location | Role today |
|---|---|
| `biome.jsonc` | `noNonNullAssertion` at `warn` with a stale "185 sites" rationale comment. |
| `packages/core/src/declarative/infer.ts` | 11 findings: `Map.get()!` after populate (518/530/596/769), length-guarded `docs[0]!` (240/292). The get-or-create idiom to copy already exists in its own `precedence()` (~254). |
| `packages/core/src/core/structure.ts` | 8 findings in the section-grammar matcher: cursor-loop indexes (289/312), valid-slot indexes (152/219), `findIndex`-then-index (380/410), `find()!` (328). |
| `packages/core/src/cli/run.ts` | 3 findings: parallel-array indexing in `forEach` (484/598), length-guarded `contracts[0]!` (581). |
| `packages/core/src/core/camel.ts` | 3 findings: `word[0]!` first-char access — `.charAt(0)` eliminates them outright. |
| `packages/core/src/core/text-constraints.ts` | 3 findings: while-push-filled `this.lines[idx]!`, `parts[i]!`. |
| `packages/core/src/declarative/body.ts` | 2 findings: `Object.keys(node)[0]!` after single-key check. |
| `packages/core/src/runner/corpus.ts` | 1 finding: `rules[idx]!` — carry the rule object instead of the index. |
| `packages/core/src/declarative/infer.test.ts` | 78 findings — `contracts[0]!` + `.body!`/`.fields!` chains; its existing `def()` shim (line ~27) is the upgrade point. |
| `packages/core/src/core/projection.test.ts` | 42 findings — `sections[0]!`-style binding after known-shape parses. |
| `packages/core/tests/fixtures/infer/*/fixture.ts` | 18 findings across 11 files — a copy-pasted `byName(...)` returning `undefined`, asserted with `!` at every call site. |
| `packages/core/tests/harness.ts` | 1 finding: `fx.assert!` inside `if (fx.assert)` — closure narrowing loss. |
| `apps/daemon-web-prototype/components/VaultForm.vue` | 1 finding: `registry.value.find(...)!`. |
| `apps/daemon-web-prototype/mocks/api-fixtures.ts` | 1 finding: `findingsVaultStatus.result!`. |

## Proposed

`bunx biome lint --only=style/noNonNullAssertion .` reports **0** findings and
the rule is `error` in `biome.jsonc`. Production code uses explicit guards /
restructures (behavior-preserving); tests use a shared
`packages/core/tests/expect.ts` (`expectDefined<T>(v): asserts v is
NonNullable<T>`, `first(arr)`, a throwing `byName`) plus an upgraded `def()`
in `infer.test.ts`. At most a handful of loop-invariant sites in
`structure.ts` may instead carry a targeted
`// biome-ignore lint/style/noNonNullAssertion: <invariant>` with a one-line
rationale — that residual is the only tolerated exception.

## Approach

1. **Production first (31 sites, the careful part).** Per sub-pattern:
   `Map.get()!` → get-or-create local or a `mustGet` invariant helper;
   length-guarded `docs[0]!` → `const [first] = docs; if (!first) return`;
   cursor loops in `structure.ts` → bind + `if (!x) break` (honest narrowing
   of a loop-invariant); `findIndex`-then-index → iterate `entries()` or
   guard-throw; `run.ts` parallel arrays → zip via `entries()`; `camel.ts` →
   `.charAt(0)`; `body.ts` → bind `Object.keys(node)` once and guard;
   `corpus.ts` → carry the rule object. Run `bunx moon run core:test` after
   each file — `structure.ts` is the grammar matcher, lean on its peer tests.
2. **Add `packages/core/tests/expect.ts`** with `expectDefined`, `first`, and
   a throwing `byName`; keep the domain-specific `_assert.ts` (infer fixtures'
   typed views) as-is. Note `expect(x).toBeDefined()` does NOT narrow — the
   helper needs an assertion signature.
3. **Upgrade `def()` in `infer.test.ts`** to take the whole `InferResult`,
   assert exactly one contract, and return a required-shape view — collapsing
   the `contracts[0]!` + `.body!` / `.frontmatter!` chains (~50 of its 78).
4. **Mechanical test sweep.** In `expect(...)`-argument position (61 sites)
   rewrite `arr[0]!.x` → `arr[0]?.x` (a failed case still fails cleanly on
   `undefined`); in binding position (59 sites) use `expectDefined` / `first`.
   Hoist the per-fixture `byName` copies to the shared throwing one; fix the
   `harness.ts` closure narrowing by binding `const assert = fx.assert` before
   the `test()` callback.
5. **Apps (2 sites):** guard + early return in `VaultForm.vue`; explicit throw
   or guard in `api-fixtures.ts`.
6. **Promote the rule** to `error` in `biome.jsonc`; refresh the stale count
   comment (shared with [[T-JGCX-biome-noexplicitany-source-fix]] — whichever
   lands second reconciles it). Any surviving `structure.ts` invariant gets a
   rationale'd targeted ignore, listed in the PR description.
7. **Verify:** `bunx moon run core:lint core:typecheck core:test` green;
   `bunx biome lint --only=style/noNonNullAssertion .` reports 0.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `packages/core/src/declarative/infer.ts` | modify | Replace 11 `!` sites (get-or-create, destructure-guard). |
| `packages/core/src/core/structure.ts` | modify | Replace 8 `!` sites (bind + guard in the matcher loops); any residual gets a rationale'd ignore. |
| `packages/core/src/cli/run.ts` | modify | Replace 3 `!` sites (entries()/destructure). |
| `packages/core/src/core/camel.ts` | modify | Replace 3 `!` sites with `.charAt(0)`. |
| `packages/core/src/core/text-constraints.ts` | modify | Replace 3 `!` sites (`?? ""`, `entries()`). |
| `packages/core/src/declarative/body.ts` | modify | Replace 2 `!` sites (bind keys once, guard). |
| `packages/core/src/runner/corpus.ts` | modify | Replace 1 `!` site (carry the object, not the index). |
| `packages/core/tests/expect.ts` | new | Shared `expectDefined` / `first` / throwing `byName` assertion helpers. |
| `packages/core/src/declarative/infer.test.ts` | modify | Upgrade `def()`; sweep 78 sites. |
| `packages/core/src/core/projection.test.ts` | modify | Sweep 42 sites (optional chaining / helpers). |
| `packages/core/src/**/*.test.ts` | modify | Sweep the remaining peer-test sites (text-constraints 9, content 7, text-match 4, navigate 3, camel 3, table-source 2). |
| `packages/core/tests/fixtures/infer/*/fixture.ts` | modify | Drop per-file `byName` copies; use the shared throwing one (18 sites, 11 files). |
| `packages/core/tests/harness.ts` | modify | Fix the `fx.assert!` closure-narrowing loss. |
| `packages/core/tests/inference.cli.test.ts` | modify | `contractFile!` → `expectDefined`. |
| `apps/daemon-web-prototype/components/VaultForm.vue` | modify | Guard the `find(...)!`. |
| `apps/daemon-web-prototype/mocks/api-fixtures.ts` | modify | Guard/throw instead of `.result!`. |
| `biome.jsonc` | modify | Promote `noNonNullAssertion` to `error`; refresh the stale count comment. |

## Acceptance criteria

- [ ] AC-1: `bunx biome lint --only=style/noNonNullAssertion .` reports 0 findings on a clean checkout.
- [ ] AC-2: `noNonNullAssertion` is `error` in `biome.jsonc`; any targeted `biome-ignore` for it exists only in `packages/core/src/core/structure.ts`, carries a one-line invariant rationale, and the total is ≤ 4 (each listed in the PR description).
- [ ] AC-3: `bunx moon run core:typecheck` and `bunx moon run core:test` stay green — all production rewrites are behavior-preserving.
- [ ] AC-4: The per-fixture `byName` copies under `packages/core/tests/fixtures/infer/` are gone — one shared throwing helper remains.

## Out of scope

- The `noExplicitAny` debt — [[T-JGCX-biome-noexplicitany-source-fix]].
- Loosening `noUncheckedIndexedAccess` or any tsconfig change — the fixes work
  *with* the strict config, not around it.
- Refactoring for cognitive complexity in the same functions —
  [[T-D8TE-ratchet-biome-complexity-ceiling]] (same files; coordinate, don't merge scopes).

## Dependencies

- none blocking. **Soft coordination:** [[T-D8TE-ratchet-biome-complexity-ceiling]]
  and [[T-JGCX-biome-noexplicitany-source-fix]] touch overlapping files
  (`infer.ts`, `structure.ts`, `run.ts`; `harness.ts` / `tests/expect.ts`) —
  sequence these three rather than running them in parallel worktrees.
  If a cheap early ratchet is wanted before this task runs, a Biome
  `overrides` block can set the rule to `error` for non-test paths at the cost
  of only the 31 production fixes — noted as an option, not a step.

## Discovery context

Requested during the M-0010 close-out review (2026-07-03): "we shouldn't have
noNonNullAssertion ideally — assess whether we can fix at the source." The
source analysis found every cluster mechanically fixable under the existing
strict TS config, with at most a few rationale'd invariants in the
`structure.ts` matcher as honest residual.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-04. PR: pending._

### Acceptance criteria coverage

_TBD — filled at Step 8._

### What worked

_TBD — filled at Step 8._

### Friction and automation gaps

_TBD — filled at Step 8._
