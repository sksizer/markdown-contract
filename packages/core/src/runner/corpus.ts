/**
 * Corpus runner — config (globs → contracts) → aggregated findings across a tree
 * of documents, plus a CI-meaningful exit code (C-0003). Library API, not CLI-only:
 * other consumers reuse it in-process rather than shelling out. Reads files and
 * returns data; never owns argv or `process.exit`.
 *
 * Depends on `../core`; never imports from `../cli`. The traversal walks the tree
 * from `cwd`, matches each file against the config's `include`/`exclude` globs
 * (via `picomatch`), and runs the FIRST matching rule's contract over it
 * (first-match for determinism — see `runCorpus`).
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";

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
  rules: Array<{ include: string[]; exclude?: string[]; contract: Contract; name?: string }>;
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
export function defineConfig(config: CorpusConfig): CorpusConfig {
  return config;
}

/** A rule with its include/exclude matchers compiled once, ahead of the walk. */
interface CompiledRule {
  include: ReturnType<typeof picomatch>;
  exclude: ReturnType<typeof picomatch> | null;
  contract: Contract;
}

/** picomatch options — `dot` so dotfiles match like any other file. */
const PICOMATCH_OPTS = { dot: true } as const;

/**
 * Compile a glob set into a matcher under the runner's own matching options (`PICOMATCH_OPTS`).
 * This is the single code path `compile` uses for both `include` and `exclude`, so a test that
 * drives it exercises the runner's real semantics — notably that a single `**\/`-prefixed glob
 * spans both the run root and nested files (so configs need only one entry per rule). A test
 * against this helper fails if those semantics ever regress (an `opts` change or a picomatch
 * upgrade), rather than passing against a re-specified `{ dot: true }` in the test.
 */
export function compileMatcher(globs: string[]): ReturnType<typeof picomatch> {
  return picomatch(globs, PICOMATCH_OPTS);
}

function compile(config: CorpusConfig): CompiledRule[] {
  return config.rules.map((r) => ({
    include: compileMatcher(r.include),
    exclude: r.exclude && r.exclude.length > 0 ? compileMatcher(r.exclude) : null,
    contract: r.contract,
  }));
}

/** Normalize a path to POSIX separators so globs match the same on every platform. */
function toPosix(p: string): string {
  return sep === "/" ? p : p.split(sep).join("/");
}

/**
 * Recursively collect every file under `root`, returned as paths RELATIVE to `root`
 * with POSIX separators (so they feed both the glob matchers and `ctx.path`). The
 * walk is deterministic: directory entries are sorted before recursion. Synchronous
 * so `runCorpus` stays a plain synchronous library call.
 */
function walkSync(root: string): string[] {
  const out: string[] = [];
  const recur = (absDir: string, relDir: string): void => {
    const entries = readdirSync(absDir, { withFileTypes: true });
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      const rel = relDir === "" ? entry.name : `${relDir}/${entry.name}`;
      if (entry.isDirectory()) recur(resolve(absDir, entry.name), rel);
      else if (entry.isFile()) out.push(rel);
    }
  };
  recur(root, "");
  return out;
}

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
export function runCorpus(
  config: CorpusConfig,
  opts?: {
    format?: "human" | "json" | "sarif";
    cwd?: string;
    include?: string[];
    exclude?: string[];
  },
): { findings: Finding[]; exitCode: number; stats: RunStats } {
  const root = resolve(opts?.cwd ?? process.cwd());
  const rules = compile(config);

  // Optional global pre-filter, applied before rule matching (AND-narrowing).
  const include =
    opts?.include && opts.include.length > 0 ? picomatch(opts.include, PICOMATCH_OPTS) : null;
  const exclude =
    opts?.exclude && opts.exclude.length > 0 ? picomatch(opts.exclude, PICOMATCH_OPTS) : null;

  const findings: Finding[] = [];
  const files = walkSync(root);

  // Run counts, tallied inside the single walk (no second pass). `matchedByRule` is
  // parallel to `config.rules` by index; the matched rule is found by INDEX so its
  // count can be attributed back to the rule the CLI labels.
  const matchedByRule = new Array<number>(config.rules.length).fill(0);
  let filesMatched = 0;

  for (const rel of files) {
    const posixRel = toPosix(rel);
    if (exclude && exclude(posixRel)) continue;
    if (include && !include(posixRel)) continue;
    const idx = rules.findIndex((r) => r.include(posixRel) && !(r.exclude && r.exclude(posixRel)));
    if (idx === -1) continue;
    matchedByRule[idx] = (matchedByRule[idx] ?? 0) + 1;
    filesMatched += 1;
    const source = readFileSync(resolve(root, rel), "utf8");
    const result = rules[idx]!.contract.validate(source, { path: posixRel });
    findings.push(...result.findings);
  }

  const stats: RunStats = {
    filesScanned: files.length,
    filesMatched,
    filesUnmatched: files.length - filesMatched,
    matchedByRule,
  };

  const hasError = findings.some((f) => f.level === "error");
  return { findings, exitCode: hasError ? 1 : 0, stats };
}
