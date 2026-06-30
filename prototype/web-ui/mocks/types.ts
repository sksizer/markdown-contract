/**
 * LOCAL MIRROR of the engine's output shapes — copied, never imported.
 *
 * The real UI (a future `apps/web`, NOT this prototype) will call `runCorpus`
 * from `src/runner/corpus.ts` and consume its `{ findings, exitCode, stats }`
 * return. This prototype mirrors only that OUTPUT shape here so it stays fully
 * decoupled from the engine. If the engine's public shape changes, these types
 * are updated by hand — there is intentionally no import edge to `src/`.
 *
 *   mirrors: src/core/types.ts        → FindingLevel, SourcePos, Finding
 *   mirrors: src/runner/corpus.ts     → RunStats, runCorpus() return (RunResult)
 *   product concept (D-0012)          → VaultSummary (a managed markdown tree + its status)
 */

/** Severity is contract data, not a call-site choice. Mirror of `FindingLevel`. */
export type FindingLevel = "error" | "warn" | "report";

/** A single source point. Mirror of `SourcePos`. */
export interface SourcePos {
  line: number;
  col?: number;
}

/** One finding the engine emits over a document. Mirror of `Finding`. */
export interface Finding {
  /** namespaced `area/.../name`, e.g. "structure/section-missing" */
  id: string;
  level: FindingLevel;
  /** the source document's file path, e.g. "docs/guide.md" */
  path: string;
  /** omitted for whole-document absence findings */
  pos?: SourcePos;
  message: string;
  /** describes only; this engine never edits documents */
  fix?: { description: string };
}

/** Per-run counts. Mirror of `RunStats`. */
export interface RunStats {
  /** every file the walk visited under the run root */
  filesScanned: number;
  /** files routed to a rule (read + validated) */
  filesMatched: number;
  /** scanned but not routed (pre-filtered out or matching no rule) */
  filesUnmatched: number;
  /** matched count per rule, parallel to the config's rules by index */
  matchedByRule: number[];
}

/** The aggregate result of one corpus run. Mirror of `runCorpus(...)` return. */
export interface RunResult {
  findings: Finding[];
  /** 0 = no error-level finding; 1 = at least one error-level finding */
  exitCode: number;
  stats: RunStats;
}

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
