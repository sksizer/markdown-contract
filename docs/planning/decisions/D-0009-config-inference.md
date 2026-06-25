---
type: decision
schema_version: '1'
id: D-0009
status: open/proposed
title: Config inference — scaffolding a tight-but-accepting config from existing docs
created: '2026-06-24'
related:
  - '[[C-0008-config-scaffolding]]'
  - '[[C-0006-declarative-yaml-contracts]]'
  - '[[C-0007-declarative-corpus-meta-config]]'
  - '[[C-0003-corpus-cli]]'
  - '[[C-0005-two-plane-contract-engine]]'
  - '[[D-0008-declarative-contract-dsl]]'
  - '[[D-0007-engine-scope-and-fidelity]]'
  - '[[D-0006-packaging]]'
tags:
  - yaml
  - declarative
  - config
  - inference
  - scaffolding
  - init
need_human_review: true
---

# Config inference — scaffolding a tight-but-accepting config from existing docs

## Summary

- `markdown-contract init <dir>…` infers a runnable config from the markdown already in the target directories. Two paths: **(1)** a **single contract** for one directory — the *tightest contract that still accepts every markdown file in its subtree*; and **(2)** a **meta-config across a tree**, which cuts the directory tree at a configurable **depth** and gives every directory at that cut a contract covering all markdown beneath it. It realizes [[C-0008-config-scaffolding]]. ^summary
- **Grouping is by directory, with `--depth` as the granularity knob.** Directory structure is the one grouping that needs no convention in the documents *and* is exactly what the runtime routes on (globs over paths, first-match-wins — [[C-0003-corpus-cli]]). Depth 0 is one contract for the whole tree; depth 1 is a contract per top-level subdirectory; deeper cuts give finer contracts. This is deliberately general — it does **not** key on a frontmatter `type` field or a filename id scheme (those are specific to corpora like this repo's, not a pattern to bake into the tool).
- **Generalization target: as tight as possible while still accepting every current file** (the accept-by-construction bound). Concretely: enumerate *all* observed sections (required = present in every file, the rest `optional:`), set `allowUnknown: false` when no unlisted section ever appeared, set `order` to the strongest order consistent with every file, and type each frontmatter field as specifically as its observed values allow. A **`--relax`** dial inverts this toward a permissive floor for those who prefer to start loose and ratchet up.
- **Value-type inference is bounded by accept-all, then as tight as the data permits**: `const` when a value is uniform, `format`/`number`/`boolean`/`array` when every value fits, an `enum` of the observed values when they form a small closed set, else `type: string` — always admitting at least every value seen. The tightness is intentional: a future doc that doesn't fit is a **drift signal**, not a tool failure (`--check`), and the config is re-runnable and `--relax`-able.
- The inferer is a **producer** of [[C-0006-declarative-yaml-contracts]] / [[C-0007-declarative-corpus-meta-config]] YAML and then a **consumer** of its own output (it loads the scaffold back through the same loaders and runs it for the self-check). It adds no format and no engine surface, and respects the read-only posture of [[D-0007-engine-scope-and-fidelity]] (it writes only the config it was asked to create, never edits the docs).

## Context

[[C-0006-declarative-yaml-contracts]] and [[C-0007-declarative-corpus-meta-config]] let a consumer *author* contracts as data. But adopting them on an existing body of docs still means reading every file, finding the common section spine and frontmatter keys, and hand-writing the YAML. That hand-work is mechanical and repeatable: walk → parse → generalize → emit. This decision fixes the algorithm so a single `markdown-contract init <dir>…` produces a runnable config that accepts the corpus it was inferred from — the bootstrap on-ramp [[C-0008-config-scaffolding]] promises — on **any** markdown corpus.

Generality is the point. An earlier draft grouped files by a frontmatter `type` field and a `PREFIX-` filename token; review correctly flagged that as tied to this repo's own SDLC docs, not a generally useful pattern. The general grouping that needs no convention in the documents — and that matches how the runtime already routes — is the **directory tree itself**, with depth controlling how finely it is cut. Frontmatter and filenames are inputs to *generalization* (what the contract says), not to *grouping* (which files share a contract).

The building blocks already exist: `parse(src) → DocTree` is exported from `core` and yields the section tree and parsed frontmatter **without a contract** (exactly the inference input); the runner already walks a tree for `*.md`; and the loaders round-trip the YAML the inferer emits. So the work is wiring and policy, not new engine machinery — and this decision is about the policy: the modes, the depth cut, how tight to generalize, and what to infer about values. It ships standalone over the declarative format and changes neither the engine nor the format ([[D-0008-declarative-contract-dsl]]).

## Decision

### The shape — and the one invariant that defines "relaxed enough"

`init` is a pure pipeline with one defining guarantee:

> **Accept-by-construction.** Running the generated config over the corpus it was inferred from reports **zero findings.** This is the floor under "as tight as possible": generalization tightens freely, but never past the point where a *current* file would fail. It is *verified*, not assumed (§ Self-check).

The pipeline:

```text
discover ─→ parse ─→ group ─→ generalize ─→ infer field schemas ─→ emit ─→ self-check
 (*.md)    (DocTree)  (by dir   (tightest contract   (value types)      (YAML)   (run → 0 findings)
                       & depth)   that accepts all)
```

### Two modes

| Mode | Invocation | Output | Grouping |
|---|---|---|---|
| **Single contract** | `init <dir>` | one `*.contract.yaml` | the whole subtree → one group |
| **Meta-config** | `init <dir> --meta [--depth N]` | `markdown-contract.yaml` + `contracts/*.yaml` | each directory at the depth cut → one group |

The modes are one mechanism at two granularities: single-contract is the meta-config with the cut at the root (depth 0). `--meta` is what asks for the router + per-directory files.

### Step 1 — Discover & parse

Walk the target directories for `*.md` (the runner's existing walk), honoring the same `--glob` / `--include` / `--exclude` scoping as `validate` so a run can exclude fixtures or drafts up front. Parse each file with `parse` and extract the two inference inputs: the **parsed frontmatter** map, and the **section spine** (top-level heading names, in document order). A file that fails to parse is reported and skipped (it cannot constrain a contract that must accept it). Nested subsections are recorded but, in v1, only the top-level spine drives the contract (§ Out of scope).

### Step 2 — Group by directory and depth

The runtime routes a file to a contract by **glob over its path**, first match wins ([[C-0003-corpus-cli]]). Directory structure is therefore the natural grouping: it is always expressible as routing, and unlike a frontmatter field or filename scheme it requires **no convention in the documents**.

> **Group each file by its containing directory, cut at `--depth N`.** A file is assigned to its ancestor directory at depth `N` (the target root is depth 0), or to its own containing directory if that is shallower than `N`. Each group becomes one contract; the group's glob covers the markdown it owns and the rules are ordered most-specific-path-first so first-match-wins routes every file to its group.

- **Depth 0** → one group (the whole tree) → the single-contract mode.
- **Depth 1** → one group per top-level subdirectory, plus a group for files sitting directly in the root.
- **Depth N** → directories deeper than `N` are absorbed into their depth-`N` ancestor; directories shallower than `N` that hold files directly form their own (clamped) group.

A group's glob is recursive (`<reldir>/**/*.md`) when no deeper group lives in its subtree, and direct-only (`<reldir>/*.md`, or `*.md` for the root) when deeper groups do — so the globs partition the corpus cleanly and first-match-wins is unambiguous. Each group's contract is generalized over exactly the files routed to it. Contracts are **named after their directory** — the group dir's path relative to the root, slugified (`api`, `api-v1`, `web-v1`) — which is inherently unique, so there is no de-collision step; the name is just a label the author can rename. No document attribute is ever consulted for routing or naming.

This is intentionally general. It does not reproduce a type-per-contract split unless document types happen to line up with directories — which, when they do (as in this repo's `docs/planning`), falls out for free, and when they don't, is not something path routing could honor anyway.

### Step 3 — Generalize a group to the tightest accepting contract

For each group, derive the **tightest contract that still accepts every file in it**. Each choice tightens up to the accept-all bound:

- **Sections — enumerate all observed; require the universal, optional the rest.** A section is **required** iff it appears in *every* file of the group; every other section name seen in *any* file is emitted `optional: true`. The contract thus lists the group's complete observed vocabulary, enforcing the universal core and admitting the rest.
- **Unknown sections — closed when the data is closed.** Emit `allowUnknown: false` (so a section never seen in the group is flagged) — this is safe because every observed section is already listed. `--relax` sets `allowUnknown: true`.
- **Order — the strongest order consistent with every file.** Emit `order: strict` only when every file has the identical gap-free section sequence; emit `order: recognized-relative` when all files agree on the relative order of the sections they share; otherwise `order: none`. The detected order also fixes the emitted section list order.
- **Frontmatter — strict when the key set is closed.** Required fields = keys present in *every* file; fields present in only some are `optional: true`. Emit `strict: true` when no file carried a key outside the observed set; else `strict: false`. Field value types come from Step 4.

`--relax` inverts these to the permissive floor — `order: none`, `allowUnknown: true`, non-strict frontmatter, everything-non-universal optional, loosest value types — for authors who prefer to start loose and tighten by hand. A degenerate group is still correct either way: a single-file group generalizes to that file's exact shape; a heterogeneous group yields a small required core with much optional.

### Step 4 — Infer a field's schema (tight-but-accepting value ladder)

For each frontmatter field, collect its observed values across the group and pick the **most specific schema that admits every observed value**, defaulting looser only when no tighter rung fits:

1. All values **identical** → `{ const: <value> }`.
2. Else all values are **valid numbers** → `{ type: number }` (`int: true` if all integers; `min`/`max` only under `--infer-bounds`).
3. Else all values are **booleans** → `{ type: boolean }`.
4. Else all values are **arrays** → `{ type: array, of: <recursively inferred element schema> }`.
5. Else all (string) values match one **`format`** from the [[D-0008-declarative-contract-dsl]] set (`date`, `datetime`, `email`, `url`, `uuid`, …) → `{ type: string, format: <name> }` (most specific match; `date` before `datetime`).
6. Else the **distinct values form a small closed set** — ≤ 12 distinct values *and* fewer than half the file count, so it is clearly categorical rather than coincidentally repetitive → `{ enum: [<observed values>] }`. (A consequence: tiny corpora rarely enum — too few files to clear the ratio — which is the right call on thin evidence.)
7. Else → `{ type: string }`.

Every rung admits at least every value seen, so it cannot break accept-by-construction. `enum` (rung 6) is the deliberate tight default for categorical fields — it admits exactly the observed set and flags a novel value as drift; `--relax` drops rung 6 (categorical fields stay `type: string`). `pattern` and numeric/length `min`/`max` are **not** inferred by default (they over-fit string shape); `--infer-bounds` opts into them.

### Step 5 — Emit

- **Single-contract mode** writes one `<dir>.contract.yaml`. **Meta-config mode** writes a `markdown-contract.yaml` plus one `contracts/<dir-name>.contract.yaml` per group — the [[C-0007-declarative-corpus-meta-config]] offramp shape — or, with `--inline`, a single self-contained config with each contract inlined on its rule.
- **Globs** follow Step 2 (directory-derived, recursive or direct-only per the depth cut), written relative to the run root (the [[D-0008-declarative-contract-dsl]] two-bases rule: contract *paths* relative to the config file, *globs* relative to the run root). **Rules** are ordered most-specific-path-first for first-match-wins, deterministic otherwise so re-runs diff cleanly.
- Generated files carry a header comment marking them a snapshot (`# generated by \`markdown-contract init\` — a tight snapshot; tighten or --relax by hand`).

### Step 6 — Self-check (the accept-by-construction guarantee)

After emitting, **load the scaffold back** through `loadConfig` / `loadContract` and run it over the corpus via `runCorpus`. The result **must be zero findings**; if it is not, that is an inferer bug (some emitted constraint is tighter than the data allows), and `init` reports it loudly rather than writing a config that rejects its own corpus. This doubles as the capability's strongest test (golden round-trip: `init <dir>` → run → clean) and validates the inferer against the very loaders it targets.

`--check` runs the *verification half only* against an **existing** config (no inference, no write): does the current config still accept the tree? A non-zero exit means a doc drifted from the inferred shape — a CI drift guard, and the natural complement to a tight snapshot.

### The CLI surface

A new `init` verb on the existing binary ([[C-0003-corpus-cli]]):

```text
markdown-contract init <dir>…           one or more target roots (required)

  --meta                emit a meta-config + per-directory contracts (default: single contract)
  --depth <N>           directory cut for --meta (default 1; 0 = single contract)
  --out <dir>           where to write (default: cwd)
  --inline              one self-contained config instead of meta-config + contracts/ files
  --relax               loosen generation toward a permissive floor (order:none, allowUnknown,
                        non-strict frontmatter, no enums, loosest value types)
  --glob/--include/--exclude <glob>   scope which files feed inference (as in `validate`)
  --force               overwrite an existing config (default: refuse)
  --dry-run             print the would-be files to stdout; write nothing
  --check               verify an existing config still accepts the tree; infer/write nothing
  --infer-bounds        opt into pattern / min / max inference (off by default — over-fits)
```

`init` only ever *adds* a config and never edits the source docs (read-only on the corpus, per [[D-0007-engine-scope-and-fidelity]]); it refuses to clobber an existing config without `--force`.

### Idempotence & re-runs

Inference is **deterministic** (stable group order from the directory walk, stable rule/field/section order), so re-running on an unchanged corpus is a no-op diff. There is no automatic *merge* into a hand-tightened config in v1 — re-running regenerates the snapshot and the author diffs/applies by hand. (A merge mode — regenerate, then re-apply manual tightenings — is a possible future, § Out of scope.)

## Why

- **Directory + depth is the one general grouping.** It needs no convention in the documents, works on any corpus, and is exactly what the runtime routes on — so the generated config can never describe routing a glob can't perform. Keying on a frontmatter `type` or filename scheme would tie the tool to corpora shaped like ours.
- **Depth is one knob for the whole granularity spectrum.** The same corpus yields one broad contract or a fine per-directory mesh by changing a single integer — no per-type configuration, no taxonomy to maintain.
- **As tight as possible, bounded by accept-all, is the useful default.** A maximally-loose stub tells the author almost nothing; a tight snapshot captures the structure the files actually share and turns the contract into a real description (and, via `--check`, a drift tripwire). The accept-all bound keeps it from ever rejecting a file it was built from; `--relax` serves the start-loose preference.
- **Tightness that flags novel input is a feature, not a bug.** A future doc that doesn't fit the snapshot is surfaced as drift, which is the point of a contract; the config is re-runnable and relaxable, so tightness is cheap to walk back.
- **Producer of the formats, not a new one.** Emitting [[C-0006-declarative-yaml-contracts]] / [[C-0007-declarative-corpus-meta-config]] YAML and loading it back keeps one source of truth and lets the inferer ride every future format addition for free.

## Consequences

- A new code path in the `markdown-contract/declarative` front-end (an `init`/`infer` module) plus an `init` verb in the CLI; imports stay one-way `cli → runner → core` per [[D-0006-packaging]]; the engine and the format are untouched.
- **Contracts follow the filesystem, not semantics.** Grouping by directory means a contract's scope is a directory subtree; where document *types* don't line up with directories, one contract may span several types (looser, but correct) or one type may split across directories. That is the cost of a convention-free, route-faithful grouping; the author reorganizes directories, picks a different `--depth`, or hand-edits. Semantic (e.g. frontmatter-`type`) grouping is explicitly **not** in scope (Options considered).
- **A tight snapshot can flag future-but-valid docs.** This is intended (drift signal) and bounded (never rejects a current file); `--relax` and re-running are the escape valves. Documented in the generated header and the capability ([[C-0008-config-scaffolding]]).
- The inferer **depends on its own output loaders** (round-trips through `loadConfig` / `loadContract` for the self-check) — a deliberate, healthy coupling that makes the golden round-trip (`init` a corpus → run → zero findings) the capability's backbone test.
- Adds no new runtime dependency (YAML serialization uses the `yaml` package already present for the loaders).

## Options considered

### Grouping key — directory + depth (chosen) vs frontmatter `type` / filename scheme vs single contract

- **Directory + depth (chosen).** Convention-free, general to any corpus, and routable by construction (the runtime routes by path). Depth is one knob for granularity.
- **Frontmatter `type` / filename id-prefix (rejected).** An earlier draft used these; review flagged them as specific to this repo's SDLC docs, not a general pattern. They also can't be the routing key in general — two types sharing a directory with no filename distinction can't be separated by any path glob. They belong to *generalization* (the contract's content), not *grouping*. (Also considered: letting a uniform frontmatter `type` cosmetically *name* a contract — dropped, since names are directory-derived and the author can rename freely, so no frontmatter is consulted at all.)
- **Always a single contract (offered as the default mode / depth 0).** Simplest, but on a deep or mixed tree the one contract's required core collapses to the universal intersection — coarse. Good for a quick floor; depth exists precisely to do better.

### Granularity — a depth cut (chosen) vs one contract per leaf directory vs flat

A **depth cut** (chosen) lets one knob span "whole tree" to "every directory", and clamps cleanly for shallow branches. One-contract-per-leaf-directory is just the deepest cut (`--depth ∞`) — available, but rarely the right default (too many tiny contracts). A flat "one contract per immediate child, no recursion" is `--depth 1` with non-recursive globs — a special case the depth model already covers.

### Generalization tightness — tight-but-accepting (chosen) vs loosest floor

An earlier draft defaulted to the *loosest* accepting contract (everything optional, `order: none`, `allowUnknown: true`, no enums) — a floor to tighten by hand. Review asked for "as tight as possible but relaxed enough for all to pass", so the default is now the **tightest contract consistent with the corpus** (enumerated sections, detected order, closed unknowns, categorical enums), with the loose floor available as **`--relax`**. The tight default produces a contract that actually describes the docs; the accept-all bound keeps it honest; `--relax` preserves the start-loose path. The brittleness of tightness (flagging novel-but-valid docs) is accepted as a drift signal, not avoided.

### Value inference — tight-but-accepting incl. enums (chosen) vs lossless-only

The tight default infers `enum` from a small closed value set and `const`/`format` where they fit — the tightest schema admitting every observed value. The looser alternative (only `const`/`format`/scalar types, never `enum`) is what `--relax` selects. `pattern` and numeric/length bounds stay opt-in (`--infer-bounds`) in both, since they over-fit even relative to the observed data.

### Output — meta-config + files (default for `--meta`) vs single inline config

Both first-class in [[C-0007-declarative-corpus-meta-config]]; `--meta` defaults to the **meta-config + `contracts/` files** offramp shape (what you tighten file-by-file), with `--inline` for the single-file on-ramp on small trees. Single-contract mode just writes the one contract file.

### Verb name — `init` (chosen) vs `infer` / `scaffold` / `generate`

`init` is the familiar "bootstrap a config here" verb (npm, git, tsc), which is what the user *intends*; *inference* is the mechanism, not the user-facing name. *Resolved: `init`.*

## Open questions

Resolved in review (recorded here for provenance):

- **Default `--depth`** — *resolved*: **1** (one contract per top-level subdirectory; files directly in the root form their own group). Depth 0 == single-contract mode.
- **Contract naming** — *resolved*: always the directory's **full relative-path slug** (`api`, `api-v1`, `web-v1`) — inherently unique, so no de-collision rule; the name is just a label the author can rename. No frontmatter is consulted for naming.
- **`enum` threshold** — *resolved*: a field becomes an `enum` only when its distinct values number **≤ 12 and fewer than half the files**.
- **`order` detection** — *resolved*: `strict` only when every file has the identical gap-free sequence; `recognized-relative` when files agree on relative order; else `none`.
- **Re-run behavior** — *resolved*: **regenerate; refuse to overwrite without `--force`**; a smart merge that preserves hand-tightenings is future work (§ Out of scope).
- **Verb spelling** — *resolved*: **`init`**.

Still open:

- **Glob shape at the cut** — the recursive-vs-direct-only rule for clamped shallow groups and the exact first-match ordering; corner cases (a directory with both direct files and deeper groups) to nail in implementation.
- **Meta-schema reuse** — whether the self-check should also validate the *emitted YAML* against the format's own meta-schema ([[D-0008-declarative-contract-dsl]] § Open questions) once that exists.

## Out of scope

- **Semantic grouping** — grouping by frontmatter `type` or a filename id scheme: not a general pattern, not routable in general, and out (frontmatter informs *generalization*, not *grouping*).
- **`pattern` / `min` / `max` inference by default** — opt-in via `--infer-bounds`; over-fits even the observed data.
- **Content-plane inference** — `table` / `list` leaves from uniform section blocks: future work, not v1.
- **Cross-cutting `rule` / `docRule` inference** — out, mirroring [[D-0008-declarative-contract-dsl]] (rules aren't in the v1 YAML at all).
- **Editing the source documents** — `init` is read-only on the corpus and only writes the config it is asked to create ([[D-0007-engine-scope-and-fidelity]]); it never "fixes" docs to fit a contract.
- **Merging into a hand-tightened config** — v1 regenerates and the author diffs; an automatic merge mode is a possible future.
- **Non-top-level structure** — v1 infers the top-level section spine only; deep nested section grammars are future work (directory *depth* is handled; section *nesting* is not).

## References

- [[C-0008-config-scaffolding]] — the capability this decision realizes (the `init` command).
- [[C-0006-declarative-yaml-contracts]] — the contract format `init` emits.
- [[C-0007-declarative-corpus-meta-config]] — the meta-config format `init` emits, and the inline ↔ file-ref duality `--inline` exposes.
- [[C-0003-corpus-cli]] — the binary `init` adds a verb to, and the glob-routing (first-match-wins) that makes directory the natural grouping.
- [[C-0005-two-plane-contract-engine]] — the runtime whose `parse` supplies the inference input and whose `runCorpus` powers the self-check.
- [[D-0008-declarative-contract-dsl]] — the format and `format`-set this produces, the two-bases path/glob rule, and the vocabulary it draws on.
- [[D-0007-engine-scope-and-fidelity]] — the read-only posture `init` inherits (writes config, never edits docs).
- [[D-0006-packaging]] — the one-package / one-way layering the inferer respects.
