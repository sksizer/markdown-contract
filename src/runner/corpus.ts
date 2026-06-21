/**
 * Corpus runner — config (globs → contracts) → aggregated findings across a tree
 * of documents, plus a CI-meaningful exit code (C-0003). Library API, not CLI-only:
 * other consumers reuse it in-process rather than shelling out. Reads files and
 * returns data; never owns argv or `process.exit`.
 *
 * Depends on `../core`; never imports from `../cli`. The traversal + aggregation
 * lands in T-J9TZ; these are the typed entry stubs.
 */
import { notImplemented } from "../core/finding.js";
import type { Contract, Finding } from "../core/index.js";

/**
 * The directory → contract config. MINIMAL shape for the skeleton: the full
 * format (default-config resolution, ordering, per-rule options) is finalised in
 * T-J9TZ under the `D·fidelity-and-packaging` ADR.
 */
export interface CorpusConfig {
  rules: Array<{ include: string[]; exclude?: string[]; contract: Contract }>;
}

/**
 * Run a config across a document tree and aggregate findings, returning a
 * CI-meaningful exit code. Stub — the corpus traversal lands in T-J9TZ.
 */
export function runCorpus(
  _config: CorpusConfig,
  _opts?: { format?: "human" | "json" | "sarif" },
): { findings: Finding[]; exitCode: number } {
  throw notImplemented("runCorpus");
}

/**
 * Identity helper that types a config for `markdown-contract.config.ts`. Passthrough
 * is correct here — its only job is to attach the `CorpusConfig` type at the call site.
 */
export function defineConfig(config: CorpusConfig): CorpusConfig {
  return config;
}
