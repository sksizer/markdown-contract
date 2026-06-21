---
type: capability
schema_version: '1'
id: C-0001
kind: feature
title: Contract validation
status: open/verified
created: '2026-06-20'
parent_key: null
contains: []
related:
  - '[[DR-0001-general-markdown-validation]]'
  - '[[DR-0004-validate-sdlc-corpus]]'
  - '[[C-0004-dialect-aware-projection]]'
  - '[[C-0005-two-plane-contract-engine]]'
tags:
  - validation
  - contract
  - findings
need_human_review: true
---

# Contract validation

## Summary

- Validate a markdown document against a declared per-type contract, producing positioned findings
  across frontmatter, section structure, and block content. ^summary
- The core feature the library exists to deliver; serves general validation and the SDLC-corpus
  dogfood.

## Statement

A consumer declares a contract for a document type — its frontmatter shape, its section grammar, and
its block content — and the library validates any document against it in a single pass, returning a
flat list of findings, each carrying a source position and a stable registry id. Validation never
depends on the typed model; findings are the primary product.

## What it provides

- A `validate(source, contract)` call returning `{ findings, doc?, tree }`.
- Findings spanning all three planes (frontmatter, structure, content), each with a `pos` and a
  registry id, merged in a stable order.
- A strict `read()` door that throws `ContractError` when an error-level finding is present.

## Inputs

- The document `source: string` (raw markdown + frontmatter) plus a `ctx: { path: string }` — the
  source document's **file path**, used only to stamp findings as `<path>:<line>`. It is the file
  path, not an in-document / structural path; the in-document location is each finding's `pos`.
- A `Contract<F, B>` declared via the engine combinators ([[C-0005-two-plane-contract-engine]]).
- The `source` door parses with the bundled, dialect-aware projection — GFM + Obsidian, no config
  ([[C-0004-dialect-aware-projection]]). The `DocTree` overload lets a caller parse once and validate
  several contracts against one tree (or feed a custom / extended projection).

```ts
// Two doors onto one engine, mirroring Zod's safeParse / parse:
Contract.validate(source: string, ctx: { path: string }): ValidationResult<F, B>;  // never throws — findings as data
Contract.read(source: string, ctx: { path: string }): Doc<F, B>;                   // throws ContractError, returns the model
Contract.validate(tree: DocTree, ctx: { path: string }): ValidationResult<F, B>;   // reuse a pre-parsed tree
```

`validate` is the "show me everything" door — it never throws, so a CLI or report reads every finding
as data. `read` is the "give me the data or fail" door — it returns the typed model, or throws
`ContractError` carrying the error-level findings, for consumers that treat invalidity as exceptional.

## Outputs

- A single `ValidationResult` from one pass — findings from every plane, the projection always, and
  the typed model only when the document is valid.

```ts
interface ValidationResult<F, B> {
  findings: Finding[];   // frontmatter + structure + content + rule, merged, deterministically sorted
  doc?: Doc<F, B>;       // the typed model — present iff no error-level finding
  tree: DocTree;         // the raw projection (tree.mdast, lineForPath) — always returned
}

interface Finding {
  id: string;            // namespaced `area/…/name`, e.g. "structure/section-missing"
  level: "error" | "warn" | "report";   // contract data, not a call-site choice
  path: string;          // the source document's file path (ctx.path), for <path>:<line> — not a structural path
  pos?: SourcePos;       // omitted for whole-document absence findings
  message: string;
  fix?: { description: string; edit?: TextEdit };   // describes only; applying is a separate repair pass
}

class ContractError extends Error { findings: Finding[]; }   // carries the error-level findings
```

- Five finding areas: `frontmatter/*`, `structure/*`, `content/<leaf>/<check>`, `rule/*`, and
  build-time `contract/*` (thrown, not collected). `doc` is present iff no `error`-level finding
  (warnings are fine); findings sort by `pos.line` (document-level first), then plane order, then
  stable emission.

## Hook points

- New `structure` / `rule` checks attach through the engine's named-rule registry
  ([[C-0005-two-plane-contract-engine]]); this capability only surfaces what they emit.
- The default `source` door is dialect-aware out of the box; the pre-parsed `DocTree` overload is the
  seam for parse-once reuse or a custom / extended projection.
- `Finding.fix` is optional, descriptive metadata — a human-readable `description` plus an optional
  `TextEdit` that *names* a remedy. The library only reports findings; it never edits documents.
  Applying a fix is a separate repair pass (a later concern), so `fix` is the forward-looking hook a
  repair tool would consume.

## Underlying implementation

- Planned: `src/core/validate.ts` (the one-pass merge) and `src/core/finding.ts` (the `Finding`
  shape), realized by [[C-0005-two-plane-contract-engine]] over [[C-0004-dialect-aware-projection]].
- Fixed by the `D·finding-model` ADR (the finding shape, the five planes, ordering, `ContractError`).
  Not yet built.

## Notes

Serves [[DR-0001-general-markdown-validation]] and [[DR-0004-validate-sdlc-corpus]]; realized by the
[[C-0005-two-plane-contract-engine]] over the [[C-0004-dialect-aware-projection]]. The finding model
is the `D·finding-model` ADR. Status `open/planned`.
