---
title: Check an Astro content collection's body
description: Astro's content collections validate frontmatter — but not the prose. Enforce the section structure, checklists, and length caps your collection schema can't see.
---

**The situation.** You use [Astro content
collections](https://docs.astro.build/en/guides/content-collections/) for your
docs or blog. Astro's `z`-based collection schema already validates **frontmatter**
— `title`, `pubDate`, `tags`. But it never looks at the **body**: nothing stops a
tutorial from shipping without a *Steps* section, or a "checklist" that's really a
plain bullet list, or an overview that balloons past the length your layout
assumes.

markdown-contract checks exactly the part Astro's schema can't: the section
structure and content of the prose.

:::note
markdown-contract parses GitHub-flavored markdown plus YAML frontmatter, so it
covers `.md` collection entries. `.mdx` files carry JSX the parser doesn't
evaluate — keep body contracts on your `.md` content, or split the JSX-heavy
pages into their own rule.
:::

## 1. A contract for the body

Let Astro keep validating frontmatter; here we only assert what it can't. This
contract requires an `Overview` (capped in length), a `Prerequisites` checklist,
and a `Steps` section — while allowing extra sections and extra frontmatter:

```yaml
# tutorial.contract.yaml
mcVersion: 1
kind: contract
frontmatter:
  strict: false                        # Astro's schema owns frontmatter; don't fight it
  fields:
    title: { type: string, min: 1 }
body:
  order: recognized-relative
  allowUnknown: true
  sections:
    - section: Overview
      content: { maxWords: 80 }        # keep the intro short
    - section: Prerequisites
      content: { list: { everyItem: checkbox } }   # a real checklist, not prose bullets
    - section: Steps
    - section: Summary
      optional: true
```

The content leaves (`maxWords`, `list`, and friends like `table` and `code`) are
in the [Declarative YAML reference](/reference/yaml/) and shown one at a time in
[Contracts in Code](/examples/validation-planes/).

## 2. Run it over the collection

Point `validate` at the collection directory. With one good entry and one that
skips *Steps* and uses plain bullets for prerequisites:

```sh
markdown-contract validate src/content/docs --contract tutorial.contract.yaml
```

```text
Scanned 2 files; 2 matched, 0 unmatched

broken.md:4 error structure/section-missing — required section ‘Steps’ is missing
broken.md:7 error content/list/item-kind — list item is not a checkbox (‘- [ ]’ / ‘- [x]’)

2 finding(s): 2 error, 0 warn, 0 report
```

Both are body-level problems an Astro collection schema would never catch — and
both land on the exact source line. Exit **1**, so CI fails.

## 3. Run it beside `astro build`

Add one step before your build so a malformed page fails fast, in the same job:

```yaml
# .github/workflows/site.yml
name: site
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      # Install markdown-contract (from source until it's on npm — see Getting started),
      # then check content bodies before building the site:
      - run: markdown-contract validate src/content/docs --contract tutorial.contract.yaml
      - run: npm run build            # astro build
```

## What's happening

- **Astro validates frontmatter; markdown-contract validates the body.** The two
  compose — keep `strict: false` so the contract never duplicates or conflicts
  with your collection's `z` schema.
- **`content/list/item-kind`** and **`structure/section-missing`** are two of the
  engine's rule ids; the full catalog (with each rule's default level and trigger)
  is in the [Findings & rule IDs reference](/reference/findings/).
- Want the checked document back as **typed data** for a custom index or search
  build? The same contract can `read()` it into a typed model —
  [Consume as Data](/examples/consume-as-data/) and the
  [typed model reference](/reference/model/).

## Next

- [Guard a folder of docs in CI](/recipes/guard-a-folder-in-ci/) — the simplest
  single-folder gate.
- [Validate several doc types in one repo](/recipes/multiple-doc-types/) — one
  config for blog + docs + guides.
