import type { Contract, Finding } from "../core/index.js";
/**
 * The directory → contract config. A flat ordered list of rules: each maps an
 * `include` glob set (minus an optional `exclude` set) to the `contract` that
 * governs the matched files. Rule order is significant — a file is validated
 * against the FIRST rule it matches (see `runCorpus`).
 */
export interface CorpusConfig {
    rules: Array<{
        include: string[];
        exclude?: string[];
        contract: Contract;
    }>;
}
/**
 * Identity helper that types a config for `markdown-contract.config.{js,mjs}`.
 * Passthrough is correct here — its only job is to attach the `CorpusConfig` type
 * at the call site so authors get completion and checking on their config literal.
 */
export declare function defineConfig(config: CorpusConfig): CorpusConfig;
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
 * Exit-code policy (AC-2): `0` when no `error`-level finding exists across the whole
 * corpus, `1` when any `error`-level finding is present. `2` is reserved for
 * usage/config errors and is raised by the CLI layer, never here — this function
 * only ever returns `0` or `1`, so the CLI can layer `2` on top.
 */
export declare function runCorpus(config: CorpusConfig, opts?: {
    format?: "human" | "json" | "sarif";
    cwd?: string;
}): {
    findings: Finding[];
    exitCode: number;
};
//# sourceMappingURL=corpus.d.ts.map