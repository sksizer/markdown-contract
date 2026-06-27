---
type: task
schema_version: '5'
id: T-5GLB
status: open/ready
created: '2026-06-27'
related:
- '[[D-0008-declarative-contract-dsl]]'
depends_on: []
tags:
- config
- globs
- runner
- dogfood
need_human_review: true
impact: low
complexity: small
autonomy: supervised
---
# Collapse the dogfood config's redundant two-entry include globs to one `**/`-prefixed glob — and lock the relied-upon root-matching semantics with a peer test

## Goal

Every routing rule in the checked-in dogfood config carries a **two-entry** `include` whose second entry is dead weight. `markdown-contract.yaml:26-37` routes the six planning doc kinds with pairs like `['**/C-*.md', 'C-*.md']`, `['**/T-*.md', 'T-*.md']`, … — but under the runner's own matcher a single `**/X-*.md` already matches a file at **any** depth, root-level (`T-0001.md`) and nested (`tasks/T-0001.md`) alike. The runner compiles `include` globs with `picomatch` under `PICOMATCH_OPTS = { dot: true }` (`src/runner/corpus.ts:46`, applied at `:50`), and under those options a leading `**/` is **zero-or-more** path segments, so it spans the root too. The bare second entry (`'C-*.md'`, `'T-*.md'`, …) therefore adds nothing — and in this corpus it matches *nothing at all*, because no id-prefixed file sits directly at the `docs/planning` run root. Collapse each rule to a single `['**/X-*.md']`, and add a peer regression test that pins the matching semantics the collapse leans on, so a future picomatch upgrade or an opts change that quietly stopped `**/` from spanning the root would fail loudly instead of silently un-routing root-level files.

## Today

The dogfood config double-specifies every rule, and the runner's glob matching has no peer test that would notice if `**/` stopped matching root-level files.

| Location | Role today |
|---|---|
| `markdown-contract.yaml:26-37` · the six `rules` | Each `include` is a two-entry pair `['**/X-*.md', 'X-*.md']` (capability `C-`, driver `DR-`, decision `D-`, milestone `M-`, product `PR-`, task `T-`); the bare second entry is redundant under the matcher and currently matches no file |
| `src/runner/corpus.ts:46` · `PICOMATCH_OPTS = { dot: true }` | The single options object every include/exclude glob is compiled under |
| `src/runner/corpus.ts:48-55` · `compile` | Maps each rule to `picomatch(r.include, PICOMATCH_OPTS)` (line 50) — the exact matching code path the collapse relies on |
| `src/runner/corpus.ts` · `runCorpus` (L111-147) | Walks the tree from the run root and matches each relative path against the compiled rules (first match wins); a `**/X-*.md` already reaches files at every depth |
| `src/runner/` | Holds `corpus.ts` + `index.ts` (barrel) only — there is **no** `corpus.test.ts`, so the runner's glob semantics are not pinned anywhere |

Verified behavior (the redundancy is real and the collapse is safe):

- `picomatch('**/T-*.md', { dot: true })` returns `true` for **both** `T-0001.md` (root) and `sub/T-0001.md` / `a/b/T-0001.md` (nested) — the leading `**/` spans zero-or-more segments, so the bare `'T-*.md'` is fully subsumed.
- Collapsing every rule to a single `['**/X-*.md']` and running `validate docs/planning` still prints `No findings.` — and a deliberately broken nested `T-` file is still flagged, so the single glob is genuinely matching the nested docs, not silently skipping them.

## Proposed

Drop the second entry from each of the six rules so each `include` is a single `['**/X-*.md']`, optionally with a one-line comment noting that one `**/`-prefixed glob matches both root-level and nested files under the engine's matcher. The DR-before-D ordering and its inline comment stay, and first-match routing is untouched (`DR-*.md` still resolves to `driver`, never `decision`).

```yaml
rules:
  - include: ['**/C-*.md']
    contract: capability
  - include: ['**/DR-*.md']    # before D-*, though DR- and D- don't overlap
    contract: driver
  - include: ['**/D-*.md']
    contract: decision
  - include: ['**/M-*.md']
    contract: milestone
  - include: ['**/PR-*.md']
    contract: product
  - include: ['**/T-*.md']
    contract: task
```

Then add a peer test `src/runner/corpus.test.ts` that drives the runner's **own** matcher and pins the contract as input→exact output: a `['**/T-*.md']` include matches `T-0001.md` (root) and `sub/T-0001.md` (nested), and rejects a non-prefixed path. Because it exercises the runner's actual `PICOMATCH_OPTS`, the test fails if the root-spanning behavior ever regresses.

## Approach

This is a **config + test** change. It is explicitly **not** an `init`/`infer` change.

The two-entry id-prefix pattern was **hand-authored**, not machine-generated. `markdown-contract.yaml` was written in PR #32 (commit `da7ebc0`, 2026-06-23), **before** the `init`/`infer` feature existed (PRs #35–39, 2026-06-27). The current `init --meta` emits *single-entry, directory-scoped* globs (`*.md`, `capabilities/**/*.md`, …) with *plural* contract names — it neither produces nor would regenerate this two-entry, id-prefix shape. So `src/declarative/infer.ts` is out of scope; nothing about this fix touches inference. The fix is confined to the hand-authored dogfood config plus the missing runner peer test.

Steps:

1. **Config.** In `markdown-contract.yaml`, collapse each of the six rules' `include` (L26-37) to a single `['**/X-*.md']`. Keep the DR-before-D ordering and its comment. Optionally add a one-line comment near the `rules:` block stating that a single `**/`-prefixed glob matches both root-level and nested files under the engine's matcher (so a future reader doesn't reintroduce the bare entry).
2. **Test seam — drive the runner's own matcher, not a re-implementation.** The matching the collapse relies on lives in `compile` at `src/runner/corpus.ts:50` (`picomatch(r.include, PICOMATCH_OPTS)`), today a private detail. Extract that into a tiny **pure** exported helper so a peer test can assert its input→output directly:
   ```ts
   /** Compile include/exclude globs under the runner's matching options (PICOMATCH_OPTS). */
   export function compileMatcher(globs: string[]): (path: string) => boolean {
     return picomatch(globs, PICOMATCH_OPTS);
   }
   ```
   Have `compile` call `compileMatcher(r.include)` / `compileMatcher(r.exclude)` so the helper *is* the code path the corpus actually runs (a test against it catches both an `opts` change **and** a picomatch upgrade — not just a hard-coded `{ dot: true }` re-spec in the test). Re-export it from the `src/runner/index.ts` barrel (barrel-only, no logic). This keeps modules factored by functionality and respects the one-way `cli → runner → core` layering (the change is wholly within `runner`). *(Alternative seam, if widening the export surface is unwanted: drive `runCorpus` over a tiny two-file temp tree — `T-0001.md` at root and `sub/T-0001.md` nested — and assert both are matched/validated. The pure helper is preferred: it is a plain input→output unit test with no fs setup, the model the repo's peer tests follow.)*
3. **Peer test.** Create `src/runner/corpus.test.ts` per the repo convention (peer file, contract-as-documentation; the `dialect/anchors.test.ts` style of input→exact output). Lead with the documentary happy path — root and nested both match — then the rejection and dot cases (see Acceptance criteria).
4. **Optional doc note.** Check `docs/planning/decisions/D-0008-declarative-contract-dsl.md` (§ CLI parameterization / globs, and the "two distinct resolution bases" bullet describing globs matching relative to the run root) and, if it reads well, add a one-line note that a single `**/`-prefixed include glob spans both the run root and nested files under the matcher. Skip if it would clutter the decision.
5. **Verify.** `node dist/cli/index.js validate docs/planning` still prints `No findings.`; `npm run typecheck` and `npm test` stay green.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `markdown-contract.yaml` | modify | Collapse each of the six rules' `include` (L26-37) to a single `['**/X-*.md']`; keep DR-before-D ordering + comment; optionally add a one-line note on `**/` spanning both depths |
| `src/runner/corpus.ts` | modify | Extract the include/exclude compile into an exported pure `compileMatcher(globs)` wrapping `picomatch(globs, PICOMATCH_OPTS)`; call it from `compile` so the test drives the real matching path |
| `src/runner/corpus.test.ts` | create | New peer test: a `['**/T-*.md']` matcher matches `T-0001.md` (root) and `sub/T-0001.md` (nested), rejects a non-prefixed path, and (dot) matches `.hidden/T-0001.md` — input→exact output, fails if root-matching regresses |
| `src/runner/index.ts` | modify | Re-export `compileMatcher` from the barrel (barrel-only, no logic) |
| `docs/planning/decisions/D-0008-declarative-contract-dsl.md` | modify (optional) | One-line note that a single `**/`-prefixed include glob matches both root-level and nested files under the matcher, in the globs/CLI-parameterization section — only if it reads cleanly |

## Acceptance criteria

- [ ] AC-1: Each of the six rules in `markdown-contract.yaml` has a single-entry `include: ['**/X-*.md']` — no rule keeps the bare `'X-*.md'` second entry.
- [ ] AC-2: `node dist/cli/index.js validate docs/planning` still prints `No findings.` (exit 0) — the collapse changes no routing outcome.
- [ ] AC-3: A new peer test `src/runner/corpus.test.ts` asserts a `['**/T-*.md']` include matches **both** `T-0001.md` (root) and `sub/T-0001.md` (nested), and does **not** match a non-prefixed path (e.g. `notes.md` or `C-0001.md`); the test drives the runner's own matcher (`compileMatcher` / `PICOMATCH_OPTS`), so it fails if `**/` ever stops matching root-level files.
- [ ] AC-4: First-match routing and the DR-before-D ordering are unchanged — `DR-*.md` still resolves to `driver` (never `decision`); the inline ordering comment is preserved.
- [ ] AC-5: `npm run typecheck` and `npm test` are green; the existing dogfood and integration corpus stay green with no golden churn.
- [ ] AC-6 (optional): If the one-line glob-semantics note is added to `D-0008`, it states that a single `**/`-prefixed include glob matches both root-level and nested files under the engine's matcher.

## Out of scope

- **`src/declarative/infer.ts` / `init` / `infer` changes.** This is not an inference bug — the two-entry pattern was hand-authored in PR #32 before `init` existed and is not what `init --meta` emits today. No inference code is touched.
- **Changing `PICOMATCH_OPTS` or swapping the glob engine.** The fix relies on the *current* matcher semantics and locks them with a test; it does not alter `{ dot: true }` or replace picomatch.
- **The const/enum inference tuning tasks** `[[T-2CSL-const-string-length-cap]]` and `[[T-3MCE-min-examples-before-const]]` — sibling config/inference work cross-linked under Dependencies, not part of this change.
- **The routed contract files and planning docs themselves** — only the config's `include` globs and the runner's test seam change; no contract or doc content is edited (beyond the optional one-line `D-0008` note).

## Dependencies

- The corpus runner and its glob matching shipped via `[[T-J9TZ-cli-and-corpus-runner]]`; this task adds the runner's first peer test (`src/runner/corpus.test.ts`) over that matching. `depends_on` is empty — the runner is already in place, so no task blocks this.
- The behavior being locked is fixed by `[[D-0008-declarative-contract-dsl]]` (§ CLI parameterization — globs match relative to the run root; the "two distinct resolution bases" bullet) — globs follow the run target, and a single `**/`-prefixed glob spans both the root and nested files.
- The config under repair was hand-authored in PR #32 (`da7ebc0`, 2026-06-23), predating the `init`/`infer` work in PRs #35–39 — which is *why* this is a config fix and not an inference fix.
- `[[T-2CSL-const-string-length-cap]]` and `[[T-3MCE-min-examples-before-const]]` — sibling tasks created in parallel that tune `init --meta` inference. They are unrelated to this config/runner change and share no code with it; landing order is independent in either direction.
