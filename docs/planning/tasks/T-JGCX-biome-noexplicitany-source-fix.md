---
type: task
schema_version: '5'
id: T-JGCX
status: in-progress
created: '2026-07-03'
related:
- '[[M-0010 Quality Tooling]]'
- '[[T-0MVN-biome-lint-format]]'
- '[[T-1C0J-remove-stale-eslint-disable-comments]]'
tags:
- quality
- lint
- biome
- tech-debt
need_human_review: false
impact: medium
complexity: medium
readiness_verified_at: '2026-07-04T02:05:46Z'
last_reviewed: '2026-07-04'
---
# Fix noExplicitAny warnings at the source and promote the rule

## Goal

T-0MVN deliberately parked `lint/suspicious/noExplicitAny` at `warn`, leaving
noisy debt surfaced on every lint run. A source analysis (2026-07-03) found the
debt is entirely fixable: **zero `any` exists in shipping source** — all 122
findings are test/fixture code, and ~92 of them are one shape,
`(doc.body as any)` / `(doc as any)`, rooted in the test harness erasing the
type inference the library itself already ships (`Infer<C>` / `BodyOf` in
`core/types.ts`). Fix the harness, sweep the casts, and promote the rule to
`error` with **zero** suppressions — the library's own tests then demonstrate
its typed surface instead of casting around it.

## Today

122 findings (current Biome 2.5.1 count; the `biome.jsonc` comment saying 104
is stale). Split: 0 in production `src`, 49 in `src/core/model.test.ts`, 73 in
the `tests/` consumption corpus. Shape census: `(doc.body as any)` /
`(doc as any)` 92 · `(rows[N] as any)` 9 · `(doc.frontmatter as any)` 4 ·
`(r: any)` callback params 3 · other casts 3.

| Location | Role today |
|---|---|
| `biome.jsonc` | `noExplicitAny` at `warn` with a stale "104 sites" rationale comment. |
| `packages/core/tests/harness.ts` | Root cause: `ModelRead.get` takes bare `Doc` and `ConsumptionFixture.build` returns bare `Contract` (default `unknown` type params), so every fixture read of `doc.body` / `doc.frontmatter` needs a cast. |
| `packages/core/tests/fixtures/consumption/*.ts` | 73 findings across 11 fixtures — `(doc.body as any).sectionName…` reads that the typed `Infer<C>` surface could express. |
| `packages/core/src/core/model.test.ts` | 49 findings + a file-level `eslint-disable` (line 14). Deliberately exercises the *dynamic* dual-key surface, but via `any` instead of the real `SectionGroup` / `TableView` types. |
| `packages/core/src/core/types.ts` | The typed machinery already exists and is proven: `Infer<C>` / `BodyOf` give exact-heading-name body keys and `TableView<Row>` promotion (type-level proof in `model.test.ts` AC-2/AC-3 cases). |

## Proposed

`bunx biome lint --only=suspicious/noExplicitAny .` reports **0** findings, the
rule is `error` in `biome.jsonc`, and no `biome-ignore` for it exists anywhere.
The consumption harness is generic (`ConsumptionFixture<F, B>` flowing
`Contract<F, B>` → `Doc<F, B>`), so fixtures read typed body/frontmatter keys
directly; dynamic-surface reads (camelCase aliases, unknown partitions) go
through small honest narrowing helpers (`group()` returning the exported
`SectionGroup`, `asTable()` / `asSection()`) instead of `any`.

## Approach

1. **Genericize the harness.** In `packages/core/tests/harness.ts` make
   `ConsumptionFixture<F, B>` carry `build: () => Contract<F, B>` and
   `get: (doc: Doc<F, B>) => unknown`; add a `defineConsumptionFixture(...)`
   identity helper so `F`/`B` infer from `build` with no annotation at the
   fixture site.
2. **Add narrowing helpers** (in `harness.ts` or a small
   `packages/core/tests/expect.ts` shared with [[T-FOCX-biome-nononnull-source-fix]]):
   `group(body): SectionGroup`, `asTable()`, `asSection()` — the camelCase
   alias surface is dynamic by design (exact heading names only in `BodyEntry`
   keys), so this cast-once helper is the honest boundary, not a workaround.
3. **Sweep the 11 consumption fixtures** — exact-name reads become typed
   property access; alias/dynamic reads use the helpers; `find((r: any) =>`
   callbacks become typed `Row` params via `TableView<Row>`.
4. **Sweep `model.test.ts`** — `c.read()` already returns typed `Doc<F, B>`;
   dual-key/unknown-partition assertions use the same helpers (the pattern
   already exists: `blockOf()` in `projection.test.ts`). Delete the file-level
   `eslint-disable` (coordinate with [[T-1C0J-remove-stale-eslint-disable-comments]] —
   this sweep removes many of its line-level targets too; whichever lands
   second re-runs the grep).
5. **Promote the rule.** `noExplicitAny: "error"` in `biome.jsonc`; rewrite the
   stale rationale comment (it also covers `noNonNullAssertion` — touch only
   the `any` half if [[T-FOCX-biome-nononnull-source-fix]] hasn't landed).
6. **Verify:** `bunx moon run core:lint core:typecheck core:test` all green;
   `bunx biome lint --only=suspicious/noExplicitAny .` reports 0.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `packages/core/tests/harness.ts` | modify | Genericize `ConsumptionFixture` / `ModelRead` over `<F, B>`; add `defineConsumptionFixture` + narrowing helpers. |
| `packages/core/tests/fixtures/consumption/*.ts` | modify | Replace the 73 `as any` reads with typed access / helpers (11 files). |
| `packages/core/src/core/model.test.ts` | modify | Replace the 49 `as any` reads with typed access / helpers; drop the file-level eslint-disable. |
| `biome.jsonc` | modify | Promote `noExplicitAny` to `error`; refresh the stale count comment. |

## Acceptance criteria

- [ ] AC-1: `bunx biome lint --only=suspicious/noExplicitAny .` reports 0 findings on a clean checkout.
- [ ] AC-2: `noExplicitAny` is `error` in `biome.jsonc`, and `grep -rn "biome-ignore lint/suspicious/noExplicitAny" packages/core apps sites` returns nothing — zero suppressions.
- [ ] AC-3: `bunx moon run core:typecheck` and `bunx moon run core:test` stay green — the sweep is behavior-preserving (assertion values unchanged, only their typing).
- [ ] AC-4: Consumption fixtures no longer annotate `F`/`B` by hand — the types flow from each fixture's `build` via the harness generics.

## Out of scope

- Type-level camelCase alias inference in the library itself (template-literal
  camelization of heading names can't faithfully mirror the Unicode-aware
  runtime rule in `core/camel.ts`) — the `group()` helper is the deliberate
  boundary.
- The `noNonNullAssertion` debt — [[T-FOCX-biome-nononnull-source-fix]].
- Deleting stale `eslint-disable` comments beyond `model.test.ts`'s file-level
  one — [[T-1C0J-remove-stale-eslint-disable-comments]] owns the sweep.

## Dependencies

- none blocking. **Soft coordination:** overlaps [[T-1C0J-remove-stale-eslint-disable-comments]]
  (same fixture files) and shares the `tests/expect.ts` helper home with
  [[T-FOCX-biome-nononnull-source-fix]] — sequence rather than parallelize
  those two against this one.

## Discovery context

Requested during the M-0010 close-out review (2026-07-03): "we shouldn't have
noExplicitAny ideally — assess whether we can fix at the source." The source
analysis found production code already clean and the whole warning load rooted
in the untyped test harness, making promote-to-error a realistic single task.

## Post-mortem

_Captured by /sdlc:task-work on 2026-07-04. PR: pending._

### Acceptance criteria coverage

- AC-1: auto — `bunx biome lint --only=suspicious/noExplicitAny .` from the worktree root reports 0 findings (checked 338 files, no findings line emitted).
- AC-2: auto — `noExplicitAny` is `"error"` in `biome.jsonc`; `grep -rn "biome-ignore lint/suspicious/noExplicitAny" packages/core apps sites` returns nothing (grep exit 1). Required removing one out-of-scope suppression in `apps/daemon-web-prototype/.storybook/main.ts` to keep the grep clean.
- AC-3: auto — `bunx moon run core:typecheck` green; `bunx moon run core:test` 686 passed / 1 pre-existing skip. Behavior-preserving (assertion values unchanged).
- AC-4: auto — `grep` finds zero hand `ConsumptionFixture<…>` annotations in the 11 (now 15) consumption fixtures; all 15 use `defineConsumptionFixture`, so `F`/`B` flow from each `build`.

### What worked

- The library already shipped the typed surface (`Infer<C>` / `BodyOf` / `TableView<Row>` / `SectionGroup`) — genericizing the harness was the whole fix; the fixtures then read typed keys directly with no library change.
- The baseline-gated quality gate (`--diff-against-baseline`) reported OK 5/5 cleanly; zero pre-existing drift at the baseline SHA meant no noise to subtract.
- The existing `blockOf()` helper in `projection.test.ts` was a ready-made model for the `group()`/`asTable()`/`asSection()` narrowing boundary.

### Friction and automation gaps

- The `--line`/`--json` quality-gate mode spuriously FAILed on output volume: its `spawnSync(..., {encoding:"utf-8"})` default 1 MB `maxBuffer` SIGTERM-kills a verb whose captured stdout exceeds 1 MB (biome's verbose code-frames for 59 `useLiteralKeys` infos hit 1.12 MB), while `--log` mode (stdio inherit) is immune — the wrapper should raise `maxBuffer` (or stream) so a chatty-but-passing verb isn't misreported as failing.
- AC-2's grep scope (`apps`, `sites`) reached beyond the task's stated `## Files to touch`, surfacing a real out-of-scope suppression in a Storybook config the task assumed absent — task specs whose ACs grep a wider scope than their Files-to-touch table should reconcile the two, or note the wider scope explicitly.
- The list-item transform surface (fixture c13) isn't on the typed model yet (`SectionValue` only promotes tables, not lists), so it needed a local typed-cast boundary rather than a shared helper — a follow-up could extend `TableView`-style promotion to typed list items.
