---
title: Getting started
description: Install markdown-contract, validate a folder from the terminal, and author your first contract in YAML or TypeScript.
sidebar:
  order: 4
---

markdown-contract is a Node ESM package (Node ≥ 20) with a library API and a
`markdown-contract` CLI. It is **not yet published to npm** — for now, build it
from a checkout of the
[source repository](https://github.com/sksizer/markdown-contract). The
workspace builds with [Bun](https://bun.sh) (install it first); the built
library and CLI run on plain Node:

```sh
git clone https://github.com/sksizer/markdown-contract
cd markdown-contract
bun install                    # resolve the workspace
bunx moon run core:build       # tsc → packages/core/dist (library + CLI bin)
```

The publishable package lives in `packages/core`; link it into your project
with `npm link` / `bun link` from there, or run the CLI as
`node packages/core/dist/cli/index.js`.

## Validate from the terminal

Point `validate` at a folder. Config is auto-discovered
(`markdown-contract.yaml` in the working directory), or passed explicitly.
Both files are authored in the sections just below — if you're starting from
scratch, write one of them first (or let `init` do it), since `validate`
without any config exits 2:

```sh
markdown-contract validate ./decisions                                  # uses markdown-contract.yaml
markdown-contract validate ./decisions --contract decision.contract.yaml
markdown-contract validate ./docs --format sarif > results.sarif        # or --format json
```

Findings print as `path:line level id — message`. Exit codes are CI-ready:
**0** clean, **1** error-level findings, **2** usage or config error.

The [CLI reference](/reference/cli/) lists every command, flag, and exit code, and
the [findings reference](/reference/findings/) specifies the printed line format.

## Or let `init` write the config for you

`init` reads an existing folder of markdown and infers a tight-but-accepting
config — then immediately re-validates the folder against what it wrote:

```sh
markdown-contract init ./docs              # writes markdown-contract.yaml, self-checks
markdown-contract init ./docs --dry-run    # print what would be written
markdown-contract init ./docs --check      # CI drift gate: fail if docs outgrew the config
```

## Declare a contract in YAML — no code

Simple contracts need no TypeScript. A contract document declares frontmatter
fields and body sections — the [YAML reference](/reference/yaml/) is the full
field catalog:

```yaml
# decision.contract.yaml
mcVersion: 1
kind: contract
frontmatter:
  fields:
    id: { type: string, pattern: '^D-\d{4}$' }
    status: { enum: [proposed, accepted, superseded] }
body:
  allowUnknown: true
  sections:
    - section: Summary
    - section: Decision
```

A config document maps globs to contracts for a whole corpus:

```yaml
# markdown-contract.yaml
mcVersion: 1
kind: config
contracts:
  decision: ./decision.contract.yaml
rules:
  - include: ["decisions/**/*.md"]
    contract: decision
```

## Or author it in TypeScript

The code API (full surface in the [API reference](/reference/api/)) adds what
YAML can't express: arbitrary Zod schemas, nested
grammars, and custom rules — and it types the document for reading:

```ts
import { contract, sections, section, optional, maxWords } from "markdown-contract";
import { z } from "zod";

const decision = contract({
  frontmatter: z.object({
    id: z.string().regex(/^D-\d{4}$/),
    status: z.enum(["proposed", "accepted", "superseded"]),
  }),
  body: sections({ order: "strict", allowUnknown: true }, [
    section("Summary", { content: maxWords(120) }),
    section("Decision"),
    optional(section("Consequences")),
  ]),
});

// Validate: findings with positions, never throws.
const result = decision.validate(src, { path: "decisions/D-0001.md" });

// Read: the same contract returns the typed model (or throws ContractError).
const doc = decision.read(src, { path: "decisions/D-0001.md" });
doc.frontmatter.status;   // "proposed" | "accepted" | "superseded"
doc.body.summary.text();  // the Summary section's prose
```

## Repeatable sections

Sometimes a heading is *meant* to recur — a per-entry `## Entry`, a changelog's
`## Release`. Declare the slot `repeatable: true` (in YAML, or
`section("Entry", { repeatable: true })` in code) and its peers validate
instead of tripping the duplicate-section rule, reading back as a positional
array on the model. See [How it works](/how-it-works/#repeatable-sections) for
the mechanism, and the [YAML reference](/reference/yaml/) for the keys.

## Embed it

The CLI is a thin shell — everything it does is a library call away. Validate
a corpus from your own tooling with `runCorpus` (see the [API
reference](/reference/api/)):

```ts
import { defineConfig, runCorpus } from "markdown-contract";

const config = defineConfig({
  rules: [{ include: ["decisions/**/*.md"], contract: decision }],
});
const { findings, exitCode, stats } = runCorpus(config, { cwd: repoRoot });
```

## Where next

Have a concrete job — guard a folder in CI, enforce an ADR template, read docs
back as typed data? Start from a [recipe](/recipes/): each is a scenario-first,
end-to-end solution, and [guard a folder of docs in
CI](/recipes/guard-a-folder-in-ci/) is the five-minute adoption path.

The [examples](/examples/) are the fastest way to learn the rest: eight short
ladders of small, verified examples (a few late rungs are badged *Planned*),
each rung building on the last — from first CLI run to cross-document
governance rules.

When you need exhaustive detail, the **reference** section is the spec:
[CLI](/reference/cli/), [YAML config & contracts](/reference/yaml/),
[library API](/reference/api/), [typed model](/reference/model/),
[findings](/reference/findings/), [dialect](/reference/dialect/), and the
[glossary](/reference/glossary/).
