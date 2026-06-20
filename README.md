# markdown-contract

Validate and consume markdown-as-data: per-type **contracts** over a single parse —
a **structure plane** (a regular tree grammar over sections and block kinds), a
**content plane** (Zod over each block's data), and a typed **out-of-model** you can
read. The contract that *checks* a document also *types* it.

> **Status: scaffolding (Phase 0).** The API design is settled — 38 decisions — and
> implementation begins at milestone L0. The full spec and decision record were
> brought over from the originating ADR and live under
> [`provenance/d0014/`](provenance/d0014/):
> [`proposed-shape.md`](provenance/d0014/proposed-shape.md) (the API spec) and
> [`review-checklist.md`](provenance/d0014/review-checklist.md) (the plan + decision log).

## Layout

| Path | Role |
|---|---|
| `src/core/` | the engine — one document × one contract → findings + `tree` + `doc`. Pure, no IO. |
| `src/runner/` | the corpus runner — config (globs→contracts) → aggregated findings. Library API. |
| `src/cli/` | the `markdown-contract` bin — argv → runner → format (human/json/sarif) → exit. Thin shell. |
| `docs/planning/` | this project's own SDLC entities (self-hosted). |
| `provenance/` | the D-0014 design review carried over from the originating repo. |

**Imports flow one way: `cli → runner → core`, never back.** The engine knows nothing
of argv, files, or `process`; the CLI is just another consumer of the library.

## Packaging

A standard Node ESM package (Node ≥ 20). `tsc` builds `src/` → `dist/` (JS + `.d.ts`);
`exports`, `types`, and `bin` point at `dist/`, and only `dist/` is published. No
Bun-only APIs in shipped code, so it installs and runs under any package manager
(`npm`, `pnpm`, `yarn`, `bun`) and any Node runtime.

## Develop

```sh
npm install
npm run build      # tsc → dist/ (JS + declarations)
npm test           # vitest
npm run cli -- --help
```

This project self-hosts the SDLC planning system. In a Claude Code session opened in
this repo, run `/sdlc:setup` then `sdlc entities validate` to wire and green the
planning gate.
