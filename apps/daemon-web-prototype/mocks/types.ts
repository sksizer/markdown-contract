/**
 * The mock layer's view of the data shapes.
 *
 * The engine-mirror primitives (FindingLevel, SourcePos, Finding, RunStats,
 * RunResult) and the full API seam (vault status, drift, SSE, route envelopes)
 * now live in `../types/api` — the canonical home. This module re-exports them
 * for the mock layer and defines the simple `VaultSummary` product model the
 * dashboard components bind to.
 */
export type * from "../types/api";
import type { RunResult } from "../types/api";

/**
 * A managed "vault" (a markdown tree) and its latest validation status.
 *
 * This is the prototype's product-level model (per decision D-0012: the local
 * vault dashboard tracks vaults and shows each one's RunResult). It is NOT an
 * engine type — the engine has no notion of a vault; the future app composes
 * vault metadata around each `runCorpus` result.
 */
export interface VaultSummary {
  id: string;
  name: string;
  /** absolute or repo-relative path to the markdown tree's root */
  path: string;
  result: RunResult;
}
