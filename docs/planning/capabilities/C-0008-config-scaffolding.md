---
type: capability
schema_version: '1'
id: C-0008
kind: feature
title: Config scaffolding
status: open/planned
created: '2026-06-24'
parent_key: null
contains: []
related:
  - '[[D-0009-config-inference]]'
  - '[[C-0006-declarative-yaml-contracts]]'
  - '[[C-0007-declarative-corpus-meta-config]]'
  - '[[C-0003-corpus-cli]]'
  - '[[C-0005-two-plane-contract-engine]]'
  - '[[D-0008-declarative-contract-dsl]]'
tags:
  - yaml
  - declarative
  - config
  - scaffolding
  - init
  - inference
need_human_review: true
---

# Config scaffolding

## Summary

- `markdown-contract init <dir>…` reads the markdown **already in** the target directories and writes a runnable config inferred from it. Two paths: **(1)** a **single contract** for one directory — as tight as possible while still accepting every markdown file in it; and **(2)** a **meta-config across a tree**, which cuts the directory tree at a configurable **depth** and gives every directory at that depth a contract covering all markdown beneath it. Both emit ordinary [[C-0006-declarative-yaml-contracts]] / [[C-0007-declarative-corpus-meta-config]] YAML the engine already runs. ^summary
- **Directory structure is the grouping unit** — no frontmatter field, filename convention, or document-type taxonomy is required, so it works on any markdown corpus, not just one with an id scheme. `--depth` is the single knob that trades one broad contract for many narrow ones; it is also what the runtime already routes on (globs over paths — [[C-0003-corpus-cli]]).
- The output **accepts its own corpus by construction** (a self-check guarantees zero findings before you ever see it), and is a **tight snapshot you then tighten or relax by hand**: it captures the structure the files actually share, and the author dials specificity up or down from there. The inference algorithm, the depth/grouping rules, the generalization policy, and the CLI knobs are fixed by [[D-0009-config-inference]].

## Statement

A consumer points the tool at a directory of markdown. In **single-contract** mode it parses every file in the subtree (no contract needed — the engine's `parse` already yields the section tree and parsed frontmatter), generalizes them to the **tightest contract that still accepts all of them**, and writes one contract file. In **meta-config** mode it does the same per directory: it cuts the tree at `--depth N`, and each directory at that cut owns a contract generalized over all the markdown in its subtree, wired into a meta-config that routes glob → contract. Either way the result is immediately runnable (`markdown-contract validate <dir>`) and — by a built-in self-check — guaranteed to report **no findings** against the corpus it was inferred from.

Grouping is by **directory**, deliberately. The runtime routes a file to a contract by glob over its path, so directory structure is the one grouping that is always expressible as routing *and* needs no convention in the documents. Depth turns that into a dial: depth 0 is one contract for the whole tree; depth 1 is a contract per top-level subdirectory; deeper cuts give finer contracts. This makes `init` a general bootstrap — it lowers adopting contracts on an existing body of docs from "read every file and hand-author YAML" to one command, on any corpus.

This capability adds no format and no engine surface; it is a code path that *writes* well-formed YAML, then loads it back through the same loaders to prove the scaffold accepts its own corpus.

## What it provides

- A new CLI verb — **`markdown-contract init <dir>…`** — with two modes:
  - **single contract** (default): one `*.contract.yaml` generalized over all markdown in the target subtree.
  - **meta-config** (`--meta`): a `markdown-contract.yaml` plus a `contracts/` directory, one contract per directory at the chosen `--depth`, each covering all markdown beneath it.
- **Directory-based grouping** that needs no document convention: files are grouped by their containing directory, cut at `--depth N` (default depth gives one contract per top-level subdirectory). Depth 0 collapses to the single-contract case.
- **Tightest-fit-but-accepting generalization**: required sections are those present in *every* file of a group, the rest are emitted `optional:`, observed section order and frontmatter value types are captured as specifically as the data allows — bounded only by "must accept every current file". A **`--relax`** dial loosens the output toward a permissive floor when a looser starting point is wanted.
- **Conservative-by-bound value inference**: a frontmatter field is typed as tightly as the observed values permit (`const` when uniform, `format: date`/etc. when all match, an `enum` of the observed values when they form a small closed set, else `type: string`) — always admitting at least every value seen. A uniform value is only pinned as `const` when it was observed in at least **`--min-const-examples`** documents (default 3) and, for strings, is no longer than **`--max-const-len`** characters (default 64) — so a coincidentally-uniform field on a tiny corpus, or a free-text paragraph, isn't frozen as a literal; both thresholds are overridable per run. ([[D-0009-config-inference]] § Infer field schemas.)
- A **self-check / `--check` mode**: after emitting (or against an existing config), load and run it over the corpus; the scaffold must report zero findings — a build-time guarantee, and a CI signal that "a doc drifted from the inferred shape".
- Output as either the **meta-config + contract files** offramp shape or a single **`--inline`** self-contained config — the inline ↔ file-ref duality [[C-0007-declarative-corpus-meta-config]] makes first-class.

## Inputs

- One or more **target directories** of existing markdown, plus optional mode/shape flags. The tool reads the files; it writes nothing the user did not ask for (overwrite is opt-in).

```bash
# (1) single contract for one directory
markdown-contract init docs/guides

# (2) a meta-config across a tree, one contract per directory two levels deep
markdown-contract init docs --meta --depth 2
```

What it reads from each file (via the engine's `parse`, no contract required): the parsed **frontmatter** map (keys + values), and the **section spine** (top-level heading names, in document order).

## Outputs

- A runnable config on disk — the same artifacts [[C-0006-declarative-yaml-contracts]] / [[C-0007-declarative-corpus-meta-config]] define, byte-compatible with hand-authored ones.

Single-contract mode writes one file:

```text
guides.contract.yaml              # generalized over every *.md under docs/guides
```

Meta-config mode writes a router plus one contract per directory at the cut:

```text
markdown-contract.yaml            # rules: <dir-glob> → contract, one per directory at --depth
contracts/
  api.contract.yaml               # accepts all markdown under docs/api/**
  guides.contract.yaml            # accepts all markdown under docs/guides/**
  …
```

```yaml
# contracts/guides.contract.yaml  (generated — a tight snapshot; tighten or --relax by hand)
mcVersion: 1
kind: contract
frontmatter:
  fields:
    title:  { type: string }       # present in every file ⇒ required
    status: { enum: [draft, published] }   # observed a small closed set ⇒ enum (admits every value seen)
body:
  order: recognized-relative       # every file shared this relative order
  allowUnknown: false              # no section appeared that isn't listed below
  sections:
    - section: Summary             # present in EVERY file ⇒ required
    - section: Steps
    - section: See also            # present in only SOME ⇒ optional
      optional: true
```

The console reports what it inferred and how tight it went (groups/directories, file counts, fields typed, sections required vs optional, order detected), and the self-check result.

## CLI usage

Single contract for a directory — the simplest path:

```bash
markdown-contract init docs/guides            # → guides.contract.yaml
markdown-contract validate docs/guides --contract guides.contract.yaml
```

A meta-config across a tree, cut at a configurable depth:

```bash
markdown-contract init docs --meta            # default depth → one contract per top-level subdir
markdown-contract init docs --meta --depth 2  # finer: one contract per directory two levels down
markdown-contract validate docs               # auto-discovers the generated markdown-contract.yaml
```

Useful flags (full surface in [[D-0009-config-inference]] § The CLI surface):

```bash
markdown-contract init docs --meta --out config/   # where to write
markdown-contract init docs --meta --inline        # one self-contained file instead of contracts/ files
markdown-contract init docs/guides --relax         # loosen toward a permissive floor
markdown-contract init docs --dry-run              # print to stdout, write nothing
markdown-contract init docs --force               # overwrite an existing config
markdown-contract init docs --check               # don't write; verify an existing config still accepts the tree
```

`init` reuses the same **`--glob` / `--include` / `--exclude`** scoping as `validate` ([[C-0007-declarative-corpus-meta-config]]) to choose *which* files feed inference — so a run can skip fixtures or drafts exactly as a validation run would. By design `init` only *adds* a config; it never edits the source docs and refuses to clobber an existing config without `--force`.

## Hook points

- **The snapshot is a starting point; the dials are tighten and relax.** Generated YAML is ordinary [[C-0006-declarative-yaml-contracts]] — the author edits any inferred constraint by hand, and `--relax` flips the *whole* generation toward a permissive floor for those who want to start loose and ratchet up instead of down.
- **Depth is the granularity dial.** One run, one `--depth`, and the same corpus yields anything from a single broad contract to a fine-grained per-directory mesh — without touching the documents.
- **`--check` is the drift guard.** A tight snapshot is, by design, a tripwire: in CI, `init --check` (or `validate`) catches a new or edited doc that no longer fits the inferred shape — the tighter the snapshot, the more drift it catches.
- **Inference depth is bounded, not infinite.** v1 infers the top-level section spine + frontmatter value types; richer inference (content-plane leaves, deep nested grammars, `pattern`/`min`/`max`) is deliberate future work ([[D-0009-config-inference]] § Out of scope), kept out of the default so generation stays predictable.
- **Producer of the same formats, so it tracks them.** As the [[D-0008-declarative-contract-dsl]] vocabulary grows (new `format`s, leaf types, a JSON-Schema leaf dialect), the inferer can emit more — it writes the format, it does not define it.

## Underlying implementation

- A new code path in the same front-end layer as the loaders — the `markdown-contract/declarative` subpath export over `src/core` and `src/runner` — plus a thin `init` verb in the CLI ([[C-0003-corpus-cli]]). Imports stay one-way `cli → runner → core` per [[D-0006-packaging]]; the engine is untouched.
- The reader side reuses **`parse`** (already exported from `core`) for the section tree + frontmatter and the runner's file walk for discovery and the depth cut; the writer side serializes the inferred model to YAML and then **loads it back through `loadConfig` / `loadContract`** and runs it through `runCorpus` for the accept-by-construction self-check — so the inferer is validated against the very loaders it targets.
- The exact algorithm (discover → parse → group-by-directory-and-depth → generalize → infer field schemas → emit → self-check), the generalization/value-type policies, the glob synthesis, and the CLI flag surface are fixed by [[D-0009-config-inference]].
- Not yet built.

## Notes

- Builds directly on [[C-0006-declarative-yaml-contracts]] and [[C-0007-declarative-corpus-meta-config]] (the formats it writes) and [[C-0003-corpus-cli]] (the binary it adds a verb to). It is the natural sequel: they let you *author* contracts as data; this lets you *bootstrap* them from docs you already have.
- This repo's own dogfood config (a meta-config over `docs/planning`, one contract per document type) is **one instance** of the meta-config path, not the model — there it happens that document types align with directories. The general tool keys on directories and depth, so it needs no such alignment.
