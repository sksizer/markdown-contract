---
title: Strict for published docs, lenient for drafts
description: Published pages must conform tightly, but half-written drafts shouldn't fail the build. Route each tree to its own contract — or exclude drafts entirely.
---

**The situation.** Your `published/` docs are load-bearing — readers and tooling
depend on their shape, so they should be held to a strict contract. But
`drafts/` is where half-formed pages live, and a draft with scratch frontmatter
and sections in the wrong order should **not** fail the build. You want one
`validate` run that is strict where it matters and forgiving where it doesn't.

There are two ways to get that: give drafts their own **lenient contract**, or
**exclude** them from validation altogether. Both fit in one config; this recipe
runs both and ends with when to pick which.

## 1. Two contracts: one strict, one lenient

The published contract locks everything down — strict frontmatter, strict
section order, no unlisted headings:

```yaml
# published.contract.yaml
mcVersion: 1
kind: contract
frontmatter:
  strict: true                         # no stray keys on published pages
  fields:
    title:  { type: string, min: 1 }
    status: { const: published }
body:
  order: strict                        # sections in exactly this order
  allowUnknown: false                  # no headings we haven't agreed on
  sections:
    - section: Overview
      content: { maxWords: 80 }
    - section: Details
    - section: References
      optional: true
```

The draft contract turns every dial the other way — non-strict frontmatter, any
order, any extra headings — and keeps only the floor you still want under a
draft (here: it must at least have a title):

```yaml
# draft.contract.yaml
mcVersion: 1
kind: contract
frontmatter:
  strict: false                        # scratch keys are fine while drafting
  fields:
    title: { type: string, min: 1 }    # the one thing every draft needs
body:
  order: none                          # any order
  allowUnknown: true                   # any extra headings
  sections:
    - section: Overview
      optional: true
    - section: Details
      optional: true
```

Every dial here — `strict`, `order`, `allowUnknown`, `optional` — is documented
in the [Declarative YAML reference](/reference/yaml/).

## 2. Route each tree to its contract

One config maps each folder to its contract:

```yaml
# markdown-contract.yaml   (auto-discovered from the working directory)
mcVersion: 1
kind: config
contracts:
  published: ./published.contract.yaml
  draft:     ./draft.contract.yaml
rules:
  - include: ['published/**/*.md']
    contract: published
  - include: ['drafts/**/*.md']
    contract: draft
```

## 3. Run it: the draft passes, the leaked draft fails

The fixture tree has a clean published page, a messy draft
(`drafts/webhooks.md` — scratch frontmatter keys, sections out of order, an
unlisted heading):

```markdown
---
title: Webhooks (wip)
todo: figure out retry story
mood: optimistic
---

## Random thoughts

Retries? Signatures? Ask the platform team.
...
```

…and one page that was promoted to `published/` before it was ready
(`published/pagination.md` — `status: draft`, a `reviewer` key, no *Details*,
and a heading the contract never agreed to). Run the whole tree:

```sh
markdown-contract validate .
```

```text
Scanned 6 files; 3 matched across 2 contracts, 3 unmatched
  published: 2
  draft: 1

published/pagination.md:3 error frontmatter/enum — frontmatter field ‘status’ must be ‘published’
published/pagination.md:4 error frontmatter/unknown-key — unknown frontmatter key ‘reviewer’
published/pagination.md:7 error structure/section-missing — required section ‘Details’ is missing
published/pagination.md:11 error structure/section-order — unexpected section ‘Open questions’ in the strict prefix; extras are only permitted after a gap

4 finding(s): 4 error, 0 warn, 0 report
```

Read the summary: the messy draft **matched** (`draft: 1`) and produced zero
findings — every error is in `published/`. The exact same document would fail
all four checks under the published contract; under the draft contract it's
fine. Exit **1**, so CI blocks the leaked draft. Fix `pagination.md` (or move
it back to `drafts/`) and the run is clean:

```text
Scanned 6 files; 3 matched across 2 contracts, 3 unmatched
  published: 2
  draft: 1

No findings.
```

Exit **0**. The CI step is the usual one-liner, exactly as in
[Guard a folder of docs in CI](/recipes/guard-a-folder-in-ci/):

```yaml
# .github/workflows/docs.yml — install from source first (see Getting started),
# then gate on the exit code:
- run: markdown-contract validate .
```

## Alternative: just exclude drafts

If drafts deserve no checking at all, skip the second contract and carve the
folder out of the rule:

```yaml
# markdown-contract.yaml
mcVersion: 1
kind: config
contracts:
  published: ./published.contract.yaml
rules:
  - include: ['**/*.md']
    exclude: ['drafts/**']             # drafts are simply not checked
    contract: published
```

The same tree now scans with drafts left unmatched — the broken published page
still fails, the draft is invisible:

```text
Scanned 5 files; 2 matched across 1 contract, 3 unmatched
  published: 2

published/pagination.md:3 error frontmatter/enum — frontmatter field ‘status’ must be ‘published’
published/pagination.md:4 error frontmatter/unknown-key — unknown frontmatter key ‘reviewer’
published/pagination.md:7 error structure/section-missing — required section ‘Details’ is missing
published/pagination.md:11 error structure/section-order — unexpected section ‘Open questions’ in the strict prefix; extras are only permitted after a gap

4 finding(s): 4 error, 0 warn, 0 report
```

:::tip[Which to pick?]
**Two contracts** when drafts still deserve a floor. The draft contract above
guarantees every draft has a title, and the run summary keeps counting drafts
(`draft: 1`) — you can see them, and you can tighten the contract as the folder
matures. Promoting a doc is just `git mv drafts/x.md published/x.md`; the
stricter bar follows the folder.

**Exclude** when drafts are true scratch space and any red ink there is noise.
It's one less contract to maintain — but drafts fall into the anonymous
"unmatched" count alongside every other unrouted file, so nothing distinguishes
"deliberately skipped" from "forgot to route", and a titleless, frontmatter-less
draft is just as invisible as a tidy one.
:::

## What's happening

- **Strictness is per-contract, not per-run.** `strict`, `order`, and
  `allowUnknown` live inside each contract, so one run can hold different trees
  to different bars — the routing rules decide which bar applies to which file.
  Rule matching is first-match-wins, as in
  [Validate several doc types in one repo](/recipes/multiple-doc-types/).
- **The lenient contract is still a contract.** `order: none` +
  `allowUnknown: true` + `optional` sections wave almost anything through, but
  `title: { type: string, min: 1 }` still fires `frontmatter/required` on a
  draft with no title — a floor, not a free pass. The full rule catalog is in
  the [Findings reference](/reference/findings/).
- **`exclude` removes files from the rule's match**, so excluded drafts land in
  the "unmatched" count and contribute nothing to the exit code. Only
  error-level findings flip the exit to **1** — the
  [exit-code contract](/reference/cli/#exit-codes) is what CI gates on.

## Next

- [Errors block the build, warnings annotate the PR](/recipes/warnings-as-pr-annotations/)
  — a third softness dial: keep checking drafts but demote their findings.
- [Validate several doc types in one repo](/recipes/multiple-doc-types/) — the
  general glob-routing pattern this recipe is a special case of.
- [Declarative YAML examples](/examples/declarative-yaml/) — the contract
  vocabulary, one worked example at a time.
