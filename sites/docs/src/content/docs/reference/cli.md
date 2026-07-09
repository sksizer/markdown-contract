---
title: CLI reference
description: Complete reference for the markdown-contract command-line interface — the validate and init subcommands, every flag, output format, and exit code.
---

The `markdown-contract` binary has two subcommands: [`validate`](#validate) (check a tree of markdown against a contract) and [`init`](#init) (infer a starter contract from existing markdown). Both share the same glob-scoping flags and the same three-value [exit-code](#exit-codes) convention.

This page is the exhaustive flag reference. For task-shaped walkthroughs see [/examples/cli/](/examples/cli/), [/examples/inference-init/](/examples/inference-init/), and [/examples/embed-and-ci/](/examples/embed-and-ci/).

## Overview

The package is not yet published to npm — you build it from source and invoke the bin directly. See [/getting-started/](/getting-started/) for the clone-and-build steps. Once built, the binary name is `markdown-contract`.

```bash
markdown-contract validate <path> [flags]
markdown-contract init <dir> ... [flags]
```

The CLI writes findings to **stdout**, diagnostics (usage and config errors) to **stderr**, and exits with a [status code](#exit-codes) a CI job can gate on. It never mutates the documents it validates.

Two global behaviours apply before any subcommand: `-h` / `--help` prints usage to stdout and exits `0`; invoking the binary with no arguments prints usage to stderr and exits `2`. An unrecognized subcommand also exits `2`.

### Config auto-discovery

When `validate` runs without an explicit `--config` (and without an inline `--contract`), it probes the current working directory for a config file, in this order, and uses the first that exists:

| Order | Filename |
|-------|----------|
| 1 | `markdown-contract.config.js` |
| 2 | `markdown-contract.config.mjs` |
| 3 | `markdown-contract.config.yaml` |
| 4 | `markdown-contract.config.yml` |
| 5 | `markdown-contract.yaml` |
| 6 | `markdown-contract.yml` |

A `.yaml`/`.yml` config compiles through the declarative front-end; a `.js`/`.mjs` config must `export default` a `CorpusConfig` (`{ rules: [...] }`). A `.ts` config, any other unsupported extension, or no config found at all is a usage error (exit `2`). See [/reference/yaml/](/reference/yaml/) for the declarative config shape and [/reference/api/](/reference/api/) for `CorpusConfig`.

## validate

```bash
markdown-contract validate <path> [--format human|json|sarif]
  [--config <file>] | [--contract <file>] | [--contract <file> --path <dir> ...]
  [--glob <glob> ...] [--include <glob> ...] [--exclude <glob> ...]
```

`validate` resolves a **run root** and a `CorpusConfig`, runs the corpus over the matching `*.md` files, formats the findings, and exits `0` (clean) or `1` (error-level findings present). Any usage or config problem exits `2`.

### Flags

| Flag | Argument | Repeatable | Meaning |
|------|----------|:---------:|---------|
| `--format` | `human` \| `json` \| `sarif` | no | Output format. Default `human`. An unrecognized value is a usage error. |
| `--config` | `<file>` | no | Load this config file instead of auto-discovering one. Mutually exclusive with `--contract`. |
| `--contract` | `<file>` | yes | Apply a single YAML contract inline, without a config file. Must be a `.yaml`/`.yml` file. Mutually exclusive with `--config`. |
| `--path` | `<dir>` | yes | The target directory paired with a preceding `--contract`. Requires `--contract`. |
| `--include` | `<glob>` | yes | Include filter, relative to the run root. Restricts which files the run scans. |
| `--glob` | `<glob>` | yes | Alias of `--include`; both feed the same include set. |
| `--exclude` | `<glob>` | yes | Exclude filter, relative to the run root. |

`<path>` is the positional run root. When omitted (in the `--config` and single-`--contract` forms) the run root is the current working directory.

### How a run is scoped and routed

Contract binding comes from **exactly one** of two sources — an inline `--contract` or a `--config` file, never both:

- **`--config <file>` (or auto-discovery)** — the config's own rules route files to contracts. The positional `<path>`, if given, becomes the run root.
- **One `--contract <file>`, no `--path`** — that contract applies to every `*.md` under the run root (`<path>`, or cwd) as a single catch-all rule (`**/*.md`).
- **Paired `--contract` + `--path`** — one rule per pair, matching `<dir>/**/*.md` relative to the run root (the cwd). Each `--contract` needs a matching `--path`, and a positional `<path>` cannot be combined with paired routing.

The `--glob` / `--include` / `--exclude` filters are a global pre-filter applied on top of the resolved config **in every mode**, including `--config`. `--glob` and `--include` are interchangeable; supplying both simply unions their patterns into the include set.

:::caution
These flag combinations are usage errors (exit `2`):

- `--contract` together with `--config`
- `--path` without a preceding `--contract`
- multiple `--contract` without a matching `--path` for each
- a positional `<path>` combined with `--contract`/`--path` pairs
- a `--contract` ref that is not a `.yaml`/`.yml` file
- a run root that does not exist
:::

### Examples

```bash
# Auto-discover a config in the cwd and validate ./docs
markdown-contract validate docs

# One inline contract over an entire tree
markdown-contract validate docs --contract api-page.yaml

# Route two contracts to two subtrees, JSON output
markdown-contract validate \
  --contract guide.yaml --path docs/guides \
  --contract ref.yaml   --path docs/reference \
  --format json

# Narrow an existing config run to a subset
markdown-contract validate docs --config mc.yaml \
  --include 'reference/**/*.md' --exclude '**/_*.md'
```

## init

```bash
markdown-contract init <dir> ... [--meta] [--depth <n>] [--relax] [--inline]
  [--out <dir>] [--force] [--dry-run] [--check] [--infer-bounds]
  [--max-const-len <n>] [--min-const-examples <n>]
  [--glob <glob> ...] [--include <glob> ...] [--exclude <glob> ...]
```

`init` reads one or more directories of existing markdown, **infers** a tight-but-accepting contract from what it finds, writes the scaffold, and self-checks it. At least one `<dir>` is required. Multiple roots merge into one run: each root is inferred and self-checked against its own tree, and the emitted files carry every root's contracts. `init` always prints a human summary (there is no `--format` on this subcommand).

### Flags

| Flag | Argument | Meaning |
|------|----------|---------|
| `--meta` | — | Emit a self-contained `markdown-contract.yaml` plus per-directory contracts under `contracts/`, instead of a single contract. |
| `--depth` | `<n>` | Directory cut for `--meta` (default `1`; `0` behaves as single-contract). Must be a non-negative integer. |
| `--relax` | — | Loosen generation toward a more permissive floor. |
| `--inline` | — | Emit one self-contained config instead of separate `contracts/` files. |
| `--out` | `<dir>` | Where to write. Default: the single inferred root; a multi-root run falls back to the cwd (with a stderr warning). |
| `--force` | — | Overwrite an existing config/contract file. Without it, a clash is refused (exit `2`). |
| `--dry-run` | — | Print the would-be files to stdout and write nothing (exit `0`). |
| `--check` | — | Verify an existing config still accepts the tree. Does not infer or write. See [drift gate](#--check-the-ci-drift-gate). |
| `--max-const-len` | `<n>` | Cap: strings longer than this never become a `const`/enum. Non-negative integer. |
| `--min-const-examples` | `<n>` | Floor: a uniform scalar needs at least `n` documents before it becomes a `const`. Integer `>= 1`. |
| `--include` / `--glob` | `<glob>` | Choose which files feed inference (and scope the self-check), exactly as `validate` scopes a run. |
| `--exclude` | `<glob>` | Exclude filter for inference and self-check. |

:::caution[Planned]
`--infer-bounds` is accepted on the command line and threaded through to the inference options, but it is currently a **no-op** — pattern / min / max bound inference is not yet implemented. Passing it changes nothing about the emitted contract today.
:::

An out-of-range value for `--depth`, `--max-const-len`, or `--min-const-examples` is a usage error (exit `2`), as is a `<dir>` that does not exist.

### What it writes

- **Single-contract mode** (default) — one `<name>.contract.yaml` per root, plus a synthesized `markdown-contract.yaml` router that references them all. The router is the discovery affordance that lets a later `validate <dir>` auto-discover the scaffold.
- **`--meta` mode** — each root emits a self-contained `markdown-contract.yaml` plus its `contracts/` tree; a multi-root run keeps the first root's config as the discoverable router (files are de-duplicated by path, first wins).

Files are written under `--out` (defaulting as described above), and `init` **refuses to overwrite** an existing router or contract file unless `--force` is given.

### Self-check

After writing, `init` loads each root's contracts back and runs them over that root via the corpus runner (each root checked with itself as cwd, so run-root-relative globs route exactly the files inference saw). An error-level finding here means an emitted constraint is tighter than the data allows — an inferer bug. That case is reported loudly and exits `1`; a clean self-check exits `0`.

### `--check` (the CI drift gate)

`--check` does not infer or write. It loads the **existing** `markdown-contract.yaml` next to each root and runs it over the tree:

- exit `0` — every root is clean
- exit `1` — some document drifted from the inferred shape (an error-level finding)
- exit `2` — no config exists to check, or a config/usage error

This is the guard to wire into CI: run `init <dir> --check` and let a non-zero exit fail the build. See [/examples/embed-and-ci/](/examples/embed-and-ci/).

### Examples

```bash
# Infer a single contract for ./docs and preview it without writing
markdown-contract init docs --dry-run

# Write a meta scaffold, one contract per top-level directory
markdown-contract init docs --meta --depth 1

# CI drift gate against the committed scaffold
markdown-contract init docs --check
```

## Output formats

`--format` selects the report shape (`validate` only). Only the `human` format carries the run summary; `json` and `sarif` are the bare finding outputs. Every format renders the same underlying `Finding[]` — see [/reference/findings/](/reference/findings/) for the finding shape, levels, and rule ids.

### human

The default. A run summary is prepended, followed by one line per finding, grouped by file (files in first-seen order). Each finding line has the shape:

```text
<path>:<line> <level> <id> — <message>
```

A finding with no position prints as `<path>` with no `:<line>`. A trailing line counts findings by level, and a clean corpus reports `No findings.` The prepended summary reports files scanned/matched/unmatched, gaining an `across K contracts` clause and a per-contract breakdown only when the config's rules are named (an inline `--contract` run has unnamed rules, so it prints just the total line):

```text
Scanned 39 files; 38 matched across 6 contracts, 1 unmatched
  capability: 8
  ...

docs/api.md:12 error structure/section-missing — required section "Parameters" is absent

1 finding(s): 1 error, 0 warn, 0 report
```

### json

The `Finding[]` array serialized with two-space indent, exactly as the runner returns it. Stable and `JSON.parse`-round-trippable — this is the format to consume programmatically. See [/reference/model/](/reference/model/) and [/examples/consume-as-data/](/examples/consume-as-data/).

### sarif

A valid **SARIF 2.1.0** log for code-scanning surfaces (GitHub and others). A single run whose `tool.driver.name` is `markdown-contract`; `driver.rules` lists each distinct finding id seen (deduped, first-seen order), and each finding becomes one `result` with its `ruleId`, mapped `level`, `message.text`, and a `physicalLocation`. Finding levels map to SARIF as `error → error`, `warn → warning`, `report → note`; the `region.startLine` is included only when the finding has a position.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Clean — no error-level findings (`validate`), or self-check/`--check` passed (`init`). |
| `1` | Error-level findings present (`validate`), or a self-check / `--check` drift failure (`init`). |
| `2` | Usage or config error — unknown command, bad flag combination, missing/invalid config, unsupported config extension, bad `--format`, non-existent path, or a refused overwrite. |

Warn- and report-level findings never affect the exit code; only error-level findings drive the `1` exit. This makes the CLI safe to gate a CI job on — the exit code reflects the findings regardless of the chosen `--format`:

```bash
markdown-contract validate docs --format sarif > results.sarif || {
  echo "contract violations found"; exit 1;
}
```

See [/examples/embed-and-ci/](/examples/embed-and-ci/) for a full CI recipe, and [/how-it-works/](/how-it-works/) for how the runner produces the findings this CLI reports.
