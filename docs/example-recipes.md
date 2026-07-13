# markdown-contract — use-case recipe backlog

> A scenario-first companion to the [example catalog](./example-catalog.md). The
> catalog teaches markdown-contract by **mechanism** (CLI, contracts-in-code,
> dialect, …); this backlog reframes the same surface as **use-case recipes** —
> each one starts from a real situation ("I have a folder of markdown and want CI
> to enforce a shape") and shows the whole solution end-to-end.
>
> The recipes are published under the docs site's **Recipes** section
> (`sites/docs/src/content/docs/recipes/`), hand-authored (not generated), and
> link *down* into the atomic catalog examples and *up* into the reference. We
> build them one at a time; this file is the working checklist.

## Status legend

| Mark | Meaning |
|------|---------|
| ✅ | Ships today — buildable and verifiable now. |
| 🟡 | Ships, but the recipe is a multi-part `mixed` artifact (harder to auto-verify end to end). |
| 🔧 | Needs a small library change first. |
| 🔵 | Catalog currently mislabels the underlying capability as planned (it actually ships). |
| ☑︎ | **Built** — a published recipe page exists. |

## A — Guard a folder (or folders) in CI

| # | Recipe (the user's goal) | Status |
|---|--------------------------|--------|
| UC-01 | Guard one folder of docs in CI, fail on any violation. | ☑︎ ✅ |
| UC-02 | Don't hand-write the contract — infer it with `init`, then guard it. | ☑︎ ✅ |
| UC-03 | Multiple folders, each a different shape — route globs to per-type contracts. | ☑︎ ✅ |
| UC-04 | Strict for published docs, lenient for drafts still in flight. | ☑︎ ✅ |
| UC-05 | Only check the files that changed in this PR. | ☑︎ 🟡 |
| UC-06 | Errors block the build; warnings become PR annotations (SARIF). | ☑︎ ✅ |
| UC-07 | Block bad docs at commit time (pre-commit hook). | ☑︎ ✅ |
| UC-08 | Catch when docs drift away from the agreed shape over time. | ☑︎ ✅ |

## B — Content-level contracts for a site (Astro / content collections / SSG)

| # | Recipe | Status |
|---|--------|--------|
| UC-09 | Check an Astro content collection's **body** (what its frontmatter schema can't). | ☑︎ ✅ |
| UC-10 | Every how-to must have a code block **and** a checklist. | ☑︎ ✅ |
| UC-11 | A table must carry exactly the typed columns downstream tooling reads. | ☑︎ ✅ |
| UC-12 | Cap a summary's length and require an `^anchor` for excerpts. | ☑︎ ✅ |
| UC-13 | Require a phrase in a section, or forbid one document-wide. | ☑︎ 🔵 |

## C — Obsidian / knowledge vault (dialect)

| # | Recipe | Status |
|---|--------|--------|
| UC-14 | Find every dead `[[wikilink]]` across a vault. | 🔧 |
| UC-15 | Require notes to expose a `^summary` anchor for transclusion. | ☑︎ ✅ |
| UC-16 | Check that `[[note#^anchor]]` fragments actually resolve. | 🔧 / 🟡 |

## D — Team doc templates (ADR / RFC / runbook / postmortem)

| # | Recipe | Status |
|---|--------|--------|
| UC-17 | Turn the ADR convention into an enforced template. | ☑︎ ✅ |
| UC-18 | Runbooks need an on-call owner and a rollback checklist. | ☑︎ ✅ |
| UC-19 | Postmortems need a timeline table and action items. | ☑︎ ✅ |
| UC-20 | A Decision section must cite an alternative. | ☑︎ ✅ |

## E — Read markdown back as typed data

| # | Recipe | Status |
|---|--------|--------|
| UC-21 | Build an index/dashboard from docs' frontmatter and tables. | ☑︎ ✅ |
| UC-22 | Assemble release notes from every `## Release` section. | ☑︎ ✅ |
| UC-23 | Feed an agent prompt-cards guaranteed to parse. | ☑︎ ✅ |

## F — Embed in your own tooling

| # | Recipe | Status |
|---|--------|--------|
| UC-24 | Validate inside your own build script / Node service. | ☑︎ ✅ |
| UC-25 | Surface findings as editor / LSP diagnostics. | ☑︎ ✅ |
| UC-26 | Only fail on new findings vs a known-good baseline. | ☑︎ ✅ |

## G — Cross-document governance (honest about the seams)

| # | Recipe | Status |
|---|--------|--------|
| UC-27 | `owner` must be a real team handle, tree-wide (frontmatter enum). | ☑︎ ✅ |
| UC-28 | `depends_on` / `supersedes` must point at documents that exist. | ☑︎ 🟡 |

## Build notes

- **Reuse verified parts.** Most recipes compose atomic catalog examples that are
  already regression-checked (e.g. UC-17 assembles `REAL-WORLD-SCHEMAS-01…05`).
- **Verification.** A full recipe is usually a `mixed` artifact, which the catalog
  artifact-check skips. Every built recipe was verified the same way: each
  contract/config compiled through `loadContractFile` / `loadConfigFile`, every
  terminal transcript captured from the real built CLI, and every code snippet
  executed (bun) and typechecked (strict tsc against the dist types) before the
  page was written.
- **Two library gaps to weigh before the vault cluster:**
  1. Re-export `extractVaultRefs` at the package root — unblocks UC-14/16 and
     clears four `DIALECT-*` known-failures.
  2. Un-plan `DECLARATIVE-YAML-14…20`: the declarative `requires:` / `forbids:`
     text constraints they describe actually ship (`declarative/text.ts`, wired
     via `body.ts` / `load.ts`), so UC-13 is buildable today.

## Remaining

Only the two vault recipes (UC-14, UC-16) are unbuilt — both wait on the
`extractVaultRefs` root re-export (gap 1 above).
