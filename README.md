# markdown-contract

[![CI](https://github.com/sksizer/markdown-contract/actions/workflows/ci.yml/badge.svg)](https://github.com/sksizer/markdown-contract/actions/workflows/ci.yml)

Declare a **contract** per markdown document type — its frontmatter fields, its
section structure, the shape of its tables — and get two things back from one
parse:

- **Validation**: findings pinned to `path:line`, as human text, JSON, or
  SARIF, with CI-ready exit codes.
- **A typed model**: the same contract that *checks* a document also *types*
  it, so a section's prose, a table's rows, and a frontmatter field are
  ordinary typed reads.

**Documentation:** <https://markdown-contract-docs.pages.dev/> — the
[`sites/docs`](sites/docs/) Starlight site, auto-deployed to Cloudflare Pages on
push to `main` (build settings: [`sites/docs/README.md`](sites/docs/README.md)).

## The problem

Teams keep their durable knowledge in markdown — decision records, runbooks,
planning docs, changelogs — because it is the cheapest format people actually
keep writing. But markdown has no schema. The rules a corpus depends on
(required sections in order, typed frontmatter, tables with known columns) are
enforced, if at all, by ad-hoc regex and bespoke per-repo scripts that drift
apart silently. And every consumer that *reads* the documents — dashboards,
report generators, migrations — re-parses them from scratch.

The existing tools don't cover this: frontmatter validators stop at the YAML,
markdown linters check style rather than structure, and a CMS solves the
problem only by taking the documents away from plain markdown.

## The solution

One declaration per document type, two doors onto it:

```ts
import { contract, sections, section } from "markdown-contract";
import { z } from "zod";

const decision = contract({
  frontmatter: z.object({ status: z.enum(["proposed", "accepted"]) }),
  body: sections({ allowUnknown: true }, [section("Summary"), section("Decision")]),
});

decision.validate(src, { path: "D-0001.md" }); // findings with path:line positions
decision.read(src, { path: "D-0001.md" });     // the typed model, or a thrown ContractError
```

Contracts can also be pure YAML — no code — and a config file maps directories
and globs to contracts, so validating a whole tree is configuration:

```sh
markdown-contract validate ./docs                  # 0 clean, 1 findings, 2 usage error
markdown-contract init ./docs                      # infer a config from existing docs
markdown-contract validate ./docs --format sarif   # feed code scanning
```

This repository dogfoods it: the planning corpus under `docs/planning/` (~190
documents across six contracts) is validated by the tool itself.

## Architecture

One parse per document: the source is projected into a position-carrying
section tree, then three planes run over it — a small tree **grammar** for
structure, **Zod** for content, and named **rules** for anything cross-cutting.
Every plane emits one finding shape; a clean document additionally yields the
typed model. The engine is read-only, deterministic, and pure (no file system,
no `process`).

The published package is three layers with one-way imports —
**`cli → runner → core`** — so everything the CLI does is one library call
away. The wider workspace builds around that engine:

| Path | Role |
|---|---|
| `packages/core` | The `markdown-contract` npm library + CLI — the canonical published artifact. See [`packages/core/README.md`](packages/core/README.md). |
| `crates/markdown-contract-engine` | A matched Rust engine for the declarative validation plane, held to finding parity with `packages/core` by a shared fixture corpus. fs-free, wasm-ready. |
| `apps/web` | One binary, two faces: the CLI when run bare, plus a `daemon` mode hosting a local vault dashboard (SPA + JSON API) over the engine. See [`apps/web/README.md`](apps/web/README.md). |
| `apps/desktop` | The desktop app (Tauri + Nuxt): native scans via the Rust engine, multi-vault tracking with watch/schedules/notifications. See [`apps/desktop/README.md`](apps/desktop/README.md). |
| `packages/ui` | `@markdown-contract/ui` — the shared Vue component kit + design tokens consumed by the web and desktop apps. Source-shipped, never published. |
| `sites/docs` | The Astro + Starlight documentation site. Example pages are generated from `docs/catalog/*.yaml`, and every example artifact is regression-checked against the real CLI and library. |
| `docs/`, `contracts/` | The self-hosted planning corpus and the contracts that validate it. |
| `provenance/d0014/` | The originating design record: proposed shape + decision log. |

The library, CLI, declarative YAML surface, text constraints, and repeatable
sections are shipped and stable. The single binary, vault dashboard, desktop
app, and Rust engine are working but younger — direction of travel rather than
settled surface. The full design rationale lives in
[`docs/planning/`](docs/planning/vision.md) (vision, drivers, decisions).

## Quickstart (from source)

The package is not yet on npm. Build it from a checkout:

```sh
git clone https://github.com/sksizer/markdown-contract
cd markdown-contract
bun install                    # resolve the workspace
bunx moon run core:build       # tsc → packages/core/dist (library + CLI bin)
node packages/core/dist/cli/index.js validate docs/planning   # try it on this repo
```

The [Getting started](https://markdown-contract-docs.pages.dev/getting-started/)
page walks the first contract in YAML and TypeScript.

## Contributing

The Rust side is a root Cargo workspace (`crates/*` + `apps/desktop/src-tauri`);
`cargo test -p markdown-contract-engine` runs the engine's unit suite plus the
shared-corpus harness over `packages/core/tests/fixtures/validation` goldens.

Toolchain (Bun + moon + Node), the quality-gate stack, moon task authoring
rules, and code metrics are documented in [`DEVELOPMENT.md`](DEVELOPMENT.md).
Module and test conventions live in [`CONVENTIONS.md`](CONVENTIONS.md).
