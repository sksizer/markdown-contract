---
type: task
schema_version: '5'
id: T-7K2D
status: open/ready
created: '2026-06-20'
related:
- '[[C-0001-contract-validation]]'
- '[[C-0002-typed-consumption]]'
- '[[C-0004-dialect-aware-projection]]'
- '[[C-0005-two-plane-contract-engine]]'
- '[[D-0001-finding-model]]'
- '[[D-0002-projection-and-dialect]]'
- '[[D-0005-consumption-oom]]'
depends_on: []
tags:
- types
- foundation
need_human_review: true
impact: high
complexity: medium
autonomy: supervised
---
# Establish the public type surface — every interface the engine, runner, and CLI share

## Goal

Give the whole implementation one source of truth for its public types, so every later
task builds against stable interfaces rather than against each other's in-flight code.
This transcribes the API surface already pinned on the capabilities (`C-0001`..`C-0005`)
and the finding / projection / consumption ADRs into compile-time-only declarations — no
runtime logic. It is the foundation task: nothing else can be typed until it lands.

## Today

The package is a bootstrapped skeleton — barrels and a `VERSION`, no domain types.

| Location | Role today |
|---|---|
| `src/index.ts` | Library entry; exports `VERSION`, a TODO for the real surface |
| `src/core/index.ts` | Empty core barrel |
| `provenance/d0014/proposed-shape.md` | The non-normative API sketch (§2 projection, §3 contract, §4 findings, §6 OOM) the types are transcribed from |

## Proposed

`src/core/types.ts` declares the full public type surface and `src/index.ts` re-exports
it. `npm run typecheck` is green. The module is logic-free: interfaces and type aliases
only (the `ContractError` class and all functions are stubbed later, in `T-4QM9`).

The surface, grouped by owning capability:

- **Projection (`C-0004`)** — `SourcePos`, `DocTree`, `SectionNode`, `BlockNode`, `ListItem`.
- **Finding (`C-0001` / `D-0001`)** — `Finding`, the `level` union, `TextEdit`.
- **Contract & grammar (`C-0005`)** — `Contract`, `Spec`, `SectionSeq`, `LeafSpec`,
  `BlockKind`, `LevelOpts`, `SectionOpts`, `Ctx`, `Rule`, `DocRule`.
- **Consumption (`C-0002` / `D-0005`)** — `Doc`, `Infer`, `SectionView`, `TableView<Row>`,
  `ListView`, `CodeView`, `ParagraphView`, `BlockView`, `SectionGroup`.

## Approach

1. Create `src/core/types.ts`; transcribe the interfaces field-for-field from the
   capability API sections and `proposed-shape.md` §2/§3/§4/§6.
2. Keep it declarations only — no classes, no function bodies, no `zod` runtime imports
   (a `ZodType<T>` reference for typing is fine).
3. Land `Infer<Contract>` as the inference entry point; a partial/placeholder mapping is
   acceptable here and is finalised in `T-6PV4`.
4. Re-export the public types from `src/index.ts`; keep the `src/core/index.ts` barrel
   pointing at them.
5. `npm run typecheck` green.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/core/types.ts` | new | The full public type surface (interfaces + aliases) |
| `src/index.ts` | modify | Re-export the public types alongside `VERSION` |
| `src/core/index.ts` | modify | Barrel the type module |

## Acceptance criteria

- [ ] AC-1: `src/core/types.ts` declares every public type named in the `C-0001`..`C-0005`
  API sections, with no runtime code (interfaces / type aliases only).
- [ ] AC-2: `SourcePos`, `DocTree`, `SectionNode`, `BlockNode`, `ListItem` match
  `proposed-shape.md` §2 field-for-field.
- [ ] AC-3: `Finding` (`id`/`level`/`path`/`pos?`/`message`/`fix?`) and the `level` union
  match `D-0001`.
- [ ] AC-4: The grammar/leaf/`Ctx` types (`Contract`, `Spec`, `LeafSpec`, `LevelOpts`,
  `SectionOpts`, `BlockKind`, `Ctx`, `Rule`, `DocRule`) are declared.
- [ ] AC-5: The consumption views (`Doc`, `SectionView`, `TableView<Row>`, `ListView`,
  `CodeView`, `ParagraphView`, `BlockView`, `SectionGroup`) are declared.
- [ ] AC-6: Public types are re-exported from `src/index.ts`; `npm run typecheck` passes.

## Out of scope

- Any runtime logic, function bodies, or the `ContractError` class — those are stubbed in
  `T-4QM9-framework-skeleton`.
- The deep `Infer<Contract>` type-level inference — a placeholder is fine here; it is
  finalised in `T-6PV4-consumption-object-model`.

## Dependencies

- none — this is the foundation task.
