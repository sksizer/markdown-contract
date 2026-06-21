---
type: capability
schema_version: '1'
id: C-0001
kind: feature
title: Contract validation
status: open/planned
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

- The document `source: string` (raw markdown + frontmatter) plus a `ctx: { path: string }` for
  diagnostics — or a pre-parsed `DocTree` (from [[C-0004-dialect-aware-projection]]) to skip the
  internal parse.
- A `Contract<F, B>` declared via the engine combinators ([[C-0005-two-plane-contract-engine]]).

```ts
Contract.validate(source: string, ctx: { path: string }): ValidationResult<F, B>;
Contract.validate(tree: DocTree, ctx: { path: string }): ValidationResult<F, B>;  // bring your own parse
Contract.read(source: string, ctx: { path: string }): Doc<F, B>;                  // throws ContractError
```

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
  path: string;          // document-scoped (one parse, one path)
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
- The pre-parsed `DocTree` overload is the seam for a custom projection or dialect.
- `Finding.fix` is the declared attachment point for a future repair pass (applying edits is out of
  scope here).

## Underlying implementation

- Planned: `src/core/validate.ts` (the one-pass merge) and `src/core/finding.ts` (the `Finding`
  shape), realized by [[C-0005-two-plane-contract-engine]] over [[C-0004-dialect-aware-projection]].
- Fixed by the `D·finding-model` ADR (the finding shape, the five planes, ordering, `ContractError`).
  Not yet built.

## Notes

Serves [[DR-0001-general-markdown-validation]] and [[DR-0004-validate-sdlc-corpus]]; realized by the
[[C-0005-two-plane-contract-engine]] over the [[C-0004-dialect-aware-projection]]. The finding model
is the `D·finding-model` ADR. Status `open/planned`.
