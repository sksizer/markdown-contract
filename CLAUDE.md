# markdown-contract — engineering conventions

Repo-specific conventions. The full design is specified under `provenance/d0014/`
(proposed shape, decision records); this file captures the structural rules that
code and tests must follow.

## Modules & barrels

- Factor modules by **functionality** — one responsibility per file.
- `index.ts` is a **barrel only**: it re-exports, it holds no logic.
- A module **directory** with an `index.ts` therefore implies several broken-out
  modules sitting beside that barrel. If a directory would contain only `index.ts`
  plus logic, split the logic into named sibling modules and let `index.ts` re-export
  them.
  - e.g. `src/core/dialect/` = `anchors.ts` + `wikilinks.ts` + `index.ts` (barrel).
- Imports flow one way: **`cli → runner → core`**. Nothing in `core`/`runner` imports
  from `cli`; nothing in `core` imports from `runner`.

## Tests

- **Unit tests are peer files.** A module's unit test sits next to it as
  `<module>.test.ts` — e.g. `src/core/projection.ts` ↔ `src/core/projection.test.ts`,
  `src/cli/index.ts` ↔ `src/cli/index.test.ts`. (This is deliberately different from
  the conventional separate `tests/` tree — it is what this repo wants.)
- The **fixture-driven integration corpus** stays under `tests/`: the harness
  (`tests/harness.ts`), the validation/consumption fixtures, and the end-to-end
  `corpus/` tree. These exercise the assembled pipeline, not a single module.
- `vitest.config.ts` discovers both locations (`src/**/*.test.ts`, `tests/**/*.test.ts`).
- The dist build excludes tests: `tsconfig.build.json` has `exclude: ["src/**/*.test.ts"]`
  so co-located unit tests never ship in `dist/`.

## Fixture markdown

- A fixture's input document lives in a **peer `.md` file**, not an inlined string —
  one `.md` per case (`<fixture>.<case>.md`; bare `<fixture>.md` when single-case),
  loaded via `loadSource(import.meta.url, "./<file>.md")` (see `tests/harness.ts`).
  The bytes are used **verbatim** (no trailing-newline normalization) so
  position-pinned findings stay exact.
