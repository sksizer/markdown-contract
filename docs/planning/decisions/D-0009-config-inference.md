---
type: decision
schema_version: '1'
id: D-0009
status: open/proposed
title: Config inference — scaffolding a relaxed starting config from existing docs
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

# Config inference — scaffolding a relaxed starting config from existing docs

## Summary

- `markdown-contract init <dir>…` infers a **relaxed starting config** from the markdown already in the target directories: it parses each file, clusters the files into document types, generalizes each cluster to the **loosest contract that still accepts every file in it**, and writes a meta-config + per-type contract files. The corpus passes the generated config by construction, verified by a self-check. This mechanizes exactly the hand-work that produced this repo's dogfood config; it realizes [[C-0008-config-scaffolding]]. ^summary
- The output is a **scaffold, not a finished contract**. Three loosening defaults make "accepts the corpus" a guarantee, not a hope: bodies are `order: none` + `allowUnknown: true`; a section is **required only if present in *every* file** of its group (everything else observed is emitted `optional:`); frontmatter is `strict: false` with **required fields = the intersection of keys**. The author tightens from there — this is the on-ramp half of the project's "trivial to start, elegant offramps" principle.
- **Grouping is fundamentally by path**, because the runtime routes by glob (first-match-wins over file paths — [[C-0003-corpus-cli]]). Files are clustered by their *path signature* — containing directory plus any `PREFIX-` filename token — and each cluster is **named** by its uniform frontmatter `type` (falling back to the prefix or directory name). Frontmatter `type` informs naming and a consistency check, but it is never the routing key, since no path glob can separate two types that share a directory.
- **Value-type inference is conservative and lossless by default.** A frontmatter field becomes a `const` only when its value is identical across the group; `format: date` / `datetime` / etc. only when *every* value matches; `type: number` / `boolean` / `array` only when every value fits — otherwise it stays `type: string`. Tightening inferences that could reject a future-but-valid value (`enum` from an observed set, `pattern`, `min`/`max`, content-plane leaves) are **opt-in flags**, never on by default.
- The inferer is a **producer** of [[C-0006-declarative-yaml-contracts]] / [[C-0007-declarative-corpus-meta-config]] YAML, then a **consumer** of its own output (it loads the scaffold back through the same loaders and runs it for the self-check). It adds no format and no engine surface; it respects the read-only posture of [[D-0007-engine-scope-and-fidelity]] (it only *writes the config it was asked to create*, never edits the docs).

## Context

[[C-0006-declarative-yaml-contracts]] and [[C-0007-declarative-corpus-meta-config]] let a consumer *author* contracts as data. But adopting them on an existing body of docs still means reading every file, finding the common section spine and frontmatter keys, and hand-writing the YAML — precisely what was done to produce this repo's dogfood config (`markdown-contract.yaml` + `contracts/*.contract.yaml` over `docs/planning`, 33 docs across six types). That hand-work is mechanical and repeatable: walk → parse → intersect → emit. This decision fixes the algorithm and its specifics so a single `markdown-contract init <dir>…` produces a runnable, relaxed config that accepts the corpus it was inferred from — the bootstrap on-ramp [[C-0008-config-scaffolding]] promises.

The building blocks already exist: `parse(src) → DocTree` is exported from `core` and yields the section tree and parsed frontmatter **without a contract** (exactly the inference input); the runner already walks a tree for `*.md`; and the loaders already round-trip the YAML the inferer will emit. So the work is wiring and policy, not new engine machinery. The hard part — and what this decision is for — is the *policy*: how to group files, how loose to be, what to infer about values, and how to project semantic types back onto the glob routing the runtime actually uses.

This is a tooling capability over the declarative format; it ships standalone and does not change the engine or the format ([[D-0008-declarative-contract-dsl]]).

## Decision

### The shape — and the one invariant that defines "relaxed enough"

`init` is a pure pipeline with one defining guarantee:

> **Accept-by-construction.** Running the generated config over the corpus it was inferred from reports **zero findings.** This is the definition of "relaxed enough", and it is *verified*, not assumed (§ Self-check).

The pipeline:

```text
discover ─→ parse ─→ group ─→ generalize ─→ infer field schemas ─→ emit ─→ self-check
 (*.md)    (DocTree)  (types)  (loose contract)   (value types)      (YAML)   (run → 0 findings)
```

Everything below is the policy at each stage; the invariant is what every default is chosen to preserve.

### Step 1 — Discover & parse

Walk the target directories for `*.md` (the runner's existing walk), honoring the same `--glob` / `--include` / `--exclude` scoping as `validate` so a run can exclude fixtures or drafts up front. Parse each file with `parse` and extract the two inference inputs: the **parsed frontmatter** map, and the **section spine** (top-level heading names, in document order). A file that fails to parse is reported and skipped (it cannot constrain a contract that must accept it). Nested subsections are recorded but, in v1, only the top-level spine drives the contract (§ Out of scope).

### Step 2 — Group files into document types

The runtime routes a file to a contract by **glob over its path**, first match wins ([[C-0003-corpus-cli]]). So grouping must ultimately be expressible as path globs — which forces the central decision:

> **Group by path signature; name by frontmatter `type`.** Cluster files that share a *path signature* = `(containing directory, filename PREFIX- token)`. Derive the group's **name** from the frontmatter `type` value when it is uniform across the cluster, else from the prefix token (lowercased), else from the directory basename.

Concretely, the default (`--group auto`):

1. For each file, compute its **prefix token**: if the basename matches `^([A-Za-z]+)-` capture the token (`C`, `DR`, `T`, …); else none.
2. Cluster files sharing `(directory, prefix-token)`. Within a directory that has no prefix tokens at all, the cluster is the directory.
3. **Name** each cluster: uniform frontmatter `type` → that value; else the prefix token lowercased; else the directory basename.
4. **Emit globs** per cluster (§ Step 5): prefer the location-independent prefix form `['**/<PREFIX>-*.md', '<PREFIX>-*.md']` when a prefix exists; else the directory form `['<reldir>/**/*.md']`.

This reproduces the dogfood config from `docs/planning` exactly (one contract per `C-`/`D-`/`DR-`/`M-`/`PR-`/`T-` prefix, named from the `type:` constant).

**Why path, not frontmatter `type`, is the routing key.** It is tempting to group by the semantic `type:` field. But if two types share a directory and have no distinguishing filename prefix, *no path glob can separate them* — first-match-wins would hand both to whichever rule sorts first. So `type` cannot be the routing key in the general case. It earns its keep elsewhere: as the **group name**, and as a **consistency check** — if a path cluster mixes frontmatter `type` values, or if one `type` is split across path clusters that globs can't cleanly separate, `init` **warns** and explains that path routing can't mirror the semantic types (the author resolves by moving/renaming, accepting the path split, or re-running with `--group single`).

Overrides: `--group dir` (directory only), `--group prefix` (filename prefix only), `--group type` (by frontmatter `type`, emitting globs *derived* from where those files actually live, with the interleave warning above), `--group single` (one contract for the whole corpus — the universal intersection; loosest and simplest).

### Step 3 — Generalize a cluster to a relaxed contract

For each group, derive the loosest contract that accepts every member. Three policies, each chosen to preserve accept-by-construction:

- **Body order & unknowns — always loosest.** Emit `order: none` and `allowUnknown: true`. Ordering and extra sections can then never produce a finding; the scaffold constrains *presence*, nothing else, until the author tightens.
- **Required vs optional sections — intersection required, union optional.** A section is **required** iff it appears in *every* file of the group (the intersection of spines). Every other section name observed in *any* file is emitted with `optional: true` (the union minus the intersection). The scaffold thus documents the *whole observed vocabulary* while only enforcing the universal core — richer than a bare intersection, still guaranteed to accept every file. Section ordering in the emitted list follows the most common observed order (a stable, readable default; with `order: none` it is cosmetic).
- **Frontmatter — non-strict, intersection required.** Emit `strict: false` (rich, varied frontmatter passes through). Required fields = keys present in *every* file; fields present in only some are emitted `optional: true`. Field value types come from Step 4.

A degenerate cluster is still correct: a single-file group generalizes to that file's full shape; a wildly heterogeneous group collapses to an empty required spine with everything optional — loose, but valid and accepting.

### Step 4 — Infer a field's schema (conservative value-type ladder)

For each frontmatter field, collect its observed values across the group and pick the **most specific schema that loses nothing and rejects no observed value**, defaulting to loose:

1. All values **identical** → `{ const: <value> }`. (Captures a discriminator like `type: decision` precisely.)
2. Else all values are **valid numbers** → `{ type: number }` (`int: true` if all integers).
3. Else all values are **booleans** → `{ type: boolean }`.
4. Else all values are **arrays** → `{ type: array, of: { type: string } }` (element schema kept loose).
5. Else all (string) values match one **`format`** from the [[D-0008-declarative-contract-dsl]] set — `date`, `datetime`, `time`, `email`, `url`, `uuid`, … — → `{ type: string, format: <name> }`. (First/most-specific match; `date` before `datetime`.)
6. Else → `{ type: string }`.

Crucially, **no tightening inference is on by default**: a field with a small distinct value set is *not* turned into an `enum` (a future-but-valid value would be rejected), and `pattern` / `min` / `max` are never synthesized. These are opt-in (§ The CLI surface). The ladder only ever emits facts that are true of *every* observed value and that admit at least as much as the data shows — so it cannot break accept-by-construction.

### Step 5 — Emit

- **Default output: the offramp shape.** A `markdown-contract.yaml` meta-config plus one `contracts/<name>.contract.yaml` per group, mirroring the dogfood layout — readable, diffable, and the natural thing to tighten file-by-file. `--inline` instead emits a single self-contained config with each contract inlined on its rule (the [[C-0007-declarative-corpus-meta-config]] on-ramp form) for small corpora.
- **Rules** are ordered to respect first-match-wins: more specific globs before more general ones (e.g. `DR-*` before `D-*` even though they don't overlap — the dogfood config's own ordering note), and a deterministic order otherwise so re-runs diff cleanly.
- **Glob synthesis** follows Step 2: prefix form when available, else directory form, both written relative to the run root (the [[D-0008-declarative-contract-dsl]] two-bases rule — contract *paths* are relative to the config file, *globs* to the run root). When `--group type` forces a non-path key, globs are the minimal covering set of the files' actual locations, emitted with a comment that they are derived.
- Generated files carry a header comment marking them as a scaffold (`# generated by \`markdown-contract init\` — a starting point; tighten by hand`).

### Step 6 — Self-check (the accept-by-construction guarantee)

After emitting, **load the scaffold back** through `loadConfig` / `loadContract` and run it over the corpus via `runCorpus`. The result **must be zero findings**; if it is not, that is an inferer bug (some emitted constraint is tighter than the data), and `init` reports it loudly rather than writing a config that rejects its own corpus. This doubles as the capability's strongest test (golden round-trip: `init docs/planning` → run → clean) and validates the inferer against the very loaders it targets.

`--check` runs the *verification half only* against an **existing** config (no inference, no write): does the current config still accept the tree? A non-zero exit means a doc drifted from the inferred shape — a CI drift guard. (`validate` already does this; `--check` is the ergonomic alias scoped to "the config init would manage".)

### The CLI surface

A new `init` verb on the existing binary ([[C-0003-corpus-cli]]):

```text
markdown-contract init <dir>…           one or more target roots (required)

  --out <dir>            where to write (default: cwd)
  --inline              one self-contained config instead of meta-config + contracts/ files
  --group <strategy>    auto (default) | dir | prefix | type | single
  --glob/--include/--exclude <glob>   scope which files feed inference (as in `validate`)
  --force               overwrite an existing config (default: refuse)
  --dry-run             print the would-be files to stdout; write nothing
  --check               verify an existing config still accepts the tree; infer/write nothing

  # opt-in tightening (off by default — each can reject future-but-valid input):
  --infer-enums[=N]     closed enum when a field's distinct values ≤ N (default N small)
  --infer-content       infer content-plane leaves (tables/lists) when uniform across a group
```

`init` only ever *adds* a config and never edits the source docs (read-only on the corpus, per [[D-0007-engine-scope-and-fidelity]]); it refuses to clobber an existing config without `--force`.

### Idempotence & re-runs

Inference is **deterministic** (stable group order, stable rule/field/section order), so re-running on an unchanged corpus is a no-op diff. There is no automatic *merge* into a hand-tightened config in v1 — re-running regenerates the scaffold and the author diffs/applies by hand. (A merge mode — regenerate, then re-apply manual tightenings — is a possible future, § Out of scope.)

## Why

- **The hand-work is mechanical, so mechanize it.** The dogfood config was produced by exactly this pipeline by hand; turning it into a command removes the single biggest cost of adopting contracts on existing docs.
- **"Relaxed enough" must be a guarantee, not a hope.** Defining the target as *accept-by-construction* and *verifying it with the real loaders* (§ Self-check) is what makes the output trustworthy: the scaffold provably runs clean before the author ever sees it.
- **Route by path because the runtime routes by path.** Grouping by path signature (and only *naming* by `type`) keeps the generated config honest — it can never emit routing a glob can't actually perform — and reproduces the dogfood shape on the obvious corpus.
- **Default loose; tighten by hand.** Every loosening (`order: none`, `optional:` over required, `string` over `enum`, non-strict frontmatter) avoids the one failure that would make the tool useless: a "starting" config that rejects the docs it was built from. Tightening is cheap and human; over-constraining is the tool's cardinal sin.
- **Producer of the formats, not a new one.** Emitting [[C-0006-declarative-yaml-contracts]] / [[C-0007-declarative-corpus-meta-config]] YAML and loading it back keeps one source of truth and lets the inferer ride every future format addition for free.

## Consequences

- A new code path in the `markdown-contract/declarative` front-end (a `init`/`infer` module) plus an `init` verb in the CLI; imports stay one-way `cli → runner → core` per [[D-0006-packaging]]; the engine and the format are untouched.
- The inferer **depends on its own output loaders** (it round-trips through `loadConfig` / `loadContract` for the self-check) — a deliberate, healthy coupling that makes the golden round-trip test (`init` a corpus → run → zero findings) the capability's backbone.
- **Conservative-by-default means the scaffold is loose.** Users who want tighter output must opt in (`--infer-enums`, `--infer-content`) or hand-tighten. This is intentional, but it means the first run is a floor, not a finished contract — documented as such in the generated header and the capability ([[C-0008-config-scaffolding]]).
- **Path-vs-type grouping can warn rather than perfectly partition.** Corpora that interleave document types in one directory with no filename prefix cannot be cleanly routed; `init` warns and the author resolves. This is inherent to glob routing, not a tool limitation.
- Adds no new runtime dependency (YAML serialization uses the `yaml` package already present for the loaders).

## Options considered

### Grouping key — path signature (chosen) vs frontmatter `type` vs single contract

- **Path signature, named by `type` (chosen).** Groups are routable by construction (the runtime routes by path), reproduce the dogfood shape, and need no frontmatter; `type` adds semantic names and a consistency check.
- **Frontmatter `type` as the routing key (rejected as default).** Semantically the "right" partition, but not generally routable: two types sharing a directory with no filename prefix cannot be separated by any path glob, so it would silently misroute. Kept as `--group type` (derived globs + interleave warning) for corpora that *are* path-separated by type.
- **Single contract for everything (offered as `--group single`).** Simplest and loosest, but the required spine collapses to the universal intersection across all types — usually near-empty and uninformative on a heterogeneous corpus. Good for a quick floor, not the default.
- **One contract per directory (`--group dir`).** A clean middle ground when filenames carry no prefix; it is the fallback inside `auto` already.

### Looseness — intersection-only vs intersection-required + union-optional (chosen)

A bare intersection (required = universal sections, nothing else emitted) is the minimal accepting contract, but it *discards* the rest of the observed vocabulary, so the scaffold tells the author less than the corpus showed. **Intersection-required + union-optional** (chosen) emits every observed section — universal ones required, the rest `optional:` — so the generated contract is a complete map of the corpus's structure that the author edits down, while still accepting every file. The extra cost is a few `optional:` lines; the gain is a far more useful starting point.

### Value inference — conservative/lossless (chosen) vs eager (enums, patterns, ranges)

Eagerly inferring `enum` from a small value set, or `pattern`/`min`/`max` from observed strings/numbers, produces a tighter, more "finished-looking" contract — but each such inference can reject a future-but-valid value the corpus simply hasn't seen yet, **breaking accept-by-construction's spirit on the next document**. The default stays lossless (only facts true of every observed value, admitting at least the observed range); tightening inferences are opt-in flags. The tool optimizes for "never wrong", not "looks complete".

### Output — meta-config + files (chosen default) vs single inline config

Both are first-class in [[C-0007-declarative-corpus-meta-config]]; `init` defaults to the **meta-config + `contracts/` files** offramp shape because it is what you tighten file-by-file and matches the dogfood layout, with `--inline` for the single-file on-ramp on small corpora. No need to choose — the flag exposes the same duality the format already has.

### Verb name — `init` (chosen) vs `infer` / `scaffold` / `generate`

`init` is the familiar "bootstrap a config here" verb (npm, git, tsc), which is what the user *intends*; *inference* is the mechanism that makes it useful, not the user-facing name. `infer`/`scaffold`/`generate` describe the implementation; `init` describes the goal. (Open to revisiting in review — see Open questions.)

## Open questions

- **Verb spelling** — `init` (chosen, goal-named) vs `infer`/`scaffold` (mechanism-named). Final call in review.
- **`auto` grouping precedence** — confirm the `(directory, prefix-token)` signature and the prefix-vs-directory glob preference are the right defaults, and the exact prefix regex (`^([A-Za-z]+)-`? include digits? a minimum token length to avoid false positives like `README-NOTES.md`).
- **Optional-section threshold** — emit *every* non-universal section as `optional:` (chosen), or only those above a frequency threshold (to drop one-off sections as noise)? A threshold trades completeness for tidiness.
- **`--infer-enums` default N and ratio** — when opted in, what distinct-count cap (and should it also require distinct ≪ total, so it is clearly categorical) avoids spurious enums?
- **Content-plane inference (`--infer-content`)** — how uniform must a section's blocks be across the group before emitting a `table`/`list` leaf (identical columns? a column superset?), and is v1 the place for it at all.
- **Nested subsection grammar** — v1 infers only the top-level spine; whether/when to recurse into `children:` grammars from observed nesting.
- **Re-run merge** — regenerate-and-diff (v1) vs a merge mode that preserves manual tightenings across re-runs.
- **Meta-schema reuse** — whether the self-check should also validate the *emitted YAML* against the format's own meta-schema ([[D-0008-declarative-contract-dsl]] § Open questions) once that exists.

## Out of scope

- **Tightening inference by default** — `enum`s from value sets, `pattern` / `min` / `max`, content-plane leaves: opt-in only (`--infer-enums`, `--infer-content`), never default, because each can reject future-but-valid input.
- **Cross-cutting `rule` / `docRule` inference** — out, mirroring [[D-0008-declarative-contract-dsl]] (rules aren't in the v1 YAML at all).
- **Editing the source documents** — `init` is read-only on the corpus and only writes the config it is asked to create ([[D-0007-engine-scope-and-fidelity]]); it never "fixes" docs to fit a contract.
- **Merging into a hand-tightened config** — v1 regenerates and the author diffs; an automatic merge mode is a possible future.
- **Non-top-level structure** — v1 infers the top-level section spine only; deep nested grammars are future work.

## References

- [[C-0008-config-scaffolding]] — the capability this decision realizes (the `init` command).
- [[C-0006-declarative-yaml-contracts]] — the contract format `init` emits.
- [[C-0007-declarative-corpus-meta-config]] — the meta-config format `init` emits, and the inline ↔ file-ref duality `--inline` exposes.
- [[C-0003-corpus-cli]] — the binary `init` adds a verb to, and the glob-routing (first-match-wins) that forces path-based grouping.
- [[C-0005-two-plane-contract-engine]] — the runtime whose `parse` supplies the inference input and whose `runCorpus` powers the self-check.
- [[D-0008-declarative-contract-dsl]] — the format and `format`-set this produces, the two-bases path/glob rule, and the deferred-tightening posture it mirrors.
- [[D-0007-engine-scope-and-fidelity]] — the read-only posture `init` inherits (writes config, never edits docs).
- [[D-0006-packaging]] — the one-package / one-way layering the inferer respects.
