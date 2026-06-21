---
type: decision
schema_version: '1'
id: D-0001
status: open/accepted
title: Finding model — one positioned shape across five planes
created: '2026-06-20'
related:
  - '[[C-0005-two-plane-contract-engine]]'
  - '[[C-0001-contract-validation]]'
tags:
  - finding
  - validation
  - diagnostics
  - engine
need_human_review: true
---
# Finding model — one positioned shape across five planes

## Summary

- Every mechanism in the engine emits one `Finding` shape: a namespaced `id`, a contract-fixed
  `level`, a document-scoped `path`, an optional `pos`, a `message`, and an optional describe-only
  `fix?`.
- Findings are partitioned into **five planes** by id prefix — `frontmatter/*`, `structure/*`,
  `content/<leaf>/<check>`, `rule/*`, and `contract/*` — with the load-bearing line that **kind and
  presence are structure; data shape is content**.
- `pos` is omitted for whole-document absence findings; Zod issue paths are remapped to a source
  line; findings are sorted deterministically so goldens pin.
- Rule authors mint findings through a `Ctx` factory that fills `path`/`level`/`pos` from the
  registered id; engine-internal findings bypass it.
- `doc` is present **iff** there is no `error`-level finding; `read()` throws a `ContractError`
  carrying the error-level findings otherwise.

^summary

## Context

The library replaces ~35 structural checks scattered across four mechanisms (frontmatter slicers,
fence walkers, alias tables, a frontmatter engine) that each spoke a different diagnostic vocabulary.
Consolidating onto one parse demands one diagnostic shape — otherwise the finding stream that the CLI,
CI, and the typed-model door all consume is as forked as the scanners it retires. The shape must carry
a source position (the thing an index-based schema path cannot), a stable id for filtering and
golden-pinning, and a severity that is a property of the contract, not of the call site.

## Decision

### The shape

```ts
interface Finding {
  id: string;                                    // namespaced area/.../name (A1)
  level: "error" | "warn" | "report";            // contract data, not call-site choice
  path: string;                                  // document-scoped — one parse, one path
  pos?: SourcePos;                               // omitted for whole-document absence (A2)
  message: string;
  fix?: { description: string; edit?: TextEdit }; // describes only; applying is a separate pass
}
```

`level` is **contract data** (the commitlint model): the same rule cannot be hard at author-time and
soft at audit by accident. `fix?` only *describes* a machine-applicable repair; applying it is a
distinct downstream repair pass and explicitly out of this engine's scope.

### The five planes (A1)

Findings are partitioned by id prefix into five areas:

| Plane | id shape | Emitted by |
|---|---|---|
| `frontmatter/*` | `frontmatter/<check>` | Zod over the YAML (E1) |
| `structure/*` | `structure/<check>` | the tree grammar — section sequence / nesting / anchors **and** block presence / kind |
| `content/<leaf>/<check>` | e.g. `content/table/column-missing` | Zod over a present, correct-kind block's data (C1) |
| `rule/*` | `rule/<name>` (or a contract-chosen namespace) | named `rule` / `docRule` functions |
| `contract/*` | `contract/<check>` | build-time contract-authoring errors — **thrown, not collected** |

The partition line is exact: **kind and presence are structure; data shape is content** (F3). So the
block/anchor family is wholly structural — `structure/anchor-missing` (a declared `^anchor` resolves to
no block), `structure/block-missing` (a declared content slot has no block of the expected kind, C5),
and `structure/block-kind` (an addressed block is present but the wrong kind) — and these *gate* the
content leaf: a non-table never reaches table-column validation. Cross-plane key-collision checks split
by phase — `structure/key-collision` for two document sections that collapse to one camelCase key, and
build-time `contract/key-collision` for two declared names that collide.

### Positioning (A2, A3)

`pos` is a single `SourcePos { line: number; col?: number }`. It is **omitted** for whole-document
absence findings — a missing required section or unresolved declared anchor has no line to point at, so
the finding localizes to the document, not a fabricated line (A2). Frontmatter (Zod) findings remap the
Zod `issues[].path` to the offending key's **source line** via the projection's position-aware
frontmatter (`lineForPath`); line granularity is committed, column is a deferred refinement (A3).

### The rule-author factory (A4)

Rule bodies do not hand-assemble findings. The engine passes a `Ctx` whose `finding(...)` factory fills
`path`, the id's registered default `level`, and `pos` from the node — so a rule body names the problem
and nothing more:

```ts
interface Ctx {
  path: string;
  finding(f: { id: string; message: string; level?: Finding["level"]; pos?: SourcePos }): Finding;
}
```

Engine-internal findings (structure, frontmatter, content) bypass `Ctx` and are emitted directly.

### Ordering (E3) and the validity rule (F1)

`findings` is sorted deterministically so golden tests pin: ascending `pos.line`; no-`pos`
(document-level) findings sort first (as line 0); ties on a line break by `pos.col`, then by plane order
(`frontmatter` → `structure` → `content` → `rule`), then by stable emission order.

`doc` (the typed model — see [[D-0005-consumption-oom]]) is present **iff** there is no `error`-level
finding (warnings and reports do not block it). `read()` returns `doc` or throws a `ContractError`
carrying the error-level findings:

```ts
class ContractError extends Error { findings: Finding[]; }
```

## Why

- **One shape because one parse.** The engine merges frontmatter Zod, the body grammar, and cross-plane
  rules into a single `Finding[]` from a single parse with a single document `path`. A divergent
  per-mechanism shape would re-fork exactly what the consolidation retires.
- **Severity-as-data, not call-site.** Lifting `level` into the contract makes a rule's hardness a
  property of the rule everywhere it runs — the drift the prior author/audit split could not prevent.
- **The plane partition is load-bearing, not cosmetic.** Because schema languages and tree grammars are
  formally incomparable (Murata), block *kind* must be a structural (tree-grammar) decision and block
  *data* a content (Zod) one. Encoding that split in the id namespace makes a leaf a kind-gate **plus** a
  Zod schema — not "pure Zod" — and lets structure gate content cleanly.

## Consequences

- The CLI, CI (SARIF), commit hooks, and the `read()`/`validate()` doors all consume one stable,
  sorted, filterable stream — golden fixtures pin on `id` + `pos`.
- `error`-level findings are the single gate on the typed model and on `read()`, so the validity
  boundary is one well-defined predicate rather than per-consumer heuristics.
- `fix?` being describe-only binds the repair/normalization track to a separate read-write pass; this
  engine stays read-only.
- Every new check must declare a plane prefix and a default level, which keeps the namespace disciplined
  and forces the kind-vs-data question to be answered at authoring time.

## References

- [[C-0005-two-plane-contract-engine]] — the engine that emits these findings.
- [[C-0001-contract-validation]] — the capability whose primary product is this finding stream.
- [[D-0003-structure-plane]] — the structure-plane findings (`structure/*`).
- [[D-0004-content-plane]] — the content-plane findings (`content/<leaf>/<check>`).
- [[D-0005-consumption-oom]] — the typed model gated by error-level findings.
- `provenance/d0014/questions/A1-finding-id-namespace.md` — the five-plane id namespace.
- `provenance/d0014/questions/A2-pos-for-absence-findings.md` — omitting `pos` for absence.
- `provenance/d0014/questions/A3-zod-issue-line-remap.md` — Zod issue path → source line.
- `provenance/d0014/questions/A4-doc-self-bugs.md` — the `Ctx` finding factory.
- `provenance/d0014/questions/E3-merge-order.md` — deterministic finding ordering.
- `provenance/d0014/questions/E1-frontmatter-ids.md` — frontmatter-plane ids.
- `provenance/d0014/questions/F3-anchor-unresolved.md` — the structural block/anchor family.
- `provenance/d0014/proposed-shape.md` §4 — output, one pass over both planes.
