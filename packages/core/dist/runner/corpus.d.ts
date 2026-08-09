import picomatch from "picomatch";
import type { Contract, Finding } from "../core/index.js";
/**
 * The directory → contract config. A flat ordered list of rules: each maps an
 * `include` glob set (minus an optional `exclude` set) to the `contract` that
 * governs the matched files. Rule order is significant — a file is validated
 * against the FIRST rule it matches (see `runCorpus`).
 *
 * `name` is an OPTIONAL human label for the rule's contract (e.g. `capability`,
 * `task`), carried purely for the CLI's run summary to render per-contract counts.
 * The runner never routes on it — routing is by glob, and `runCorpus` returns
 * matched counts by index (`RunStats.matchedByRule`). The declarative front-end
 * populates it from a string contract ref; inline contracts leave it unset.
 */
export interface CorpusConfig {
    rules: Array<{
        include: string[];
        exclude?: string[];
        contract: Contract;
        name?: string;
    }>;
}
/**
 * Per-run counts `runCorpus` returns alongside the findings, for the CLI's run summary.
 * The counts are tallied inside the single walk (no second pass), so they always satisfy:
 * `filesScanned === walkSync(root).length`, `filesMatched === sum(matchedByRule)`,
 * `filesUnmatched === filesScanned − filesMatched`, and `matchedByRule.length === config.rules.length`.
 * A file removed by the global `include`/`exclude` pre-filter, or matching no rule, counts as UNMATCHED.
 */
export interface RunStats {
    /** every file `walkSync` visited under the run root. */
    filesScanned: number;
    /** files routed to a rule (read + validated). */
    filesMatched: number;
    /** `filesScanned − filesMatched` — scanned but not routed (pre-filtered out or matching no rule). */
    filesUnmatched: number;
    /** matched count per rule, parallel to `config.rules` by index. */
    matchedByRule: number[];
}
/**
 * Identity helper that types a config for `markdown-contract.config.{js,mjs}`.
 * Passthrough is correct here — its only job is to attach the `CorpusConfig` type
 * at the call site so authors get completion and checking on their config literal.
 */
export declare function defineConfig(config: CorpusConfig): CorpusConfig;
/**
 * Compile a glob set into a matcher under the runner's own matching options (`PICOMATCH_OPTS`).
 * This is the single code path `compile` uses for both `include` and `exclude`, so a test that
 * drives it exercises the runner's real semantics — notably that a single `**\/`-prefixed glob
 * spans both the run root and nested files (so configs need only one entry per rule). A test
 * against this helper fails if those semantics ever regress (an `opts` change or a picomatch
 * upgrade), rather than passing against a re-specified `{ dot: true }` in the test.
 */
export declare function compileMatcher(globs: string[]): ReturnType<typeof picomatch>;
/**
 * Run a config across a document tree and aggregate findings, returning a
 * CI-meaningful exit code.
 *
 * Traversal: walk every file under `cwd` (default `process.cwd()`). For each file,
 * find the FIRST rule whose `include` matches and whose `exclude` does not, and
 * validate the file against that rule's contract. First-match (not multi-match) is
 * deliberate: it makes the run deterministic and lets a config place a specific
 * rule ahead of a catch-all without a file being double-reported. A file that
 * matches no rule is skipped.
 *
 * Each file is read and validated via `contract.validate(source, { path })` where
 * `path` is the file's path relative to `cwd` (POSIX-separated); the engine stamps
 * that path onto every finding, so findings already carry their file location and
 * are deterministically sorted within the file.
 *
 * An optional global `include` / `exclude` pre-filter narrows the run *before* rule
 * matching, independent of the config's own per-rule globs: a file is considered only
 * if it matches at least one `include` glob (when any are given) and no `exclude` glob.
 * This is an AND-narrowing (a file must satisfy both the pre-filter and a rule), so it
 * works uniformly across an inline contract and a multi-rule `--config` — something a
 * per-rule glob list can't express. All globs are matched relative to `cwd`.
 *
 * Exit-code policy (AC-2): `0` when no `error`-level finding exists across the whole
 * corpus, `1` when any `error`-level finding is present. `2` is reserved for
 * usage/config errors and is raised by the CLI layer, never here — this function
 * only ever returns `0` or `1`, so the CLI can layer `2` on top.
 */
export declare function runCorpus(config: CorpusConfig, opts?: {
    format?: "human" | "json" | "sarif";
    cwd?: string;
    include?: string[];
    exclude?: string[];
}): {
    findings: Finding[];
    exitCode: number;
    stats: RunStats;
};
//# sourceMappingURL=corpus.d.ts.map