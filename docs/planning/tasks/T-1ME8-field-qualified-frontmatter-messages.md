---
type: task
schema_version: '5'
id: T-1ME8
status: closed/done
created: '2026-06-24'
last_reviewed: '2026-06-25'
completion_note: 'Built the field-qualified frontmatter message builder in matchFrontmatter — every frontmatter/* finding now leads with the offending key (a removed id reads "frontmatter field ‘id’ is required" instead of "received undefined"), across required / const / enum / wrong-type / pattern / nested-path. One change lifts human / json / sarif alike. Carried by PR #34; full suite green (399), typecheck + dogfood clean.'
related:
- '[[C-0001-contract-validation]]'
- '[[D-0001-finding-model]]'
depends_on:
- '[[T-3NC8-validate-and-finding-assembly]]'
tags:
- findings
- diagnostics
- frontmatter
- dx
need_human_review: true
impact: medium
complexity: small
autonomy: supervised
---
# Field-qualified frontmatter finding messages — name the offending key (and its expected value) in every `frontmatter/*` message

## Goal

A consumer who breaks their frontmatter should be told **which field** is wrong. Today the frontmatter plane forwards Zod's generic message verbatim, so `frontmatter/required` and `frontmatter/enum` findings never name the offending key. Build each `frontmatter/*` finding message from the *structured* Zod issue inside `matchFrontmatter` — always leading with the key (`issue.path`) and, where the schema fixes a value, the expected `const`/`enum` — instead of passing `issue.message` through. This is the one general fix the symptom points at: `message` is the single field every formatter renders (`formatHuman`, `formatJson`, `formatSarif`), so one change in one place improves all three output formats at once.

## Today

The frontmatter plane drops the field name it already has in hand. `matchFrontmatter` computes `issue.path` only to look up a source line (`lineForPath`), then forwards Zod's message — which names a type or a literal but never the key it belongs to.

| Location | Role today |
|---|---|
| `src/core/content.ts` · `matchFrontmatter` (≈L407–449) | Builds frontmatter findings; forwards `issue.message ?? …`, dropping the field name |
| `src/core/content.ts` · `ZodIssue` (L41–47) | Narrowed to `path` / `code` / `message` / `keys` — no `expected` / `values` / `received` |
| `src/core/content.ts` · `frontmatterIdFor` (L380–396) | Maps the Zod `code` to the id; `invalid_type` (incl. pattern / format / min / max) → `frontmatter/type` |
| `src/cli/format.ts` (L38, L109) | Renders `f.message` verbatim into the human line and SARIF `message.text`; JSON serializes it as-is |

Observed (delete a field from `docs/planning/capabilities/C-0001-contract-validation.md`, run the CLI):

- remove `type` (`{ const: capability }`) → `… error frontmatter/enum — Invalid input: expected "capability"` — no hint the const belongs to the **`type`** field.
- remove `id` (`{ type: string, pattern: … }`) → `… error frontmatter/required — Invalid input: expected string, received undefined` — **no field name at all** (the largest gap).

## Proposed

A small pure helper `frontmatterMessage(issue, id)` in `content.ts` formats a field-qualified message from the structured issue, always leading with the key; `matchFrontmatter` calls it in place of `issue.message ?? …` at L444. The `ZodIssue` interface widens to carry the fields the helper reads (`expected?`, `received?`, `values?` / `options?`). The existing `frontmatter/unknown-key` branch already names its key (``unknown frontmatter key ‘…’``, L426) — it is the style model and stays untouched.

Target messages (curly-quote style matching the existing `‘…’` at L426):

| id | message |
|---|---|
| `frontmatter/required` | ``frontmatter field ‘id’ is required`` |
| `frontmatter/enum` (const) | ``frontmatter field ‘type’ must be ‘capability’`` |
| `frontmatter/enum` (multi-value enum) | ``frontmatter field ‘status’ must be one of ‘open’, ‘closed’`` |
| `frontmatter/type` (wrong type) | ``frontmatter field ‘created’ must be a string (got number)`` |
| `frontmatter/type` (pattern / format) | ``frontmatter field ‘id’ does not match the required format`` / ``… is not a valid date`` |
| `frontmatter/refine` (cross-field) | keep the refine's own message; prefix the field when `issue.path` is non-empty, else emit the document-level message unchanged |

Nested paths render readably: `issue.path` → `a.b` for keys, `related[0]` for array indices.

## Approach

1. Widen the `ZodIssue` interface (L41–47) with the optional fields the builder reads (`expected`, `received`, `values` / `options`).
2. Add `frontmatterMessage(issue, id)` (pure) formatting per the table above, plus a small `formatKeyPath(path)` for the `a.b` / `related[0]` rendering.
3. Replace the `message:` at L444 with the helper; leave the unknown-key branch (L420–431), the id mapping, `pos`, and ordering untouched.
4. Peer-test in `src/core/content.test.ts`: pin the exact message for required, const-enum, multi-value enum, wrong-type, pattern, and a nested-path case — lead with the two reported cases as the documentary happy-path (per the repo's "tests express the contract" convention).
5. Re-run the dogfood corpus (`markdown-contract.yaml`) and the full suite; confirm no golden churn beyond the intended message changes.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/core/content.ts` | modify | Widen `ZodIssue`; add `frontmatterMessage` + `formatKeyPath`; call from `matchFrontmatter` |
| `src/core/content.test.ts` | modify | Pin exact field-qualified messages (the two reported cases lead) |

## Acceptance criteria

- [x] AC-1: Every `frontmatter/*` finding message names the offending key (`issue.path`), rendered readably for nested / array paths.
- [x] AC-2: A missing required key reads ``frontmatter field ‘id’ is required`` — no raw `expected string, received undefined`.
- [x] AC-3: A const / enum mismatch names the field **and** its expected value(s): ``frontmatter field ‘type’ must be ‘capability’`` (const) / ``… must be one of ‘…’, ‘…’`` (enum).
- [x] AC-4: A wrong-type / pattern / format failure names the field and the expectation.
- [x] AC-5: The change is confined to message construction — `id`, `level`, `pos`, deterministic ordering, and the `frontmatter/unknown-key` branch are unchanged; human, JSON, and SARIF all carry the improved text with **no formatter edits**.
- [x] AC-6: Peer tests in `content.test.ts` pin the exact messages (reported cases lead); the dogfood corpus and the full suite stay green.

## Out of scope

- `structure/*`, `content/*`, and `rule/*` messages — those are author-minted via the `Ctx` factory and already name their subject; a broader cross-plane message-quality audit is a separate follow-up.
- `Finding.fix` suggestions / auto-repair — describe-only, a later pass per `[[D-0001-finding-model]]`.
- Column-level positioning (`pos.col`) — line granularity is the committed bound (D-0001 A3).
- Localization / i18n of messages.

## Dependencies

- Builds on the assembled validator and the `frontmatter/*` ids from `[[T-3NC8-validate-and-finding-assembly]]`; the `Finding` shape is fixed by `[[D-0001-finding-model]]`.
