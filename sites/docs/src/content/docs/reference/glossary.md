---
title: Glossary
description: Definitions of the core markdown-contract terms, each cross-linked to the guide or reference page that covers it in full.
---

The vocabulary markdown-contract uses across the guides, the reference, and the
API. Each entry is short by design; follow the link for the full treatment.

| Term | Meaning |
|---|---|
| **Anchor** | A line-terminal `^block-id` marker from the [dialect](/reference/dialect/) that makes a section, table, or block addressable. Anchors resolve on the typed model via `doc.byAnchor(id)`. See [How it works](/how-it-works/#one-parse). |
| **Config document (YAML)** | A `kind: config` YAML file (typically `markdown-contract.yaml`) that maps `include` / `exclude` globs to named [contracts](/reference/api/) for a whole [corpus](/reference/cli/). Distinct from a *contract document*, which describes a single document type. See [YAML reference](/reference/yaml/) and [Getting started](/getting-started/). |
| **Content leaf** | One of the finite leaf vocabulary — `table`, `list`, `code`, `maxWords` — used inside a section. Each is a structural kind-gate plus a [Zod](https://zod.dev) schema over the projected node, and compiles to a content check. See [How it works](/how-it-works/#three-cooperating-planes) and the [model reference](/reference/model/). |
| **Content plane** | The second [validation plane](/how-it-works/#three-cooperating-planes): Zod at every leaf. Frontmatter is a plain Zod schema; inside sections the content-leaf vocabulary compiles to Zod checks, with raw Zod as the escape hatch. |
| **Contract** | The per-document-type declaration — frontmatter fields, section structure, table and list shape, and cross-cutting rules. One compiled contract both **validates** a document and **types** it, so checking and consuming never drift apart. See [Why](/why/) and the [API reference](/reference/api/). |
| **Contract document (YAML)** | A `kind: contract` YAML file declaring frontmatter fields and body sections with no code. The declarative counterpart of a code-authored contract. See [YAML reference](/reference/yaml/). |
| **Corpus** | A tree of markdown documents validated together, described by a *config document* and executed by the [runner](/how-it-works/#architecture). See the [CLI reference](/reference/cli/). |
| **Dialect** | The in-house markdown extension for the Obsidian conventions many corpora use: [anchors](/reference/dialect/), [wikilinks](/reference/dialect/), and [transclusions](/reference/dialect/). Layered on GitHub-flavored markdown plus YAML frontmatter. See [dialect reference](/reference/dialect/). |
| **Doc** | The typed, navigable view of a validated document returned by `contract.read`. `doc.frontmatter` is typed by the frontmatter schema; `doc.body` reaches sections by camelCase key or exact heading; anchors resolve via `doc.byAnchor(id)`. See the [model reference](/reference/model/). |
| **Drift check** | `markdown-contract init <dir> --check` — loads the *existing* config and re-validates the tree **without** inferring or writing, exiting non-zero if the documents have outgrown the config. The CI drift guard. See [Getting started](/getting-started/) and the [CLI reference](/reference/cli/). |
| **Finding** | The single record every mechanism emits: `{ id, level, path, pos, message }`, positioned to a source line. Rendered as human text, JSON, or SARIF 2.1.0. See [How it works](/how-it-works/#one-finding-shape) and the [findings reference](/reference/findings/). |
| **First-match routing** | The [runner](/how-it-works/#architecture) validates each file against the **first** config rule whose globs match it; rule order is significant. Routing is by glob only — a rule's optional `name` is a label for the run summary, never a routing key. See the [CLI reference](/reference/cli/). |
| **Init / inference** | The `init` subcommand reads an existing folder of markdown and infers a tight-but-accepting config, then immediately re-validates the folder against what it wrote (self-check). See [Getting started](/getting-started/). |
| **Level / severity** | The `error` / `warn` / `report` field on a [finding](/reference/findings/). Severity is **contract data**, declared once in the contract rather than chosen at the call site, so a rule cannot be strict in one place and lax in another. See the [findings reference](/reference/findings/). |
| **mcVersion** | The schema-version envelope key on every declarative YAML document (currently `2`, the JSON-Schema-idiom vocabulary — D-0020). `mcVersion: 1` is retired; a v1 document gets a dedicated error naming the v1→v2 codemod. See the [YAML reference](/reference/yaml/). |
| **Projection / DocTree** | Projection is the `parse(markdown) → DocTree` step. The `DocTree` is a position-carrying section tree: every section, table, list, and code block knows its source line, which is what lets findings land as `path:line`. See [How it works](/how-it-works/#one-parse). |
| **Repeatable section** | A section slot declared `repeatable: true` (with optional numeric `min` / `max`). It waives the duplicate-section rule for its own peers only, bounds the occurrence count (a violation is `structure/repeat-count`), and binds a positional array on the model. See [How it works](/how-it-works/#repeatable-sections). |
| **Rules plane** | The third [validation plane](/how-it-works/#three-cooperating-planes): named functions for what structure and content cannot express — `rule` attaches to a section, `docRule` sees the whole document, and `textRule` / `requires` / `forbids` declare text constraints without writing a function. |
| **Runner** | The middle architecture layer: a corpus config (globs → contracts) in, aggregated findings plus a CI-meaningful exit code out. Exposed as `runCorpus`; the CLI is a thin shell over it. Imports flow `cli → runner → core`. See [How it works](/how-it-works/#architecture). |
| **Section grammar** | The [structure plane](/how-it-works/#three-cooperating-planes)'s small tree grammar over sections and block kinds — `sections`, `section`, `optional`, `oneOf`, and `gap` — nested to any depth, with `order` and `allowUnknown` set per level. Expresses the one axis a schema language cannot: *these sections, in this order, with room for extras*. |
| **SectionView** | The typed view of a single section on the [Doc](/reference/model/) — e.g. `doc.body.summary.text()`. A [repeatable section](/how-it-works/#repeatable-sections) binds `SectionView[]` in document order. See the [model reference](/reference/model/). |
| **Structure plane** | The first [validation plane](/how-it-works/#three-cooperating-planes): the [section grammar](/how-it-works/#three-cooperating-planes) over sections and block kinds. Emits the `structure/*` [rule ids](/reference/findings/). |
| **TableView** | A typed, iterable row collection on the model. A section whose sole content is a `table(...)` leaf promotes its key directly to `TableView<Row>` (and a repeatable such section to `TableView<Row>[]`). See the [model reference](/reference/model/). |
| **Transclusion** | A `![[...]]` embed from the [dialect](/reference/dialect/), with alias and fragment parts recognized alongside [wikilinks](/reference/dialect/). See [How it works](/how-it-works/#one-parse). |
| **Typed model / OOM (out-of-model)** | The typed model is the [Doc](/reference/model/) — a navigable, contract-typed view of a document. *Out-of-model* (OOM) is the internal layer that builds it from a projected [DocTree](/how-it-works/#one-parse). Because the model is derived from the contract, checking and consuming can never drift apart. See the [model reference](/reference/model/). |
| **Wikilink** | A `[[...]]` link from the [dialect](/reference/dialect/), with alias and fragment parts recognized. See [dialect reference](/reference/dialect/). |

:::note
The three [validation planes](/how-it-works/#three-cooperating-planes) — structure, content, and rules — are deliberately separate: schema languages and tree grammars are formally incomparable, so markdown-contract uses each where it is strong instead of forcing one to fake the other.
:::

See also: [Why](/why/) for the problem being solved, [How it works](/how-it-works/) for the mechanism, and [Getting started](/getting-started/) to run it.
