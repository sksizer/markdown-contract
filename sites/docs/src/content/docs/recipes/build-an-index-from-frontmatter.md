---
title: Build an index from your docs' frontmatter and tables
description: A living index of your decision records — id, status, title, straight from each file's typed model. One script, no hand-rolled parsing, broken files skipped and reported instead of crashing the build.
---

**The situation.** Your decision records live in `decisions/` — each with an
`id`, a `status`, and a `title` in frontmatter, plus an `Alternatives` table in
the body. People keep asking "which decisions are still proposed?", and the
answer is a hand-maintained index that is always one merge behind. You want a
script that *generates* the index — without writing yet another regex over
frontmatter, and without one malformed file crashing the whole run.

The same contract that validates a decision record also **reads it back as
typed data**. So the index script is a loop: validate each file, take the typed
`doc` when the findings allow, collect a row, print a table.

## 1. The contract, in code

This is a code recipe, so the contract is authored with the library combinators
rather than YAML — that way the typed model carries real types into the script
(`status` reads back as the enum union, not `string`). Same two planes as the
YAML front-end, same engine:

```ts
// build-index.ts (part 1 — the contract)
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { contract, formatFinding, section, sections, table } from "markdown-contract";
import { z } from "zod";

const decision = contract({
  frontmatter: z
    .object({
      id: z.string().regex(/^D-\d{4}$/),
      title: z.string().min(1),
      status: z.enum(["proposed", "accepted", "superseded"]),
    })
    .strict(),
  body: sections({ allowUnknown: true }, [
    section("Context"),
    section("Decision"),
    section("Alternatives", {
      content: table({ columns: ["Option", "Outcome"], minRows: 1 }),
    }),
  ]),
});
```

The combinators are documented in the [API reference](/reference/api/); if you
already gate this folder in CI with a YAML contract, this is the same shape —
keep both, or keep the YAML one and load it with `loadContractFile` instead
(see [Tables your tooling can rely on](/recipes/typed-table-columns/) for that
variant).

## 2. The script: validate, collect, print

The loop is the whole recipe. `validate()` never throws — it returns
`{ findings, doc }`, and `doc` is present **iff** the file has no error-level
finding. That presence check is the gate: valid files become rows, broken files
are skipped and reported.

```ts
// build-index.ts (part 2 — the loop)
const dir = "decisions";
const rows: string[] = [];
let skipped = 0;

for (const file of readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
  const path = join(dir, file);
  const { findings, doc } = decision.validate(readFileSync(path, "utf8"), { path });

  if (!doc) {
    // error-level findings — skip this file, say why, keep going
    for (const f of findings) console.error(`skip ${path} ${formatFinding(f)}`);
    skipped++;
    continue;
  }

  const { id, status, title } = doc.frontmatter; // typed by the contract
  const alternatives = doc.body.Alternatives.rowCount; // promoted TableView
  rows.push(`| ${id} | ${status} | [${title}](${path}) | ${alternatives} |`);
}

console.log("| ID | Status | Title | Alternatives |");
console.log("| --- | --- | --- | --- |");
for (const row of rows) console.log(row);
if (skipped > 0) console.error(`\n${skipped} file(s) skipped`);
```

Every field the row needs comes off the typed model: `doc.frontmatter` is the
Zod schema's output, and because the `Alternatives` section's sole content is
one table, its key **is** the `TableView` — `rowCount` counts the alternatives
each decision actually weighed. No parsing code anywhere in the script.

:::note
In TypeScript, the statically-typed body key is the **exact heading name**
(`doc.body.Alternatives`). The lowerCamelCase alias (`doc.body.alternatives`)
resolves at runtime too, but only the exact key carries the inferred
`TableView` type — see [dual keys](/reference/model/) in the model reference.
:::

## 3. Run it

Three files in `decisions/`: `D-0001.md` and `D-0003.md` conform; `D-0002.md`
has a `status` outside the enum and no `Alternatives` section at all:

```markdown
---
id: D-0002
title: Adopt a queue for webhook delivery
status: draft
---

# Adopt a queue for webhook delivery

## Context

Webhook fan-out is currently synchronous and blocks the request path.

## Decision

Deliver webhooks through a queue with retry and dead-lettering.
```

Node 22+ runs the TypeScript file directly (or use `bun` / `tsx`):

```sh
node build-index.ts
```

```text
skip decisions/D-0002.md [frontmatter/enum] (line 4): frontmatter field ‘status’ must be one of ‘proposed’, ‘accepted’, ‘superseded’
skip decisions/D-0002.md [structure/section-missing] (line 9): required section ‘Alternatives’ is missing
| ID | Status | Title | Alternatives |
| --- | --- | --- | --- |
| D-0001 | accepted | [Store decisions as markdown](decisions/D-0001.md) | 2 |
| D-0003 | proposed | [Pin the public API to semver](decisions/D-0003.md) | 3 |

1 file(s) skipped
```

The two valid records became rows; the broken one was skipped with its exact
findings — file, line, rule id — instead of a stack trace from a half-parsed
document. And because the rows go to **stdout** while the skip report goes to
**stderr**, redirecting gives you a clean committed index:

```sh
node build-index.ts > decisions/INDEX.md
```

:::tip
Prefer JSON? Push objects instead of table rows —
`rows.push({ id, status, title, alternatives })` — and end with
`console.log(JSON.stringify(rows, null, 2))`. The typed model is the data
source either way; only the printing at the end changes.
:::

## 4. Keep it fresh in CI

Regenerate the index on every push and fail if the committed copy is stale:

```yaml
# .github/workflows/decisions-index.yml
name: decisions-index
on: [push, pull_request]
jobs:
  index:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      # Install markdown-contract first — it's built from source until it's on
      # npm; see Getting started. Then regenerate and diff:
      - run: node build-index.ts > decisions/INDEX.md
      - run: git diff --exit-code decisions/INDEX.md
```

If you also want broken records themselves to fail the build, keep the
[one-line CLI gate](/recipes/guard-a-folder-in-ci/) as a separate step — or set
`process.exitCode = 1` when `skipped > 0` and let the generator do both jobs.

## What's happening

- **`validate()` is the batch door.** For a folder job you want *findings as
  data, never throw*: one malformed file becomes a skip-and-report, not an
  aborted run. `read()` is the other door — typed doc or a thrown
  `ContractError` — which is right when one bad document *should* stop you
  (a single config file, a template), and wrong in a loop where file #2 of 40
  would kill the other 38. The two doors are contrasted in the
  [model reference](/reference/model/) and side by side in
  [Consume as Data](/examples/consume-as-data/consume-as-data-10/).
- **`doc` present means validated.** `ValidationResult.doc` exists iff there is
  no error-level finding, so `if (!doc)` is the entire error policy. Warn-level
  findings do *not* suppress `doc` — a record with only warnings still gets its
  row (levels are in the [findings reference](/reference/findings/)).
- **The row fields are contract-guaranteed.** `doc.frontmatter.status` is the
  enum union because the frontmatter Zod said so, and `doc.body.Alternatives`
  is a `TableView` because the section's sole content is a `table(...)` leaf —
  the "heading is the table" promotion. A file where any of that is false never
  reaches the row-building line.
- **`formatFinding`** is the same one-line rendering the package uses
  everywhere — `[id] (line N): message` — so the skip report is grep-able
  without any formatting code of your own.

## Next

- [Assemble release notes from a changelog's sections](/recipes/assemble-release-notes/)
  — the same read-back loop, generating prose instead of a table.
- [Run validation inside your own build script](/recipes/validate-in-your-own-build/)
  — when the loop should gate the build rather than generate from it.
- [Read a real task into typed data](/examples/consume-as-data/consume-as-data-11/)
  — one document consumed end to end: frontmatter, tables, lists, optionals.
