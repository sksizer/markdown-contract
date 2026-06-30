---
type: task
schema_version: '5'
id: T-NBXH
status: planning/draft
created: '2026-06-30'
related:
- T-CINF-catalog-inference-init
- T-CCLI-catalog-cli
tags: []
need_human_review: false
impact: medium
complexity: small
---
# Add a CI round-trip diffing each catalog artifact block against real verb output

## Goal

The catalog's `artifact` sketches in `docs/example-catalog.md` (and the
finalized `docs/catalog/*.yaml`) can silently drift from what the real verbs
actually emit. The `inference-init` finalization
([[T-CINF-catalog-inference-init]]) found four such drifts that only surfaced
because the YAML-ization manually re-ran `init` against the fixtures. Add a CI
round-trip that runs each catalog `artifact` block's verb and diffs the captured
output against the recorded artifact, so prose and YAML can't silently re-drift
from real behavior after merge.

> From [[T-CINF-catalog-inference-init]]: The prose inference-init sketches in
> example-catalog.md had drifted from real init output in four places; the
> YAML-ization caught and fixed each. Add a CI round-trip that runs each catalog
> artifact block's verb and diffs captured output against the recorded artifact,
> so prose and YAML can't silently re-drift from real behavior after merge.
> Complements T-D5QD (YAML<->markdown text parity), which explicitly leaves
> verb-output validation out of scope.

## Today

_TBD — receiver to fill before promoting from planning/draft._

## Proposed

_TBD — receiver to fill before promoting from planning/draft._

## Approach

_TBD — receiver to fill before promoting from planning/draft._

## Files to touch

_TBD — receiver to fill before promoting from planning/draft._

## Acceptance criteria

_TBD — receiver to fill before promoting from planning/draft._

## Out of scope

- none

## Dependencies

- none

## Discovery context

Spawned by /sdlc:spawn-task-pr on 2026-06-30 UTC from
[[T-CINF-catalog-inference-init]] in https://github.com/sksizer/markdown-contract.

### Dedup search (spawn-from-post-mortem)

Bullet: The source catalog sketches showed single-file validate <file> invocations, but the real CLI's --contract path requires a directory (a file argument errors ENOTDIR, exit 2); reconciling to honest output needed a manual judgment call to switch to directory runs — a lint that executes each catalog artifact's command against the CLI would catch un-runnable invocations automatically (likely already tracked by the catalog-artifact-verb-output-roundtrip meta-task).
Keywords searched: catalog-artifact-verb-output-roundtrip, automatically, single-file, invocations, reconciling, un-runnable, directory, meta-task
Excluded: T-CCLI-catalog-cli
Top candidates (score / status / headline):
  - 8 / open/ready / T-LCA7-dependency-updates-audit — Add Dependabot updates and a dependency-audit CI step
  - 5 / closed/done / T-INIT-config-inference-init-verb — Implement the core `init` verb — infer a tight-but-accepting config from existing markdown (single + `--meta`)
  - 4 / closed/done / T-CINF-catalog-inference-init — Finalize the Scaffold-and-Guard catalog category as verified YAML (`inference-init`)
  - 4 / open/ready / T-SPAE-spa-embed — Embed the built Nuxt SPA into the binary, served by the daemon
  - 3 / closed/done / T-TXAP-text-predicate-builders — TS-API predicate builders — `requires` / `forbids` / `textRule`
Decision: LINKED-EXISTING T-NBXH-catalog-artifact-verb-output-roundtrip
Rationale: Override of the script's keyword-ranked top match (T-LCA7-dependency-updates-audit, an "audit/CI step" boilerplate false positive). The bullet explicitly names the `catalog-artifact-verb-output-roundtrip` meta-task, and this task (T-NBXH, "Add a CI round-trip diffing each catalog artifact block against real verb output") covers the same idea — running each catalog artifact's verb against the real CLI is exactly what would catch the un-runnable invocations this bullet describes. The hyphenated token `catalog-artifact-verb-output-roundtrip` is scored as a single token, so T-NBXH's prose (which spells the words separately) never matched it and fell out of the top-5; linking here de-duplicates rather than spawning a near-identical follow-up.
