---
type: task
schema_version: '5'
id: T-SCFX
status: open/ready
created: '2026-06-30'
related:
- '[[M-0011-structured-cells]]'
- '[[D-0015-structured-cells]]'
depends_on: []
tags:
- structured-cells
- fixtures
- consumption
- typed-model
need_human_review: false
impact: medium
complexity: medium
autonomy: supervised
last_reviewed: '2026-06-30'
---
# Scaffold the structured-cells fixtures and enable gates (`cell-typed` / `list-typed` / `cell-pos`)

## Goal

Stand up the gated fixture corpus and the public typed-surface stubs for structured cells **before** any engine change, so every implementation task in [[M-0011-structured-cells]] has a concrete, skipped-green target to flip on. Mirrors the `T-TXSC` / `infer-*` pattern: author the fixtures up front, gate them off in `IMPLEMENTED`, and green slice-by-slice as each component lands.

## Today

> Path note (2026-07-02 relevance check): the core library relocated into the
> `packages/core/` workspace since this task was written. Every `tests/…` and
> `src/…` path below is now under `packages/core/`. Quality/typecheck runs via
> moon (`bunx moon run core:typecheck`), not `npm run typecheck`.

| Location | Role today |
|---|---|
| `packages/core/tests/components.ts#IMPLEMENTED` | The greening switch — one boolean per pipeline component. Has no structured-cells gates. |
| `packages/core/tests/fixtures/consumption/` | Consumption fixtures (`<n>-<name>.md` + `.ts` + `.contract.yaml`); all string-typed rows today. |
| `packages/core/src/core/types.ts#TableView` | `TableView<Row = Record<string, string>>` — the `Row` slot already exists (defaults to `Record<string, string>`); no typed-row wiring feeds it. |
| `packages/core/src/core/leaves.ts#table` | `table()` takes `cells?: Record<string, ZodType>` but carries no literal types out. |
| `packages/core/tests/harness.ts` | Fixture loader; skips a fixture when its `IMPLEMENTED[component]` is `false`. |

## Proposed

Add three gate components — `cell-typed`, `list-typed`, `cell-pos` — to the `Component` union and the `IMPLEMENTED` map in `packages/core/tests/components.ts`, all seeded `false` (skipped-green). Author the fixtures each gate guards: typed table-row read-back (a `Location`-transform contract read back as `{ path, symbol? }`), typed list-item read-back, and position preservation (per-cell `col` + inline-code spans). Stub the typed public surface (`table()` generic over its `cells`, a `TableView<Row>` that can carry `z.output<cells>`) with placeholder bodies so the fixtures type-check while the gates are off. No engine behavior changes; the suite stays green by skipping.

## Approach

1. Add `"cell-typed" | "list-typed" | "cell-pos"` to the `Component` union in `packages/core/tests/components.ts`, add the three keys to `IMPLEMENTED` seeded `false`, and extend the header comment with the structured-cells flip order (`cell-typed` after capture+read-back; `list-typed` after the list slice; `cell-pos` after position preservation).
2. Author typed table-row fixtures under `packages/core/tests/fixtures/consumption/` (a `Location | Kind | Change` contract whose `Location` cell transforms to `{ path, symbol? }`), tagged to the `cell-typed` gate — the `.md` input, the `.ts` expectation asserting typed `row.Location.path`, and the parity `.contract.yaml` where applicable.
3. Author typed list-item fixtures (a `list({ everyItem })` whose items transform) tagged to `list-typed`, and position-preservation fixtures (asserting `cellPos(row, col).col` and `inlineSpans(...)` ranges) tagged to `cell-pos`.
4. Add a backward-compat fixture asserting a contract with **no** transforming cells yields byte-identical rows + findings (guards the "no golden moves" criterion).
5. Stub the typed surface so fixtures compile with gates off: make `table()` generic over its `cells` map so its return type can carry `z.output<cells>`. `TableView<Row>` already exposes a `Row` slot defaulting to `Record<string, string>`, so no type change is needed there beyond confirming the fixtures can name a typed `Row` (placeholder runtime; real wiring lands in `T-SCRB`).
6. Run the suite; confirm the new fixtures are **skipped** (not failing) and the existing suite is unchanged.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `packages/core/tests/components.ts` | modify | Add `cell-typed` / `list-typed` / `cell-pos` to `Component` + `IMPLEMENTED` (seeded `false`); extend the flip-order comment |
| `packages/core/tests/fixtures/consumption/` | new | Typed-row, typed-item, and position-preservation fixtures (`.md` + `.ts` + `.contract.yaml`), each tagged to its gate |
| `packages/core/src/core/types.ts` | modify | Confirm/extend the `TableView<Row>` typed-row slot (default stays `Record<string, string>`) so fixtures type-check; the `Row` slot already exists |
| `packages/core/src/core/leaves.ts` | modify | Make `table()` generic over its `cells` map (stub passthrough; real inference in `T-SCRB`) |
| `packages/core/tests/FIXTURES.md` | modify | Document the three new gate components and the fixtures they guard |

## Acceptance criteria

- [ ] AC-1: `packages/core/tests/components.ts` exports `cell-typed`, `list-typed`, and `cell-pos` as `Component` members, present in `IMPLEMENTED` seeded `false`.
- [ ] AC-2: The structured-cells fixtures exist and are **skipped** (green, not failing) with all three gates `false`; running the suite reports them skipped.
- [ ] AC-3: At least one fixture asserts typed table-row read-back, one asserts typed list items, one asserts `cellPos(...).col` + `inlineSpans(...)`, and one asserts byte-identical behavior for a no-transform contract.
- [ ] AC-4: The repo type-checks (`bunx moon run core:typecheck`) with the stubbed typed surface and the gates off.
- [ ] AC-5: The existing (non-structured-cells) fixtures and their goldens are unchanged — no pre-existing fixture flips state.

## Out of scope

- Any real transform-capture, read-back, or position-preservation behavior — those land in `T-SCTC` / `T-SCRB` / `T-SCLI` / `T-SCPP`, each flipping its gate.
- Paragraph fixtures — the paragraph generalization is design-only ([[T-SCPA-paragraph-transform-adr]]).

## Dependencies

- None. This is the first task of the milestone; it establishes the targets the rest green.
