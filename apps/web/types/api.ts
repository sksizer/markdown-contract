/**
 * THE API SEAM — the stable JSON API the vault-dashboard daemon emits, per
 * [[D-0012-distribution-single-exec-and-web-ui]] §D3.
 *
 * COPIED from `prototype/web-ui/types/api.ts` (T-D7X1, the pinned shapes) so the
 * daemon and the real UI both bind to the exact contract the mock prototype
 * validated. Sections (a)–(e) are byte-compatible with the pinned file; the
 * trailing "prototype additions" section carries the small additive envelopes
 * this M-0008 prototype needed beyond the pinned routes (remove, init, health).
 *
 * Unlike the prototype copy, the daemon side of this file COULD import the
 * engine's types directly — it deliberately doesn't, so the wire contract stays
 * an explicit, hand-owned artifact (the API can hold stable while the engine
 * moves underneath it).
 *
 * Route map (D-0012 §D3, lightly expanded):
 *   GET    /api/health              → HealthResponse       (prototype addition)
 *   GET    /api/vaults              → VaultListResponse    (registry + last status)
 *   GET    /api/vaults/:id          → VaultDetailResponse  (single vault detail)
 *   POST   /api/vaults              → RegisterVaultResponse (register a path+config)
 *   DELETE /api/vaults/:id          → RemoveVaultResponse  (prototype addition)
 *   POST   /api/vaults/:id/validate → ValidateResponse     (run → findings)
 *   GET    /api/vaults/:id/check    → CheckResponse        (drift, via init --check)
 *   POST   /api/vaults/:id/init     → InitVaultResponse    (prototype addition: scaffold contracts)
 *   POST   /api/vaults/:id/watch    → WatchResponse        (prototype addition: toggle watching)
 *   GET    /api/events              → SseEvent stream      (SSE live status)
 */

// ── (a) Engine-output mirror primitives (the canonical home) ────────────────────

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

// ── (b) Drift (mirror init --check / inferConfig) ───────────────────────────────

/**
 * The kind of contract drift a `--check` reports — how the live corpus diverges
 * from the committed contract.
 */
export type DriftKind =
  | "section-added"
  | "section-removed"
  | "field-added"
  | "field-removed"
  | "field-changed"
  | "order-changed"
  | "unknown-admission-changed";

/** One unit of drift between the committed contract and what `--check` re-infers. */
export interface DriftEntry {
  kind: DriftKind;
  /** dotted path into the contract, e.g. "frontmatter.fields.status" or "body.sections.Summary" */
  target: string;
  /** human-readable explanation of the change */
  detail: string;
}

/**
 * The result of a drift check (`init --check`). `entries` is empty when not
 * drifted; `warnings` carries advisory inference diagnostics that don't
 * themselves constitute drift.
 */
export interface DriftResult {
  drifted: boolean;
  entries: DriftEntry[];
  /** advisory inference diagnostics; never block, never imply drift on their own */
  warnings: string[];
}

// ── (c) Vault registry + status ─────────────────────────────────────────────────

/** The coarse status of a managed vault, driving the dashboard's at-a-glance state. */
export type VaultStatusState = "green" | "findings" | "drift" | "running" | "error";

/**
 * The durable registry intent for a managed vault: the markdown tree root and the
 * `markdown-contract.yaml` that governs it. This is what `POST /api/vaults`
 * persists; status is derived on top of it.
 */
export interface VaultRegistryEntry {
  id: string;
  name: string;
  /** absolute or repo-relative path to the markdown tree's root */
  path: string;
  /** path to the `markdown-contract.yaml` config governing this vault */
  configPath: string;
  /** whether the daemon file-watches this vault (prototype addition; default true) */
  watch?: boolean;
}

/**
 * The rich, status-bearing registry entry the API returns: a `VaultRegistryEntry`
 * plus its latest derived status. Which optional fields are present depends on
 * `state`:
 *  - `green` / `findings`     → `result` present (the latest `runCorpus` output)
 *  - `drift`                  → `drift` present (and usually a green-ish `result`)
 *  - `running`               → no `result` yet (a run is in flight)
 *  - `error`                 → `error` present, no `result`
 */
export interface VaultStatus extends VaultRegistryEntry {
  state: VaultStatusState;
  /** ISO 8601 timestamp of the last status update */
  updatedAt: string;
  /** the latest run result — present for green/findings; absent while running/error */
  result?: RunResult;
  /** the latest drift check — present when `state === "drift"` */
  drift?: DriftResult;
  /** the failure detail — present when `state === "error"` */
  error?: { message: string };
}

// ── (d) Route request/response envelopes ────────────────────────────────────────

/** GET /api/vaults — the registry plus each vault's last status. */
export interface VaultListResponse {
  vaults: VaultStatus[];
}

/** GET /api/vaults/:id — a single vault's detail. */
export interface VaultDetailResponse {
  vault: VaultStatus;
}

/** POST /api/vaults — register a path + config. */
export interface RegisterVaultRequest {
  name: string;
  path: string;
  /** defaults to `<path>/markdown-contract.yaml` when omitted */
  configPath?: string;
}

/** POST /api/vaults — the freshly registered vault and its initial status. */
export interface RegisterVaultResponse {
  vault: VaultStatus;
}

/** POST /api/vaults/:id/validate — run the corpus → findings. */
export interface ValidateResponse {
  result: RunResult;
}

/** GET /api/vaults/:id/check — drift, via `init --check`. */
export interface CheckResponse {
  drift: DriftResult;
}

// ── (e) SSE envelope (GET /api/events) ──────────────────────────────────────────

/**
 * The fields every SSE event carries. `id` is a monotonic event id for
 * `Last-Event-ID` resumption; `at` is the ISO timestamp; `vaultId` is the vault
 * the event concerns.
 */
interface SseEventBase {
  id: number;
  at: string;
  vaultId: string;
}

/**
 * One server-sent event over GET /api/events — a discriminated union on `type`:
 *  - `status`    → the vault moved to a new coarse state
 *  - `validated` → a run finished; carries its `RunResult`
 *  - `drift`     → a drift check finished; carries its `DriftResult`
 *  - `error`     → the vault's run/check failed; carries the message
 */
export type SseEvent = SseEventBase &
  (
    | { type: "status"; state: VaultStatusState }
    | { type: "validated"; result: RunResult }
    | { type: "drift"; drift: DriftResult }
    | { type: "error"; message: string }
  );

// ── (f) Prototype additions (beyond the pinned D-0012 §D3 seam) ─────────────────

/** GET /api/health — liveness + identity for the daemon. */
export interface HealthResponse {
  ok: boolean;
  version: string;
  pid: number;
  /** the registry file this daemon reads/writes */
  registryPath: string;
}

/** DELETE /api/vaults/:id — unregister a vault (files on disk are untouched). */
export interface RemoveVaultResponse {
  ok: true;
  id: string;
}

/** POST /api/vaults/:id/init — scaffold contracts for a vault via `init`. */
export interface InitVaultRequest {
  /** print the would-be files instead of writing them */
  dryRun?: boolean;
  /** overwrite an existing config */
  force?: boolean;
}

/** POST /api/vaults/:id/init — the captured `init` run (mirrors the CLI's streams). */
export interface InitVaultResponse {
  code: number;
  stdout: string;
  stderr: string;
}

/** POST /api/vaults/:id/watch — toggle file-watching for a vault. */
export interface WatchRequest {
  watching: boolean;
}

/** POST /api/vaults/:id/watch — the vault's new watch state. */
export interface WatchResponse {
  id: string;
  watching: boolean;
}

/** Any non-2xx API response body. */
export interface ApiError {
  error: string;
}
