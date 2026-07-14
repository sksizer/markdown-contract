use serde::{Deserialize, Serialize};

use crate::schema::{FindingRecord, ScanRun, Vault};

/// A vault joined with its latest scan status — the "vault-with-status"
/// projection the dashboard renders (D-0019 workstream A).
///
/// Hand-owned wire DTO (not an entity): ontogen normalizes status apart into
/// `ScanRun` + `FindingRecord`, with no "vault with its latest status" query.
/// This projection is that query, generated onto BOTH surfaces (HTTP + IPC), so
/// the shared dashboard reads status through the ontogen contract instead of the
/// bespoke hand-computed route PR #251 added to the Bun daemon (which this
/// retires). `drift` is intentionally absent — it comes from the separate
/// `check` action (D-0019 workstream B), not from a scan.
///
/// ## Why the fields are mirror types, not the entities themselves
///
/// ontogen-ts's long-tail walker (which emits custom-action DTOs to the TS
/// bindings) re-emits any *entity* type used as a DTO **field**, producing a
/// duplicate `export type` (a returned entity is deduped against the pool; a
/// nested one is not). So `vault`/`latest_run`/`findings` are hand-owned mirrors
/// of `Vault`/`ScanRun`/`FindingRecord`, kept in lockstep by the `From` impls
/// below — the entities stay the single source of truth for the shape.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultStatus {
    /// The vault's identity record.
    pub vault: VaultInfo,

    /// Derived state, the latest run's `status` or "unknown" when never scanned:
    /// "unknown" | "running" | "green" | "findings" | "error".
    pub state: String,

    /// The most recent run for this vault (any status, including in-flight),
    /// or None when the vault has never been scanned.
    pub latest_run: Option<ScanRunInfo>,

    /// Findings of the latest FINISHED run — preserved while a new run is
    /// in flight, empty when the vault has never completed a scan.
    pub findings: Vec<StatusFinding>,
}

/// Mirror of [`Vault`] (see `VaultStatus` doc for why it isn't `Vault`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultInfo {
    pub id: String,
    pub name: String,
    pub path: String,
    pub config_path: String,
    pub watch_enabled: bool,
    pub schedule: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Mirror of [`ScanRun`] (see `VaultStatus` doc for why it isn't `ScanRun`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanRunInfo {
    pub id: String,
    pub vault_id: String,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub trigger: String,
    pub status: String,
    pub error_count: i32,
    pub warn_count: i32,
    pub report_count: i32,
    pub error_message: Option<String>,
}

/// Mirror of [`FindingRecord`] (see `VaultStatus` doc for why it isn't `FindingRecord`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusFinding {
    pub id: String,
    pub scan_run_id: String,
    pub finding_id: String,
    pub level: String,
    pub file_path: String,
    pub line: Option<i32>,
    pub col: Option<i32>,
    pub message: String,
}

impl From<Vault> for VaultInfo {
    fn from(v: Vault) -> Self {
        Self {
            id: v.id,
            name: v.name,
            path: v.path,
            config_path: v.config_path,
            watch_enabled: v.watch_enabled,
            schedule: v.schedule,
            created_at: v.created_at,
            updated_at: v.updated_at,
        }
    }
}

impl From<ScanRun> for ScanRunInfo {
    fn from(r: ScanRun) -> Self {
        Self {
            id: r.id,
            vault_id: r.vault_id,
            started_at: r.started_at,
            finished_at: r.finished_at,
            trigger: r.trigger,
            status: r.status,
            error_count: r.error_count,
            warn_count: r.warn_count,
            report_count: r.report_count,
            error_message: r.error_message,
        }
    }
}

impl From<FindingRecord> for StatusFinding {
    fn from(f: FindingRecord) -> Self {
        Self {
            id: f.id,
            scan_run_id: f.scan_run_id,
            finding_id: f.finding_id,
            level: f.level,
            file_path: f.file_path,
            line: f.line,
            col: f.col,
            message: f.message,
        }
    }
}
