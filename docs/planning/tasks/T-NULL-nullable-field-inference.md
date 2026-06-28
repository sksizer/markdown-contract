---
type: task
schema_version: '5'
id: T-NULL
status: closed/done
created: '2026-06-27'
last_reviewed: '2026-06-27'
completion_note: 'Fixed a value-ladder bug where a null frontmatter value (parent_key: null across the capability docs) inferred { type: string }, which then rejected null and made the init --meta self-check fail. inferFieldSchema now handles null before the rungs: it infers over the non-null values and marks the result nullable (an all-null field becomes { type: string, nullable: true }), via the DSL nullable wrapper. Landed in its own PR stacked on PR #41; init --meta self-check over docs/planning is clean; peer tests cover all-null and mixed null/non-null; full suite green (474).'
related:
- '[[C-0008-config-scaffolding]]'
- '[[D-0009-config-inference]]'
depends_on: []
tags:
- inference
- init
- bug
- dx
need_human_review: true
impact: medium
complexity: small
autonomy: supervised
---
# Infer a `nullable` schema for `null` frontmatter values — `init --meta` must accept its own corpus

## Goal

`markdown-contract init --meta` must always produce a config that accepts the corpus it was inferred from (D-0009 § Self-check, accept-by-construction). It does not when a frontmatter field carries a `null` value: the value-type ladder (`inferFieldSchema`, `src/declarative/infer.ts`) has no rung that admits `null`, so the field falls to the rung-7 fallback `{ type: string }` — which then **rejects** `null`. Running `init docs/planning --meta` over this repo's own corpus surfaces it as a self-check failure on every capability doc:

```text
self-check: FAILED — the scaffold rejects its own corpus (this is an inferer bug):
  capabilities/C-0001-contract-validation.md — frontmatter/type
    (frontmatter field 'parent_key' must be a string (got null))
  … (all 8 capability docs)
```

`parent_key: null` is valid frontmatter (the key is present, the value is `null`). The inferer must emit a schema that admits it. Detect `null` and emit a **nullable** schema; the declarative DSL already supports the `nullable: true` wrapper (`src/declarative/schema.ts:68`).

## Today

The ladder partitions on the JS type of the observed values, and `null` (`typeof === "object"`) matches no rung, so it silently falls through to the permissive string fallback — which is the one fallback that does **not** admit `null`.

| Location | Role today |
|---|---|
| `src/declarative/infer.ts` · `inferFieldSchema` (≈L376–433) | The value ladder. `isScalar` (L351) excludes `null`; rungs 2–6 test `number`/`boolean`/array/`string`; none match `null`, so an all-null field reaches rung 7 `{ type: string }` (L432) |
| `src/declarative/infer.ts` · `inferFrontmatter` (≈L443–473) | Collects each key's present values (including `null`) and calls `inferFieldSchema`; sets `optional` from present-count, never nullability |
| `src/declarative/schema.ts:68` · `compileSchema` | Already applies `schema.nullable()` when a node carries `nullable: true` — the wrapper the fix emits; no engine change needed |
| `docs/planning/capabilities/C-*.md` | All carry `parent_key: null`, so the inferred capability contract pins `parent_key: { type: string }` and rejects the very docs it was built from |

## Proposed

Handle `null` once, before the rungs, in `inferFieldSchema`: if any observed value is `null`, infer over the **non-null** values and mark the result `nullable`.

- **All values null** → `{ type: string, nullable: true }` — a nullable placeholder the author can retype by hand (there is no `null`-only base type in the v1 DSL, and a nullable string accepts `null`, so accept-by-construction holds).
- **Mixed null + non-null** → infer the base schema over the non-null values (recursively, through the same ladder and the same options bag), then add `nullable: true`. E.g. `{ type: number, int: true, nullable: true }`.

`nullable` composes with the `optional` flag `inferFrontmatter` already adds (key-absent vs value-null are independent; `compileSchema` applies `nullable` then `optional`). The change only ever *loosens* a field relative to today's wrong-but-tight `{ type: string }`, so it cannot reject a current file.

## Approach

1. In `inferFieldSchema` (`src/declarative/infer.ts`), immediately after the empty-values guard, add: if `values.some(v => v === null)`, compute `nonNull = values.filter(v => v !== null)`, set `baseSchema = nonNull.length > 0 ? inferFieldSchema(nonNull, fileCount, opts) : { type: "string" }`, and return `{ ...baseSchema, nullable: true }`.
2. Add peer tests in `src/declarative/infer.test.ts`: an all-null field → `{ type: string, nullable: true }`; a mixed null/number field → `{ type: number, int: true, nullable: true }`.
3. Note the null handling in `docs/planning/decisions/D-0009-config-inference.md` (§ Step 4 value ladder).
4. Verify: `node dist/cli/index.js init docs/planning --meta` reports `self-check: clean`; `npm run typecheck` and `npm test` stay green.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/declarative/infer.ts` | modify | Handle `null` before the rungs: infer over non-null values, return the result `nullable: true` |
| `src/declarative/infer.test.ts` | modify | Peer cases: all-null → nullable string; mixed null/non-null → non-null type, nullable |
| `docs/planning/decisions/D-0009-config-inference.md` | modify | One line in § Step 4 noting `null` → nullable schema |

## Acceptance criteria

- [ ] AC-1: `node dist/cli/index.js init docs/planning --meta` prints `self-check: clean` — no `frontmatter/type` failure on `parent_key`.
- [ ] AC-2: An all-null field infers `{ type: string, nullable: true }`; a field mixing `null` with values of type T infers `{ <T schema>, nullable: true }` — both pinned by peer tests.
- [ ] AC-3: The inferred capability contract types `parent_key` as `{ type: string, nullable: true }` (was `{ type: string }`).
- [ ] AC-4: `npm run typecheck` and `npm test` are green; `node dist/cli/index.js validate docs/planning` still prints `No findings`.

## Out of scope

- **A dedicated `null` base type** (`type: "null"`) — the v1 DSL has no such type; a nullable wrapper over the non-null shape is the accept-by-construction-safe expression and keeps the field useful if a real value is added later.
- **The const string-length cap / min-examples floor** — sibling work `[[T-2CSL-const-string-length-cap]]` and `[[T-3MCE-min-examples-before-const]]`; this fix is stacked on their shared options-bag plumbing but is an independent correctness fix.
- **`--infer-bounds`, content-plane inference** — unchanged (D-0009 § Out of scope).

## Dependencies

- Realizes the accept-by-construction guarantee of `[[D-0009-config-inference]]` (§ Self-check) for null-valued fields; surfaced through `[[C-0008-config-scaffolding]]` (the `init` verb).
- **Stacked on** `[[T-2CSL-const-string-length-cap]]` / `[[T-3MCE-min-examples-before-const]]` (PR #41): the recursive call threads their `FieldInferOptions` bag, so this builds on that branch to avoid a conflict in `inferFieldSchema`. No behavioural dependency — the null fix is orthogonal to the cap/floor.
