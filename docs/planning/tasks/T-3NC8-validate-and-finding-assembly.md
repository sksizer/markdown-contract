---
type: task
schema_version: '5'
id: T-3NC8
status: closed/done
created: '2026-06-20'
last_reviewed: '2026-06-21'
completion_note: 'Shipped the one-pass validator — merge, deterministic sort, gate — and the read()/ContractError assembly path. Landed on `main` via #17 + #18; full suite green (275 tests, 0 skipped).'
related:
- '[[C-0001-contract-validation]]'
- '[[C-0005-two-plane-contract-engine]]'
- '[[D-0001-finding-model]]'
depends_on:
- '[[T-8RJ5-structure-plane]]'
- '[[T-5LW7-content-plane]]'
tags:
- validate
- findings
- integration
need_human_review: true
impact: high
complexity: medium
autonomy: supervised
---
# Assemble the one-pass validator — frontmatter + structure + content + rules into one sorted Finding[], with read()/ContractError

## Goal

Wire the planes into `Contract.validate()` / `read()` (`C-0001` / `D-0001`): one pass runs the
frontmatter Zod, the structure grammar, the content leaves, and the named cross-plane rules,
merging everything into a single deterministically-sorted `Finding[]`. The typed model is
present iff there is no error-level finding; `read()` returns it or throws `ContractError`.
This is the keystone that turns two planes into a usable validator.

## Today

The planes exist; nothing assembles them, orders findings, or gates the typed model.

| Location | Role today |
|---|---|
| `src/core/validate.ts` | Plane passes wired in (`T-8RJ5`/`T-5LW7`); no merge/order/gate |
| `src/core/finding.ts` | `Finding` factory + `ContractError` (stub bodies from `T-4QM9`) |
| `src/core/grammar.ts` | `rule` / `docRule` builders (structure pass implemented) |
| `tests/fixtures/` | End-to-end + cross-plane + rule fixtures, skipped |

## Proposed

`src/core/validate.ts` implements `contract().validate(source | tree, ctx)` →
`{ findings, doc?, tree }`: the merge of `frontmatter/*` + `structure/*` + `content/*` +
`rule/*` findings, the deterministic sort (`pos.line`; document-level first; plane order;
stable emission), the `doc`-iff-no-error gate, and `read()` → `doc` or `throw ContractError`.
`src/core/finding.ts` implements the `Ctx` finding factory with id → default-level registration
and the `ContractError`. `rule()` (per-node) and `docRule()` (cross-plane) execute and surface
`rule/*` findings. The end-to-end, cross-plane, and merged-failure fixtures green.

## Approach

1. Implement the `Ctx` finding factory and the id → default-level registry (so a rule body
   just names the problem; the engine fills `path` / `level` / `pos`).
2. Implement the one-pass orchestration: parse once (or accept a pre-parsed `DocTree`), run
   frontmatter Zod, the structure pass, the content pass, then the rules.
3. Implement the deterministic ordering so goldens pin.
4. Implement the `doc`-iff-no-error gate and `read()` / `ContractError`.
5. Execute `rule()` / `docRule()` and merge their `rule/*` findings.
6. Un-skip and green the end-to-end, cross-plane (`docRule`), and merged-failure fixtures.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/core/validate.ts` | modify | One-pass merge, ordering, the `doc` gate, `read()` |
| `src/core/finding.ts` | modify | `Ctx` factory + id→level registry + `ContractError` |
| `tests/fixtures/` | modify | Un-skip the end-to-end / cross-plane / rule fixtures |

## Acceptance criteria

- [x] AC-1: `validate()` runs all planes in one pass and returns `{ findings, doc?, tree }`,
  also accepting a pre-parsed `DocTree`.
- [x] AC-2: `findings` merge `frontmatter` / `structure` / `content` / `rule` and sort
  deterministically (`pos.line`; document-level first; plane order; stable emission) — goldens
  pin.
- [x] AC-3: `doc` is present iff no error-level finding; `read()` returns `doc` or throws
  `ContractError` carrying the error-level findings.
- [x] AC-4: `rule()` (per-node) and `docRule()` (cross-plane) execute and emit `rule/*`
  findings via `Ctx`; the engine fills `path` / `level` / `pos`.
- [x] AC-5: The "both planes fail, merged" and "cross-plane `docRule`" fixtures green.
- [x] AC-6: The end-to-end real-corpus contract fixtures (decision + task) green.

## Out of scope

- The typed consumption model surface (`T-6PV4`) — this task only gates its presence.
- The CLI / corpus runner (`T-J9TZ`).
- Applying `fix` edits (repair is a separate, later pass).

## Dependencies

- Needs both planes: `[[T-8RJ5-structure-plane]]` and `[[T-5LW7-content-plane]]`.
