/**
 * The example's wire contract — the validate/health SUBSET of the stable JSON
 * API seam pinned in [[D-0012-distribution-single-exec-and-web-ui]] §D3.
 *
 * ADOPTED from the T-D7X1 contract (`apps/web/types/api.ts`, itself adopted
 * from the design prototype's pinned shapes): sections copied verbatim, the
 * registry/SSE/drift/editor envelopes deliberately left behind — those routes
 * are M-0009 (`apps/web`), not this example.
 *
 * Like the source file, this deliberately does NOT import the engine's types:
 * the wire contract stays an explicit, hand-owned artifact, so the API can
 * hold stable while the engine moves underneath it.
 *
 * Route map (the whole M-0008 API surface):
 *   GET  /api/health   → HealthResponse
 *   POST /api/validate → ValidateResponse   (stateless run → findings)
 */

// ── Engine-output mirror primitives ──────────────────────────────────────────────

/** Severity is contract data, not a call-site choice. Mirror of `FindingLevel`. */
export type FindingLevel = "error" | "warn" | "report";

/** A single source point. Mirror of `SourcePos`. */
export interface SourcePos {
  line: number;
  col?: number;
}

/**
 * One finding the engine emits over a document. Mirror of `Finding`.
 * Carries file·line·severity·rule·message: `path` is the file, `pos.line` the
 * line, `level` the severity, `id` the rule, `message` the human text.
 */
export interface Finding {
  /** the rule — namespaced `area/.../name`, e.g. "structure/section-missing" */
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

// ── Route request/response envelopes ─────────────────────────────────────────────

/** GET /api/health — liveness + identity for the daemon. */
export interface HealthResponse {
  ok: boolean;
  version: string;
}

/**
 * POST /api/validate — run the corpus over a markdown tree, statelessly.
 * `path` may be absolute or relative to the daemon's working directory;
 * `config` (optional) mirrors the CLI's `--config`, resolved against `path`.
 */
export interface ValidateRequest {
  path: string;
  config?: string;
}

/**
 * POST /api/validate — the SAME data `markdown-contract validate <path>`
 * produces (CLI parity): the run's findings, stats, and exit code.
 */
export type ValidateResponse = RunResult;

/** Any non-2xx API response body. `exitCode` mirrors the CLI's usage-error 2. */
export interface ApiError {
  error: string;
  exitCode: number;
}
