---
type: task
schema_version: '5'
id: T-E698
status: planning/draft
created: '2026-06-30'
related:
- T-CDIA-catalog-dialect
tags:
- api
- dialect
- dx
need_human_review: false
impact: medium
complexity: small
---
# Export `extractVaultRefs` and the `VaultRef` type from the package root barrel

## Goal

The dialect catalog sketches (`DIALECT-03/07/08/10/11` in
`docs/example-catalog.md` / `docs/catalog/dialect.yaml`) open with
`import { extractVaultRefs } from "markdown-contract"`, but that import has **no
importable public path today**: `extractVaultRefs` and the `VaultRef` type are
re-exported only by the internal dialect barrel `src/core/dialect/index.ts` —
they do not flow through `src/core/index.ts` or the public package barrel
`src/index.ts`, and `package.json` exposes only the `.` and `./declarative`
subpaths. The sketches we are publishing as copy-pasteable therefore do not
compile against the shipped package. Surface `extractVaultRefs` (runtime) and
`VaultRef` (type) from the package root so the dialect examples become literally
copy-pasteable.

## Today

`extractVaultRefs` / `VaultRef` are real and correct (verified byte-for-byte in
the T-CDIA post-mortem), but reachable only through the internal dialect barrel —
not the public surface a `markdown-contract` consumer imports from.

| Location | Role today |
|---|---|
| `src/core/dialect/wikilinks.ts` | Defines `export interface VaultRef` and `export function extractVaultRefs(text): VaultRef[]` — the real implementation. |
| `src/core/dialect/index.ts` | The dialect barrel; line `export { extractVaultRefs, type VaultRef } from "./wikilinks.js";` is the **only** place either name is re-exported. |
| `src/core/index.ts` | The engine barrel. Enumerates the runtime + type surface but does **not** re-export the dialect barrel, so `extractVaultRefs` / `VaultRef` never reach it. |
| `src/index.ts` | The public package barrel (the `.` export target). Re-exports `code`, `contract`, `docRule`, `parse`, `runCorpus`, etc. — but not `extractVaultRefs` / `VaultRef`. |
| `package.json` | `exports` map exposes only `.` (→ `dist/index.js`) and `./declarative`; no path reaches the dialect surface. |
| `src/index.test.ts` | Pins the public-barrel surface; does not yet assert `extractVaultRefs` / `VaultRef` are exported. |

## Proposed

`import { extractVaultRefs } from "markdown-contract"` and
`import type { VaultRef } from "markdown-contract"` both resolve against the
shipped package root. The dialect sketches (`DIALECT-03/07/08/10/11`) compile
verbatim against the published surface. The public-barrel peer test asserts both
names are present so the surface can't silently regress.

## Approach

1. Re-export the dialect barrel's vault-ref surface through the engine barrel:
   in `src/core/index.ts`, add `export { extractVaultRefs } from
   "./dialect/index.js";` and `export type { VaultRef } from
   "./dialect/index.js";` (mirroring how the other runtime/type names are
   surfaced there).
2. Surface them at the package root: add `extractVaultRefs` to the runtime
   re-export list in `src/index.ts` (sourced from `./core/index.js`); `VaultRef`
   flows automatically via the existing `export type * from "./core/index.js"`
   once step 1 lands (confirm, and add an explicit `export type { VaultRef }` if
   the `export type *` does not pick it up).
3. Extend `src/index.test.ts` to assert `extractVaultRefs` is a function on the
   public surface and that a `VaultRef`-typed value type-checks (the peer-test
   convention pins the contract).
4. Decide whether the bare-root export is sufficient or a dedicated
   `./dialect` subpath in `package.json` `exports` is also wanted. The sketches
   import from the bare root, so the root barrel suffices; a `./dialect` subpath
   is optional polish and, if added, must be covered by package-hygiene
   validation ([[T-L77L-package-publish-hygiene]]). Default: root export only.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/core/index.ts` | modify | Re-export `extractVaultRefs` (runtime) + `VaultRef` (type) from `./dialect/index.js`. |
| `src/index.ts` | modify | Add `extractVaultRefs` to the runtime re-export list; ensure `VaultRef` is on the public type surface. |
| `src/index.test.ts` | modify | Assert `extractVaultRefs` / `VaultRef` are exported from the package root. |
| `package.json` | modify | Optional: add a `./dialect` subpath to `exports` only if step 4 chooses it (default: no change). |

## Acceptance criteria

- [ ] AC-1: `import { extractVaultRefs } from "markdown-contract"` resolves and `extractVaultRefs` is a callable function (the type is `(text: string) => VaultRef[]`).
- [ ] AC-2: `import type { VaultRef } from "markdown-contract"` resolves to the same interface defined in `src/core/dialect/wikilinks.ts`.
- [ ] AC-3: `src/index.test.ts` asserts both `extractVaultRefs` and `VaultRef` are present on the public surface; `npm run test` and `npm run typecheck` stay green.
- [ ] AC-4: The `DIALECT-03/07/08/10/11` sketches in `docs/example-catalog.md` / `docs/catalog/dialect.yaml` compile verbatim against the package root (no rewrite of the `import` line needed).

## Out of scope

- Changing the behavior of `extractVaultRefs` / `VaultRef` — they are verified correct; this task only re-exports them.
- Adding publint / are-the-types-wrong packaging validation — that's [[T-L77L-package-publish-hygiene]] (which would then cover any new `./dialect` subpath).
- Exporting any other dialect internals (`extractTrailingAnchor`, `isStandaloneAnchor`) — only the vault-ref surface the sketches need.

## Dependencies

- none

## Discovery context

Spawned from the `## Post-mortem` → `### Friction and automation gaps` of
[[T-CDIA-catalog-dialect]] on 2026-06-30 (UTC) by the spawn-from-post-mortem
procedure, in https://github.com/sksizer/markdown-contract.

### Dedup search (spawn-from-post-mortem)

Bullet: The dialect sketches `import { extractVaultRefs } from "markdown-contract"` (DIALECT-03/07/08/10/11) reference a real, correct-behaving function that has no importable public path — it is re-exported only by `src/core/dialect/index.ts`, not the public barrel `src/index.ts`, and `package.json` exposes only the `.` and `./declarative` subpaths — export `extractVaultRefs` and the `VaultRef` type from the package root so the dialect sketches become literally copy-pasteable.
Keywords searched: markdown-contract, extractvaultrefs, correct-behaving, copy-pasteable, re-exported, declarative, dialect-03, importable
Excluded: T-CDIA-catalog-dialect
Top candidates (score / status / headline):
  - 27 / open/ready / T-CDYL-catalog-declarative-yaml — Finalize the Declarative-YAML catalog category as verified YAML (`declarative-yaml`)
  - 20 / closed/done / T-2CSL-const-string-length-cap — Cap the length of strings the inferer will pin as a `const` (or admit into an `enum`)
  - 18 / closed/done / T-3MCE-min-examples-before-const — Minimum example-count before `const` (`init --meta` value ladder)
  - 18 / closed/done / T-TXYL-declarative-requires-forbids — Declarative front-end — `requires` / `forbids` in YAML
  - 16 / open/ready / T-7UTE-astro-docs-site — Stand up an Astro + Starlight documentation site for markdown-contract
Decision: SPAWNED (override of the script's LINKED-EXISTING → T-CDYL-catalog-declarative-yaml).
Rationale: The top candidate T-CDYL scored on shared catalog/declarative vocabulary, not on the actual gap. T-CDYL finalizes the declarative-yaml catalog *category*; it does not touch the package-root export surface. No existing task exports `extractVaultRefs` / `VaultRef` from `src/index.ts`, and [[T-L77L-package-publish-hygiene]] explicitly scopes *out* changing the `exports` map. Genuinely new work.
