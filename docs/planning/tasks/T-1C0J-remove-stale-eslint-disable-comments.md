---
type: task
schema_version: '5'
id: T-1C0J
status: planning/backlog
created: '2026-07-02'
related:
- '[[M-0010]]'
- '[[T-0MVN-biome-lint-format]]'
tags:
- quality
- lint
- cleanup
- biome
- tech-debt
need_human_review: false
impact: low
complexity: small
---
# Remove stale eslint-disable comments from test fixtures now that Biome is the linter

## Goal

The repo never adopted ESLint, yet several test fixtures carry
`// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments (copied in from
external examples). Now that [[T-0MVN-biome-lint-format]] has made Biome the enforced
linter, those comments are dead weight: they suppress nothing, and where a real Biome
suppression was added next to one (e.g. the `noSelfCompare` case in
`03-dual-key-section-access.ts`), the stale eslint comment now sits between the
`biome-ignore` and its target line, which is confusing. Sweep them.

## Today

| Location | Role today |
|---|---|
| `packages/core/tests/fixtures/**/*.ts` | Some fixtures carry `// eslint-disable-next-line @typescript-eslint/...` comments that no linter reads (ESLint is not configured). |
| `packages/core/tests/fixtures/consumption/03-dual-key-section-access.ts` | Has a stale eslint-disable directly above a real `// biome-ignore lint/suspicious/noSelfCompare` comment (added by T-0MVN). |

## Proposed

No `eslint-disable` / `@typescript-eslint` comments remain in the codebase. Where the
suppressed concern is real under Biome (e.g. `noExplicitAny` on `(doc.body as any)`), it is
either left unsuppressed (the rule is `warn`, non-blocking) or converted to a proper
`// biome-ignore` with a rationale. The test suite stays green.

## Approach

1. `grep -rn "eslint-disable\|@typescript-eslint" packages/core` to enumerate every site.
2. For each: delete the stale comment; if the underlying finding is a Biome *error*, replace
   with a `// biome-ignore <rule>: <reason>`; if it is only a `warn` (e.g. `noExplicitAny`),
   just delete the comment (warnings do not block the gate).
3. Run `bunx moon run core:lint` (stays green — no new errors) and `bunx moon run core:test`.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `packages/core/tests/fixtures/**/*.ts` | modify | Remove stale `eslint-disable` comments; convert to `biome-ignore` only where a real Biome error needs suppressing. |

## Acceptance criteria

- [ ] AC-1: `grep -rn "eslint-disable" packages/core` returns nothing.
- [ ] AC-2: `bunx moon run core:lint` exits 0.
- [ ] AC-3: `bunx moon run core:test` stays green.

## Out of scope

- The deliberately-relaxed `noExplicitAny` / `noNonNullAssertion` warn severities (owned by the Biome-debt theme, see [[T-D8TE-ratchet-biome-complexity-ceiling]]).

## Dependencies

- [[T-0MVN-biome-lint-format]] (Biome must be the enforced linter first).

## Discovery context

Captured from the [[T-0MVN-biome-lint-format]] post-mortem: the `noSelfCompare` suppression
placement surfaced that stale ESLint directives still live in the fixtures.
