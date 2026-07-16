---
title: Getting started
description: Install markdown-contract, validate a folder from the terminal, and author your first contract in YAML or TypeScript.
sidebar:
  order: 5
---

markdown-contract is a Node ESM package (Node ≥ 20) with a library API and a
`markdown-contract` CLI. It is **not yet published to npm** — for now, build it
from a checkout of the
[source repository](https://github.com/sksizer/markdown-contract):

```sh
git clone https://github.com/sksizer/markdown-contract
cd markdown-contract
bun install                    # resolve the workspace
bunx moon run core:build       # tsc → packages/core/dist (library + CLI bin)
```

The publishable package lives in `packages/core`; link it into your project
with `npm link` / `bun link` from there, or run the CLI directly via
`packages/core/dist/cli/index.js`.

## Validate from the terminal

Point `validate` at a folder. Config is auto-discovered
(`markdown-contract.yaml` in the working directory), or passed explicitly:

```sh
markdown-contract validate ./decisions                                  # uses markdown-contract.yaml
markdown-contract validate ./decisions --contract decision.contract.yaml
markdown-contract validate ./docs --format sarif > results.sarif        # or --format json
```

Findings print as `path:line level id — message`. Exit codes are CI-ready:
**0** clean, **1** error-level findings, **2** usage or config error.

The [CLI reference](/reference/cli/) lists every command, flag, and exit code,
and the [validate examples](/appendix/examples/validate/) walk each step with
real transcripts.

## Or let `init` write the config for you

`init` reads an existing folder of markdown and infers a tight-but-accepting
config — then immediately re-validates the folder against what it wrote:

```sh
markdown-contract init ./docs              # writes markdown-contract.yaml, self-checks
markdown-contract init ./docs --dry-run    # print what would be written
markdown-contract init ./docs --check      # CI drift guard: fail if docs outgrew the config
```

## Declare a contract in YAML — no code

Simple contracts need no TypeScript. A contract document declares frontmatter
fields and body sections — the [YAML reference](/reference/yaml/) is the full
field catalog, and the [authoring examples](/appendix/examples/author/) cover
tables, text constraints, and repeatable sections:

```yaml
# decision.contract.yaml
mcVersion: 2
kind: contract
frontmatter:
  type: object
  required: [id, status]
  properties:
    id: { type: string, pattern: '^D-\d{4}$' }
    status: { enum: [proposed, accepted, superseded] }
body:
  additionalSections: true
  sections:
    - section: Summary
    - section: Decision
```

A config document maps globs to contracts for a whole corpus:

```yaml
# markdown-contract.yaml
mcVersion: 2
kind: config
contracts:
  decision: ./decision.contract.yaml
rules:
  - include: ["decisions/**/*.md"]
    contract: decision
```

## Or author it in TypeScript

The code API (full surface in the [API reference](/reference/api/)) adds what
YAML can't express: arbitrary Zod schemas, nested grammars, and custom rules —
and it types the document for reading:

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
doc.body.Summary.text();  // the Summary section's prose, keyed by its heading
```

The typed model goes much further — iterable typed table rows, anchor lookups,
nested section navigation. The [model reference](/reference/model/) is the full
surface; the [read examples](/appendix/examples/read/) show it in use.

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

The [appendix examples](/appendix/examples/) are the fastest way to learn the
rest: four small groups of worked, verified examples — [validate from the
terminal](/appendix/examples/validate/), [author contracts in
YAML](/appendix/examples/author/), [read markdown as typed
data](/appendix/examples/read/), and [automate and
embed](/appendix/examples/automate/).

When you need exhaustive detail, the **reference** section is the spec:
[CLI](/reference/cli/), [YAML config & contracts](/reference/yaml/),
[library API](/reference/api/), [typed model](/reference/model/),
[findings](/reference/findings/), [dialect](/reference/dialect/), and the
[glossary](/reference/glossary/).
