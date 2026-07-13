---
title: Run validation inside your own build script
description: Your release script is already Node — validate docs in-process with runCorpus instead of shelling out to the CLI. Findings, stats, and an exit code, as data.
---

**The situation.** Your build is a Node script — it compiles the site, packs the
artifacts, publishes. You want doc validation to be one step of *that script*,
not a child process whose stdout you scrape. No shelling out, no CLI: call the
library, get the findings back as data, and decide the exit code yourself.

The library exposes exactly the loop the CLI runs: `defineConfig` routes globs
to contracts, `runCorpus` walks the tree, and you get back
`{ findings, exitCode, stats }`.

## 1. Write the check as a build step

One TypeScript file: the contract (here in the library's combinators), the
config that routes files to it, one `runCorpus` call, and the printing you want.

```ts
// scripts/check-docs.ts — runs as part of the build
import { z } from "zod";
import {
  contract,
  sections,
  section,
  defineConfig,
  runCorpus,
  formatFinding,
  countByLevel,
} from "markdown-contract";

const guide = contract({
  frontmatter: z.object({ title: z.string().min(1) }),
  body: sections({ order: "strict", allowUnknown: true }, [
    section("Overview"),
    section("Steps"),
  ]),
});

const config = defineConfig({
  rules: [{ include: ["guides/**/*.md"], contract: guide, name: "guide" }],
});

const { findings, exitCode, stats } = runCorpus(config, { cwd: "docs" });

console.log(
  `docs: scanned ${stats.filesScanned}, matched ${stats.filesMatched}, unmatched ${stats.filesUnmatched}`,
);
if (stats.filesMatched === 0) {
  // a glob typo would otherwise "pass" by checking nothing
  console.error("no files matched any rule — check the globs");
  process.exit(2);
}
for (const f of findings) {
  console.error(`${f.path} ${formatFinding(f)}`);
}
const { error, warn } = countByLevel(findings);
console.log(`${error} error(s), ${warn} warning(s)`);

process.exit(exitCode); // 0 clean, 1 on any error-level finding
```

The pieces: `runCorpus` returns data and **never** calls `process.exit` — your
script owns termination. `stats` tells you what the walk actually covered.
`formatFinding` renders one finding as `[id] (location): message` — it doesn't
include the file path, so the loop prefixes `f.path` (already relative to
`cwd`). All four exports are on the [API reference](/reference/api/).

:::note
The package is not yet on npm — build it from source and link/pack it so
`import ... from "markdown-contract"` resolves; see
[Getting started](/getting-started/). If you'd rather keep the contract in YAML
alongside the CLI's config, the [YAML front-end](/reference/yaml/) compiles to
the same `Contract` objects this script builds in code.
:::

## 2. Run it

The fixture tree has two guides under `docs/guides/`: `getting-started.md`
conforms; `deploy.md` stops after its *Overview* — no *Steps* section. Run the
script with your TypeScript runner (shown here with `bun`; `tsx` or compiling
first works the same):

```sh
bun scripts/check-docs.ts
```

```text
docs: scanned 2, matched 2, unmatched 0
guides/deploy.md [structure/section-missing] (line 5): required section ‘Steps’ is missing
1 error(s), 0 warning(s)
```

The process exits **1** — `runCorpus` returned `exitCode: 1` because an
error-level finding is present. Add the missing `## Steps` to `deploy.md` and
the same command prints:

```text
docs: scanned 2, matched 2, unmatched 0
0 error(s), 0 warning(s)
```

— and exits **0**.

:::tip
Check `stats.filesMatched` before you celebrate an empty findings list. A
mistyped glob (or a wrong `cwd`) yields zero matched files and zero findings —
a check that passes by checking nothing. The script above exits **2** in that
case, mirroring the CLI's convention that `2` means a usage/config error rather
than a document problem.
:::

## 3. Wire it into the build

Because the script exits non-zero on findings, `&&` sequencing is the whole
integration — the build never runs against broken docs, locally or in CI:

```json
{
  "scripts": {
    "check:docs": "bun scripts/check-docs.ts",
    "build": "bun run check:docs && node scripts/build.mjs"
  }
}
```

In CI the same non-zero status fails the job with no extra wiring, exactly as
in [Guard a folder of docs in CI](/recipes/guard-a-folder-in-ci/) — except here
the gate is your own script, and the findings are still in scope as data if you
want to do more than print them.

## What's happening

- **`runCorpus` is the whole engine loop.** It walks every file under `cwd`,
  routes each to the *first* rule whose `include` matches (and `exclude`
  doesn't), validates it against that rule's contract, and aggregates. The
  returned `exitCode` is only ever `0` (no error-level finding anywhere) or `1`
  (at least one); `2` is reserved for usage errors and is layered on by callers
  — the CLI does it, and so does the script above. See the
  [corpus runner section of the API reference](/reference/api/).
- **The CLI is exactly this script.** `markdown-contract validate` compiles
  your YAML into the same `Contract` objects, calls `runCorpus`, prints, and
  exits with the returned code — nothing in the [CLI](/reference/cli/) is
  unreachable from the library. More in-process patterns (scoping with
  `include`/`exclude`, gating a vitest suite, first-match routing) are in
  [Embed & Automate](/examples/embed-and-ci/).
- **`stats` is your coverage report**: `filesScanned` (everything the walk
  visited), `filesMatched` (routed to a rule and validated), `filesUnmatched`
  (scanned but matching no rule), and `matchedByRule` (a count per rule, by
  index).
- **Findings are plain data** — `id`, `level`, `path`, optional
  `pos: { line, col }`, `message` — so anything beyond printing (filtering by
  area, tallying, diffing against a baseline) is ordinary array code. The full
  id catalog is in the [findings reference](/reference/findings/).

## Next

- [Surface findings as editor diagnostics](/recipes/findings-to-editor-diagnostics/)
  — the same `runCorpus` call feeding an editor instead of a terminal.
- [Fail only on new findings vs a baseline](/recipes/baseline-and-diff-findings/)
  — adopt validation on a corpus that isn't clean yet.
- [Guard a folder of docs in CI](/recipes/guard-a-folder-in-ci/) — the CLI
  counterpart, when a shell step is all you need.
