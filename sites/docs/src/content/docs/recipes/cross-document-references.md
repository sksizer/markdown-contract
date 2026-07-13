---
title: depends_on must point at documents that exist
description: Your docs reference each other by id in frontmatter — and nothing notices when a deleted or renamed doc leaves a dangling reference. Collect the id set, then resolve every reference against it.
---

**The situation.** Your decision records reference each other by id:
`depends_on: [D-0002]` in the frontmatter means *this decision builds on that
one*. Then someone deletes `D-0009.md` — or renames it during a reshuffle — and
every `depends_on` still pointing at it silently dangles. No parser complains;
the graph is just quietly wrong. You want the build to fail with the file and
the missing id.

:::note
There is **no built-in cross-file rule**. Contracts validate one document at a
time — even a custom [`docRule`](/reference/api/) sees a single typed `Doc`,
never the rest of the corpus. Cross-document checks are an *assembly you
write*: validate every file, collect the id set, then resolve every reference
against it. This recipe is that assembly — under fifty lines.
:::

## 1. Type the reference fields in a contract

The check needs two things from every file, reliably typed: its `id` and its
`depends_on` list. That's a contract's job. Authored in TypeScript (the
[code API](/reference/api/)), the frontmatter schema is plain Zod:

```ts
import { contract, lenientBody, section } from "markdown-contract";
import { z } from "zod";

const decision = contract({
  frontmatter: z.object({
    id: z.string().regex(/^D-\d{4}$/),
    depends_on: z.array(z.string()).default([]),
  }),
  body: lenientBody([section("Decision")]),
});
```

The `.default([])` matters: a record with no dependencies needs no
`depends_on:` line, and the typed read-back still hands you an array.

## 2. Collect the ids, then resolve every reference

Two passes over the folder. Pass 1 validates each file and collects each valid
document's `id`; pass 2 checks every `depends_on` target against that set and
reports misses as *path + missing id*:

```ts
// check-refs.ts — validate each file, collect the id set, then resolve references
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { contract, lenientBody, section, findingLocation } from "markdown-contract";
import { z } from "zod";

const decision = contract({
  frontmatter: z.object({
    id: z.string().regex(/^D-\d{4}$/),
    depends_on: z.array(z.string()).default([]),
  }),
  body: lenientBody([section("Decision")]),
});

const dir = "docs/decisions";
const files = readdirSync(dir).filter((f) => f.endsWith(".md")).sort();

// Pass 1 — validate every file; collect each valid document's id.
const ids = new Set<string>();
const docs: Array<{ path: string; dependsOn: string[] }> = [];
let failed = false;

for (const file of files) {
  const path = join(dir, file);
  const { findings, doc } = decision.validate(readFileSync(path, "utf8"), { path });
  for (const f of findings) {
    console.error(`${findingLocation(f, { withPath: true })} ${f.level} ${f.id} — ${f.message}`);
  }
  if (!doc) {
    failed = true; // error-level findings: no typed model, and no trustworthy id
    continue;
  }
  ids.add(doc.frontmatter.id);
  docs.push({ path, dependsOn: doc.frontmatter.depends_on });
}

// Pass 2 — every depends_on target must be an id some document defines.
for (const { path, dependsOn } of docs) {
  for (const target of dependsOn) {
    if (!ids.has(target)) {
      failed = true;
      console.error(`${path} error refs/depends-on — depends_on ‘${target}’ matches no document id`);
    }
  }
}

process.exit(failed ? 1 : 0);
```

## 3. Run it

Three records, where `D-0003.md` declares `depends_on: [D-0002, D-0009]` — and
`D-0009` doesn't exist:

```sh
bun check-refs.ts
```

```text
docs/decisions/D-0003.md error refs/depends-on — depends_on ‘D-0009’ matches no document id
```

Exit **1**. Fix or drop the reference and the run prints nothing and exits
**0** — the same exit-code gate the [CLI](/reference/cli/) uses.

If a file fails its *own* contract in pass 1, its findings print first in the
standard `path:line level id — message` shape (that's what `findingLocation`
with `withPath` is for), and the file is skipped: it contributes no id, so the
run can't vouch for references into a broken document.

## 4. Wire it into CI

The script is the gate — its exit code fails the job:

```yaml
# .github/workflows/docs.yml
name: docs
on: [push, pull_request]
jobs:
  doc-refs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      # Install markdown-contract first — it's built from source until it's on
      # npm; see Getting started. Then run the reference check:
      - run: bun check-refs.ts
```

## What's happening

- **Why two passes.** A contract — and every `docRule` inside one — validates a
  single document; the id set is *corpus-level* state no per-document rule can
  see. So the assembly inverts the layering: your script owns the corpus walk
  and the set, and the contract does what it's good at per file — typing
  `frontmatter.id` and `frontmatter.depends_on` so pass 2 never touches raw
  YAML. [Real-World Schemas](/examples/real-world-schemas/) sketches the same
  inversion (there, as a `docRule` closing over a pre-collected id set) in
  [its dangling-depends_on example](/examples/real-world-schemas/real-world-schemas-12/).
- **`validate` never throws**, and `doc` is present exactly when there are no
  error-level findings — which is why `if (!doc)` is the complete "is this file
  trustworthy" test. The [API reference](/reference/api/) documents
  `ValidationResult`, `findingLocation`, and friends.
- **The pattern generalizes.** Any frontmatter field that names other documents
  — `supersedes`, `related_to`, a milestone's `members` — is the same recipe:
  type the field in the contract, collect the key set in pass 1, assert
  membership in pass 2. Only the field name and the error message change.

:::tip
Keep the check's output in the findings line shape (`path … id — message`), as
above. Whatever later consumes your CI logs — a grep, an annotation script, an
agent — gets one format for engine findings and cross-file misses alike.
:::

## Next

- [Every document names a real owner](/recipes/enforce-owner-across-tree/) —
  the same assembly, resolving a frontmatter field against an external roster
  instead of the corpus's own ids.
- [Build an index from your docs' frontmatter](/recipes/build-an-index-from-frontmatter/)
  — pass 1 of this recipe, feeding an index instead of a check.
- [Library API reference](/reference/api/) — `validate`, the typed `Doc`, and
  the finding helpers this script leans on.
