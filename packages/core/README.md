# markdown-contract

[![CI](https://github.com/sksizer/markdown-contract/actions/workflows/ci.yml/badge.svg)](https://github.com/sksizer/markdown-contract/actions/workflows/ci.yml)

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

### Declaration emit

`core:build` (`tsc -p tsconfig.build.json`, `declaration: true`) is the **only** gate tier
that exercises `.d.ts` declaration emit — `core:typecheck` (`tsc --noEmit`) type-checks but
emits nothing, so it never triggers a declaration-emit error. The regression class this
guards is **TS4023 / TS4058** (*"Exported variable … / Return type of exported function …
has or is using name 'X' from external module … but cannot be named"*): an exported
value or function whose emitted `.d.ts` must reference a type from another module **by
name**.

The condition that reproduces it is **cross-module**. A type exported by module A and used
(by inference or by annotation) in an *exported* signature of module B forces B's emitted
`.d.ts` to name that type as `import("./A.js").T`. De-export the type from A — the shape
knip flags as an "unused export" (nothing imports it by name; it survives only via B's
inference) — and:

- `core:typecheck` stays **green** (A still compiles with the type local; B never named it), yet
- `core:build` **fails** with TS4023 / TS4058, because B's `.d.ts` can no longer write
  `import("./A.js").T`.

The naive **same-module** version does **not** reproduce it. De-export a type used in an
exported signature *within the same file* and the build stays green: a non-exported
same-module type still emits **inline** into that module's own `.d.ts` (as a local
declaration), so nothing has to name it across a module boundary. So "de-export a type used
in an exported signature" only breaks declaration emit when the reference **crosses a
module** — reach for the cross-module recipe, not the same-module one, when reproducing or
debugging this class. (Interfaces/classes are named in the `.d.ts`; a plain object type
alias TS can inline structurally will not trip it.)

## Develop

npm stays canonical — the package is a plain npm package and `npm run <script>`
works exactly as before:

```sh
npm install
npm run build      # tsc → dist/ (JS + declarations)
npm test           # vitest
npm run cli -- --help
```

### Task runner: moon

Tasks also run through [moon](https://moonrepo.dev) ([D-0010](docs/planning/decisions)),
which adds caching and a pinned toolchain so a clean checkout builds identically on
every machine and in CI. moon ships as a pinned devDependency (`@moonrepo/cli`), so it
arrives with `npm install` — invoke it via `npx moon`:

```sh
npx moon run :build        # tsc -p tsconfig.build.json  → dist/
npx moon run :typecheck    # tsc --noEmit
npx moon run :test         # vitest run
npx moon run :lint-docs    # build, then validate docs/planning (local gate)
npx moon ci                # build + typecheck + test (what CI runs)
```

A re-run with no input change is a cache hit (near-instant); `:lint-docs` depends on
`:build` and runs it first. `:lint-docs` validates this repo's own in-flight planning
docs, so it's a local author gate rather than a CI gate (those docs are mid-edit on any
task branch); CI runs `:build :typecheck :test`. The moon tasks wrap the same npm
scripts above (one task source of truth in `moon.yml`), so behavior is unchanged.

**Pinned versions** (`.moon/toolchains.yml`, `package.json`):

| Tool | Version | Role |
|---|---|---|
| moon (`@moonrepo/cli`) | `2.3.5` | task runner + toolchain manager |
| Node | `20.20.2` | runs build / typecheck / test (matches `engines.node >=20`) |
| Bun | `1.3.14` | pinned forward-looking for the future `bun build --compile` binary ([D-0012](docs/planning/decisions)); runs no task today |

This project self-hosts the SDLC planning system. In a Claude Code session opened in
this repo, run `/sdlc:setup` then `sdlc entities validate` to wire and green the
planning gate.
