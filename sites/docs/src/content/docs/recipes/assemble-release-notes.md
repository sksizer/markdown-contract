---
title: Assemble release notes from a changelog's sections
description: Your CHANGELOG.md has one Release section per release. Read the latest one out as the GitHub release body — typed, positional, and guaranteed to be there.
---

**The situation.** Your repo keeps a `CHANGELOG.md` with one `## Release` section
per release, newest first. Every time you tag, someone copies the top section
into the GitHub release form by hand — and sometimes copies the wrong one, or
tags before the changelog was updated at all. You want a script that reads the
changelog, takes the latest section, and emits it as the release body — and
*fails* if the changelog isn't in the agreed shape.

This is a **consume-as-data** recipe: the contract that validates the changelog
is the same object that hands the sections back as typed, ordered data.

## 1. The changelog convention

One `## Release` heading per release, newest first; the version and date on the
first prose line; the changes as bullets below it:

```markdown
# Changelog

## Release

**v1.4.0** — 2026-07-11

- Added `--format sarif` output to `validate`
- `init` now infers repeatable sections from duplicate peer headings

## Release

**v1.3.2** — 2026-06-27

- Fixed Windows path separators in finding locations

## Release

**v1.3.1** — 2026-06-20

- First tagged release
```

:::note
A repeatable slot binds sections whose heading text repeats **exactly** — that's
why the heading is a literal `## Release` and the version lives in the body, not
in the heading. If your changelog puts versions in the headings (`## 1.4.0`),
each heading is a different name and no single slot matches them; see
[repeatable sections](/how-it-works/#repeatable-sections) for what the matcher
considers a repeat.
:::

## 2. One contract, read as data

`section("Release", { repeatable: true, min: 1 })` declares the shape: the
heading may recur as peers, and there must be at least one. `read()` is the
fail-fast door — it returns the typed model or throws, so by the time the script
prints anything, the changelog is known-good:

```ts
// scripts/release-notes.ts — print the latest release's notes from CHANGELOG.md
import { readFileSync } from "node:fs";
import { contract, sections, section } from "markdown-contract";

const changelog = contract({
  body: sections({ order: "none", allowUnknown: true }, [
    section("Release", { repeatable: true, min: 1 }),
  ]),
});

const source = readFileSync("CHANGELOG.md", "utf8");
const doc = changelog.read(source, { path: "CHANGELOG.md" }); // throws ContractError if malformed

const releases = doc.body.Release; // SectionView[] — every ## Release, newest first
const latest = releases[0];

// The changelog's head must be the release we're about to publish.
const tag = process.argv[2];
if (tag && !latest.text().startsWith(tag)) {
  console.error(`refusing: changelog head is "${latest.text()}", expected ${tag}`);
  process.exit(1);
}

// The latest section's body, verbatim: from the line after its heading down to
// the line before the next Release heading (pos is 1-indexed).
const lines = source.split("\n");
const end = releases.length > 1 ? releases[1].pos.line - 1 : lines.length;
console.log(lines.slice(latest.pos.line, end).join("\n").trim());
```

:::tip
The static type keys the body by the **exact heading name** — `doc.body.Release`
is what typechecks. At runtime the lowerCamelCase alias `doc.body.release`
resolves to the same array; use the exact key in typed code and the alias stays
available for dynamic access. Both keys are part of the
[dual-key model](/reference/model/).
:::

## 3. Run it

Against the changelog above, passing the tag being released:

```sh
bun scripts/release-notes.ts v1.4.0
```

```text
**v1.4.0** — 2026-07-11

- Added `--format sarif` output to `validate`
- `init` now infers repeatable sections from duplicate peer headings
```

Exit **0**, and stdout is the release body, verbatim markdown — bullets, inline
code, and all — ready to hand to `gh release create`. Pass a tag the changelog
head doesn't match and the script refuses instead:

```sh
bun scripts/release-notes.ts v9.9.9
```

```text
refusing: changelog head is "v1.4.0 — 2026-07-11", expected v9.9.9
```

Exit **1** — the tag and the changelog disagree, so no release notes go out. And
if someone renames the heading (`## Releases`) or empties the file, `read()`
throws a `ContractError` carrying the finding —
`[structure/section-missing] (line 3): required section ‘Release’ is missing` —
before the script reaches the emit step at all.

## 4. Wire it into the release workflow

On a tag push, generate the notes and create the release in two steps. The tag
ref names the release; the changelog supplies the body; the script's exit code
guarantees they agree:

```yaml
# .github/workflows/release.yml
name: release
on:
  push:
    tags: ['v*']
jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      # Install markdown-contract first — it's built from source until it's on
      # npm; see Getting started. Then assemble and publish the notes:
      - run: bun scripts/release-notes.ts "$GITHUB_REF_NAME" > notes.md
      - run: gh release create "$GITHUB_REF_NAME" --notes-file notes.md
        env:
          GH_TOKEN: ${{ github.token }}
```

A tag pushed before the changelog was updated fails the first step, so the
release is never created with stale notes.

## What's happening

- **`repeatable: true` turns a slot into a positional array.** Normally a heading
  that recurs is an error; a repeatable slot waives that for its own peers, and
  the slot's key binds a `SectionView[]` in document order — newest first, because
  that's the order they appear in the file. `min: 1` makes an empty changelog an
  error-level finding. See [repeatable sections](/how-it-works/#repeatable-sections)
  and the [model reference](/reference/model/).
- **`read()` is validation and consumption in one call.** There is no separate
  "check it first" step — the typed model only exists for a document with no
  error-level finding, so `releases[0]` can't be reached on a malformed changelog.
  The findings ride on the thrown `ContractError` if you want to print them; see
  the [API reference](/reference/api/).
- **`pos` makes "the section's verbatim text" a two-line slice.** Every
  `SectionView` carries its heading's 1-indexed source position, and repeatable
  peers are ordered, so one release's body runs from `latest.pos.line` (the line
  after its heading, once 0-indexed) to just before the next peer's heading.
  `text()` would hand back the flattened prose only — the slice keeps the bullet
  list and inline markup intact for the release body.
- **The latest N is a `slice`.** `releases.slice(0, 3)` with the same
  boundary math assembles a combined notes file for a catch-up release.

## Next

- [Feed an agent prompt-cards guaranteed to parse](/recipes/prompt-cards-for-agents/)
  — the same read-or-throw pattern feeding an LLM instead of a release.
- [Build an index from your docs' frontmatter and tables](/recipes/build-an-index-from-frontmatter/)
  — consume a whole folder as typed data, not just one file.
- [Consume as Data](/examples/consume-as-data/) — the full worked tour of the
  typed model: tables, lists, anchors, nested sections.
