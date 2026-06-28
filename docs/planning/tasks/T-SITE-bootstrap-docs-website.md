---
type: task
schema_version: '5'
id: T-SITE
status: open/ready
created: '2026-06-28'
last_reviewed: '2026-06-28'
related:
- '[[M-0003-example-use-case-catalog]]'
- '[[D-0010-distribution-single-exec-and-web-ui]]'
depends_on:
- '[[T-MOON-adopt-moon-monorepo]]'
tags:
- docs
- website
- marketing
- moon
- examples
need_human_review: true
impact: high
complexity: large
autonomy: supervised
---
# Bootstrap the marketing + docs website from the example catalog

## Goal

Stand up the public marketing + documentation **website** for markdown-contract, generated
from the [[M-0003-example-use-case-catalog]] catalog, as a new project in the moon monorepo
(e.g. `apps/docs`) alongside `packages/core` and `apps/web` — per
[[D-0010-distribution-single-exec-and-web-ui]] § D7.

## Today

There is no public website. The example catalog exists as a planning document
([[M-0003-example-use-case-catalog]]): 8 categories, 99 additive examples, each with an
`id` / `name` / `demonstrates` / `artifact` / `surfaces` / `builds_on` and a coverage
verdict. The repo is adopting a moon-orchestrated workspace
([[T-MOON-adopt-moon-monorepo]]); the site is a natural additional **build aspect** there.

## Proposed

A docs/marketing site whose structure mirrors the catalog: each category → a docs section;
each example → a documented unit rendering its `artifact` verbatim; `builds_on` → an ordered
ladder within each category with cross-linked prerequisites; a landing page whose hero tour
pulls the rank-1 example from each category. Artifacts are wired so they can be
regression-checked against real CLI/library output, keeping snippets honest.

## Approach

1. Land **after** [[T-MOON-adopt-moon-monorepo]] so the site is a moon project, not a
   bespoke build.
2. Pick the static-site stack — the Nuxt SPA is already in-house per
   [[D-0010-distribution-single-exec-and-web-ui]]; reuse it or a docs generator.
3. Model the catalog as data (the example-entry schema) so pages are *generated*, not
   hand-copied.
4. Apply the flagged snippet corrections before publishing (the rule-id drift in
   `CLI-02/03/05/06`; mark `--infer-bounds` as not-yet-implemented).
5. Add a check that renders each artifact and diffs it against real tool output.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `apps/docs/**` | new | the site project (pages generated from the catalog) |
| `moon.yml` / workspace config | modify | register the new project + its build task |
| catalog data export | new | the example-entry records the site renders from |

## Acceptance criteria

- [ ] AC-1: A site project exists in the monorepo and builds via moon.
- [ ] AC-2: Every catalog category renders as a section; every example renders with its
  artifact and a link to its `builds_on` prerequisite.
- [ ] AC-3: The landing page presents a hero tour (one rank-1 example per category).
- [ ] AC-4: The flagged snippet corrections are applied; `--infer-bounds` is documented as
  planned / no-op.
- [ ] AC-5: Snippets are regression-checked against real CLI/library output.

## Out of scope

Writing the missing library tests (separate follow-ups); the `daemon` / local web-UI
([[D-0010-distribution-single-exec-and-web-ui]]); hosting and deploy specifics.

## Dependencies

Depends on [[T-MOON-adopt-moon-monorepo]] (the monorepo it slots into) and the catalog
[[M-0003-example-use-case-catalog]]; aligns with
[[D-0010-distribution-single-exec-and-web-ui]].
