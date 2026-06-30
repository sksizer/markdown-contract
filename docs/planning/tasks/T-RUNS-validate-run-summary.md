---
type: task
schema_version: '5'
id: T-RUNS
status: open/ready
created: '2026-06-27'
related:
- '[[C-0003-corpus-cli]]'
- '[[D-0001-finding-model]]'
- '[[M-0003-config-inference]]'
depends_on: []
tags:
- cli
- runner
- dx
- reporting
need_human_review: false
impact: medium
complexity: small
autonomy: autonomous/pr
---
# Always print a run summary on `validate` — total files scanned, and per-contract matched counts

## Goal

A consumer who runs `validate` should always see **evidence the run happened and what it routed** — even on a clean tree. Today a clean run prints exactly `No findings.` with no count of files scanned, files matched, or how they routed across the config's contracts, so the user can't tell whether the run actually scanned what they expected or silently matched nothing. Add an **additive run summary** to every `validate` run: a total-files line plus, when a multi-rule config is in play, an indented per-contract breakdown (contract name → matched count). The counts come from the runner (extended `runCorpus` return); the CLI renders them. `No findings.` stays — the summary precedes it.

## Today

`runCorpus` already walks every file but throws away the routing it computes; the CLI has the contract names but never sees the counts, and the formatter says nothing on a clean run.

| Location | Role today |
|---|---|
| `src/runner/corpus.ts#runCorpus` | Walks every file (L111–147) (`walkSync`, L130), routes each to the FIRST matching rule (`rules.find`, L136–138), validates it; returns only `{ findings, exitCode }` — no scanned / matched / per-rule counts |
| `src/runner/corpus.ts#CorpusConfig` | The rule type (L25–27): a rule is `{ include, exclude?, contract: Contract }` — it carries the compiled `Contract` OBJECT, not the contract's name, so no per-contract LABEL is recoverable inside the runner |
| `src/declarative/config.ts#compileRule` | `compileRule` / `resolveContract` (L46–91): resolves `rule.contract` (the name string `ref`, or a path, or inline) to a `Contract` and **discards the name** — the seam where the label is currently lost |
| `src/cli/run.ts#runCli` | The validate path (L170–190): builds the `CorpusConfig`, calls `runCorpus`, formats via `formatHuman` / `formatJson` / `formatSarif`; types `result` as `{ findings, exitCode }` and renders findings only — no file counts |
| `src/cli/format.ts#formatHuman` | `formatHuman` (L24): returns `"No findings."` for an empty corpus; otherwise one line per finding plus a `N finding(s): …` count line (L43). No notion of a run summary |

Observed (the project is already built into `dist/`):

```
$ node dist/cli/index.js validate docs/planning
No findings.
```

No total, no per-contract routing — exactly the gap. The `markdown-contract.yaml` dogfood config routes six named contracts (`capability`, `driver`, `decision`, `milestone`, `product`, `task`), and the run silently matches them all, but the output proves none of it.

## Proposed

`runCorpus` returns run stats alongside the findings; the CLI maps the per-rule counts to the config's contract names and renders a human summary. The per-contract LABEL is made available by carrying an optional `name` on the `CorpusConfig` rule, populated by the declarative front-end (the smallest seam — see Approach §1).

**Runner return (additive).** `runCorpus` returns `{ findings, exitCode, stats }` where:

```ts
interface RunStats {
  filesScanned: number;     // every file the walk visited under the run root
  filesMatched: number;     // files routed to a rule (read + validated)
  filesUnmatched: number;   // filesScanned − filesMatched
  matchedByRule: number[];  // matched count per rule, parallel to config.rules (by index)
}
```

Invariants the runner test pins: `filesScanned === walkSync(root).length`; `filesMatched === sum(matchedByRule)`; `filesUnmatched === filesScanned − filesMatched`; `matchedByRule.length === config.rules.length`. Files removed by the global `--include` / `--exclude` pre-filter are counted as **unmatched** (scanned-but-not-routed), keeping the invariants tight and the counting purely additive inside the existing loop.

**Per-contract label (the chosen seam).** Rule→name is NOT recoverable today, so add `name?: string` to the `CorpusConfig` rule type and populate it where the name still exists — the declarative config compiler. The runner ignores `name` for routing; it is a pure label carried for the CLI to render. `runCorpus` returns counts **by index** (`matchedByRule`), and the CLI maps `matchedByRule[i]` → `config.rules[i].name`. Inline `--contract` rules (built in `buildInlineConfig`) leave `name` unset, so they render the total without per-contract rows. This keeps the runner free of CLI concerns (it returns data; the CLI renders) and respects the `cli → runner → core` flow — `name` lives on `CorpusConfig` (runner), and `declarative` already imports that type.

**Human rendering.** A pure `formatRunSummary(stats, labels)` in `src/cli/format.ts` returns the summary block; the validate path prepends it to the existing findings output. Target shape (illustrative — counts are live):

```
Scanned 39 files; 38 matched across 6 contracts, 1 unmatched
  capability: 8
  driver: 5
  decision: 9
  milestone: 2
  product: 2
  task: 12

No findings.
```

When the config has named rules, the `across K contracts` clause and the indented per-contract rows appear (one row per named rule, in rule order, including a named rule that matched 0 — useful evidence that a rule routed nothing). When NO rule has a name (a single inline `--contract` run), the breakdown and the `across K contracts` clause are omitted; a total line suffices:

```
Scanned 12 files; 12 matched, 0 unmatched

No findings.
```

| Form | Summary shape |
|---|---|
| `--config` (named rules) | total line with `across K contracts` + indented per-contract rows |
| single inline `--contract` | total line only (one unnamed rule), no per-contract rows |
| any run with findings | same summary, then a blank line, then the existing findings report |

## Approach

1. **Carry the label.** Add `name?: string` to the `CorpusConfig` rule type (`src/runner/corpus.ts:25–27`). In `src/declarative/config.ts` `compileRule` (L46–67), set `name` to the contract ref when it is a string (`typeof rule.contract === "string" ? rule.contract : undefined`) — for the dogfood config this is the human contract name (`capability`, `task`, …). Inline contract objects and inline-CLI rules leave it unset.
2. **Count in the runner.** In `runCorpus` (`src/runner/corpus.ts:111–147`) replace `rules.find(...)` with the matched rule's INDEX (`findIndex`), increment `matchedByRule[idx]` on a match, and tally `filesScanned` / `filesMatched` / `filesUnmatched` from the existing walk — no second pass. Return `{ findings, exitCode, stats }`. Export the `RunStats` type from the runner barrel (`src/runner/index.ts`).
3. **Render the summary (pure).** Add `formatRunSummary(stats, labels: Array<string | undefined>)` to `src/cli/format.ts` (peer of `formatHuman`): emit the total line, append `across K contracts` + the per-contract rows only when `labels` contains any name. Leave `formatHuman`, `formatJson`, `formatSarif` otherwise untouched.
4. **Wire the validate path.** In `src/cli/run.ts` (L170–190) widen the `result` type to include `stats`, compute `labels = config.rules.map((r) => r.name)`, and for `--format human` prepend `formatRunSummary(stats, labels)` + a blank line to the `formatHuman` output. `json` and `sarif` outputs are unchanged. Exit code is still `result.exitCode`.
5. **Peer tests.** Add cases to `src/runner/corpus.test.ts` (create if absent — a peer test for this module may already exist on another branch) pinning the stats invariants on a small multi-rule corpus and on an unmatched file. Add `formatRunSummary` cases to `src/cli/format.test.ts` (exact strings: a named multi-contract summary, an inline single-contract summary, a zero-matched named row). Add an end-to-end case to `tests/inference.cli.test.ts` asserting the rendered summary appears in `runCli` stdout (incl. on a clean run) without changing the exit code.
6. **Dogfood.** Re-run `node dist/cli/index.js validate docs/planning` and confirm it now prints the total + per-contract breakdown above `No findings.` and still exits 0.

## Files to touch

| Location | Kind | Change |
|---|---|---|
| `src/runner/corpus.ts` | modify | Add `name?` to the rule type; add `RunStats`; count scanned/matched/per-rule in `runCorpus`'s walk; return `{ findings, exitCode, stats }` |
| `src/runner/index.ts` | modify | Re-export the `RunStats` type from the barrel |
| `src/declarative/config.ts` | modify | Populate rule `name` from the contract ref string in `compileRule` |
| `src/cli/format.ts` | modify | Add pure `formatRunSummary(stats, labels)`; leave the three existing formatters intact |
| `src/cli/run.ts` | modify | Capture `stats`, build `labels` from `config.rules`, prepend the summary for `--format human` (validate path) |
| `src/runner/corpus.test.ts` | modify | Pin the stats invariants (scanned / matched / unmatched / per-rule); create if absent |
| `src/cli/format.test.ts` | modify | Pin exact `formatRunSummary` strings (named multi-contract, inline single, zero-matched row) |
| `tests/inference.cli.test.ts` | modify | Assert the rendered summary in `runCli` stdout, incl. a clean run, with unchanged exit code |

## Acceptance criteria

- [ ] AC-1: `node dist/cli/index.js validate docs/planning` prints a run-summary line carrying the TOTAL files scanned AND an indented per-contract breakdown (one row per named contract) **even though it reports `No findings.`**, and still exits 0.
- [ ] AC-2: The counts come from `runCorpus`'s extended return (`stats`), not re-walked or recomputed in the CLI; `runCorpus` returns `{ findings, exitCode, stats }` with `filesScanned`, `filesMatched`, `filesUnmatched`, and `matchedByRule` (parallel to `config.rules`).
- [ ] AC-3: The runner invariants hold: `filesScanned === walkSync(root).length`, `filesMatched === sum(matchedByRule)`, `filesUnmatched === filesScanned − filesMatched`, `matchedByRule.length === config.rules.length`; a file matching no rule (or removed by the global pre-filter) is counted as unmatched.
- [ ] AC-4: Per-contract rows appear only when contract names exist (the `--config` form). A single inline `--contract` run prints the total (matched / unmatched) WITHOUT per-contract rows, via the `name`-less rule from `buildInlineConfig`.
- [ ] AC-5: The summary shows on runs WITH findings too — it precedes the existing findings report (and `No findings.` on a clean run); findings rendering, ids, ordering, and the `N finding(s): …` count line are unchanged.
- [ ] AC-6: `--format json` still emits the bare `Finding[]` (round-trips through `JSON.parse`) and `--format sarif` is byte-for-byte unchanged — the summary is human-format only.
- [ ] AC-7: Exit codes are unchanged (clean `0`, error-level `1`, usage/config `2`).
- [ ] AC-8: Peer tests cover both the runner stats (`src/runner/corpus.test.ts`) and the rendered summary (`src/cli/format.test.ts` for `formatRunSummary`; `tests/inference.cli.test.ts` for the e2e stdout, incl. a clean run); `npm run typecheck` and `npm test` stay green.

## Out of scope

- A machine-readable JSON summary. The `--format json` output is the documented bare `Finding[]` that round-trips through `JSON.parse` (and existing tests parse it as such); wrapping it as `{ findings, summary }` would break that contract, so a JSON summary object is deferred to a follow-up. This task delivers the **human** summary only.
- SARIF summary fields — its 2.1.0 schema is fixed (the run shape is dictated by the spec); SARIF output is untouched.
- The `init` post-write summary and the `init --check` drift report (`src/cli/run.ts` L341/L367/L437) — those paths already print their own group/file/clean-vs-drifted reporting and keep it; the extended `runCorpus` return is additive, so those call sites simply ignore `stats`. Only the primary `validate` path gains the run summary.
- A per-file manifest / listing — the summary is COUNTS (total, matched, unmatched, per-contract), not an enumeration of which files routed where.
- Changing routing, exit-code policy, or finding ordering.

## Dependencies

- None blocking. Builds on the corpus runner and CLI from `[[C-0003-corpus-cli]]` (the `runCorpus` return shape and the `validate` path) and the finding-rendering model in `[[D-0001-finding-model]]` (the human report this summary sits beside). A peer test `src/runner/corpus.test.ts` may already exist on another branch — add cases to it rather than replacing it.
