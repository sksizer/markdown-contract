---
type: task
schema_version: '5'
id: T-D5QD
status: planning/draft
created: '2026-06-30'
related:
- T-CDIA-catalog-dialect
tags:
- docs
- catalog
- test
- ci
need_human_review: false
impact: medium
complexity: small
---
# Add a corpus parity test asserting each catalog YAML artifact matches its example-catalog.md sketch

## Goal

The catalog finalization effort (M-0007) lifts each category's examples out of
the prose `docs/example-catalog.md` into structured `docs/catalog/<category>.yaml`
files, where every entry carries an `artifact:` block-scalar that must reproduce
the corresponding fenced sketch in the markdown source **byte-for-byte**. Nothing
keeps the two in sync: the T-CDIA post-mortem verified `dialect.yaml`'s artifacts
against `example-catalog.md` with a throwaway script that was then discarded, so
the next edit to either file can silently diverge them. Add a standing corpus
parity test so divergence fails CI instead of rotting unnoticed.

## Today

`docs/catalog/dialect.yaml` is the first finalized category; six more land as the
sibling M-0007 tasks ship. Each YAML `artifact:` is meant to equal a sketch in
`docs/example-catalog.md`, but only a now-deleted ad-hoc script ever checked it.

| Location | Role today |
|---|---|
| `docs/example-catalog.md` | The prose catalog source: per-example index tables + fenced (` ```bash ` / ` ```yaml ` / mixed) `artifact` sketches. The hand-authored source of truth. |
| `docs/catalog/dialect.yaml` | First finalized category (`DIALECT-01..11`); each entry's `artifact: |` block-scalar is meant to reproduce the matching `example-catalog.md` sketch verbatim. |
| `docs/catalog/` | Holds only `dialect.yaml` today; `cli`, `consume-as-data`, `embed-and-ci`, `inference-init`, `declarative-yaml`, `validation-planes`, `real-world-schemas` YAMLs land as their tasks ship. |
| `tests/yaml-parity.test.ts` | The existing parity harness — but it checks TS validation fixtures against their `.contract.yaml` twins, a different artifact pair. No catalog↔markdown check. |
| `vitest.config.ts` | Globs `tests/**/*.test.ts`, so a new `tests/catalog-parity.test.ts` is auto-discovered. |

## Proposed

A standing `tests/catalog-parity.test.ts` globs every `docs/catalog/*.yaml`,
parses each entry, and asserts its `artifact` equals the corresponding sketch in
`docs/example-catalog.md` byte-for-byte. The test grows automatically as each new
category YAML lands (glob-driven, no per-category edit), and a divergence between
a YAML artifact and its markdown sketch is a hard test failure.

## Approach

1. Decide the YAML→markdown sketch mapping: how a catalog entry id
   (`DIALECT-03`) resolves to its fenced block(s) in `example-catalog.md`.
   Likely keyed by the example id heading/anchor in the markdown; `mixed`
   artifacts that span multiple fences need a defined join. Pin this in the test
   so it is explicit, not implicit in extraction order.
2. Add `tests/catalog-parity.test.ts`: glob `docs/catalog/*.yaml`, parse with the
   same `yaml` dep the repo already uses, and for each entry extract the matching
   `example-catalog.md` sketch and `expect(artifact).toBe(sketch)` (verbatim
   bytes, no trailing-newline normalization — consistent with the repo's
   verbatim-fixture convention).
3. Make the test resilient to incremental rollout: a category YAML that does not
   yet exist is simply not globbed; an example id present in one file but not the
   other is reported as a clear failure (or a skip with a warning, per the
   `peerless` precedent in [[T-4E9T-yaml-parity-glob-skips-peerless-fixtures]] —
   decide at impl).
4. Run against the shipped `dialect.yaml` to confirm green on the already-verified
   category.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `tests/catalog-parity.test.ts` | new | Glob `docs/catalog/*.yaml`, assert each entry's `artifact` equals its `example-catalog.md` sketch byte-for-byte. |
| `tests/harness.ts` | modify | Optional: a shared loader/extractor helper if the markdown sketch extraction is reusable. |

## Acceptance criteria

- [ ] AC-1: `tests/catalog-parity.test.ts` exists and is discovered by `vitest run` (matched by the `tests/**/*.test.ts` glob).
- [ ] AC-2: For every entry in every `docs/catalog/*.yaml`, the test asserts the entry's `artifact` matches the corresponding `docs/example-catalog.md` sketch byte-for-byte; the test passes against the current `dialect.yaml`.
- [ ] AC-3: Deliberately editing one byte of a YAML `artifact` (or its markdown sketch) makes the test — and the PR — fail.
- [ ] AC-4: The test requires no per-category edit to cover a newly added `docs/catalog/<category>.yaml` — adding the file is enough for its entries to be checked.

## Out of scope

- Authoring the remaining category YAMLs — those are the sibling M-0007 tasks ([[T-CCLI-catalog-cli]], [[T-CCON-catalog-consume-as-data]], [[T-CEMB-catalog-embed-and-ci]], etc.).
- Validating that each `artifact` reproduces real library behavior (that is each category task's own AC-3); this test only checks YAML↔markdown text parity.
- The TS-fixture↔`.contract.yaml` parity already covered by [[T-4E9T-yaml-parity-glob-skips-peerless-fixtures]].

## Dependencies

- Soft: lands most value once more than one category YAML exists, but can ship now against `dialect.yaml` and accrete coverage as the sibling category tasks merge. No hard `depends_on`.

## Discovery context

Spawned from the `## Post-mortem` → `### Friction and automation gaps` of
[[T-CDIA-catalog-dialect]] on 2026-06-30 (UTC) by the spawn-from-post-mortem
procedure, in https://github.com/sksizer/markdown-contract.

### Dedup search (spawn-from-post-mortem)

Bullet: Nothing keeps a `docs/catalog/*.yaml` artifact in sync with its `docs/example-catalog.md` source; byte-equality was verified here with a throwaway script — add a corpus parity test that asserts each catalog YAML `artifact` matches its example-catalog.md sketch, once more categories land.
Keywords searched: example-catalog, byte-equality, categories, throwaway, artifact, verified, nothing, catalog
Excluded: T-CDIA-catalog-dialect
Top candidates (score / status / headline):
  - 44 / planning/proposed / T-CTLG-example-catalog-finalize — Finalize the example use-case catalog as verified, structured data
  - 35 / open/ready / T-CCLI-catalog-cli — Finalize the CLI Quickstart catalog category as verified YAML (`cli`)
  - 32 / open/ready / T-CCON-catalog-consume-as-data — Finalize the Consume-as-Typed-Data catalog category as verified YAML (`consume-as-data`)
  - 32 / open/ready / T-CEMB-catalog-embed-and-ci — Finalize the Embed-and-Automate catalog category as verified YAML (`embed-and-ci`)
  - 32 / open/ready / T-CINF-catalog-inference-init — Finalize the Scaffold-and-Guard catalog category as verified YAML (`inference-init`)
Decision: SPAWNED (override of the script's LINKED-EXISTING → T-CTLG-example-catalog-finalize).
Rationale: Candidates scored on shared catalog vocabulary. T-CTLG is the *parent* umbrella that produces the catalog; the category tasks each emit one YAML. None adds a CI/test guard asserting YAML↔markdown parity. [[T-4E9T-yaml-parity-glob-skips-peerless-fixtures]] (closed) is TS-fixture↔`.contract.yaml` parity — a different artifact pair. Genuinely new test work.
