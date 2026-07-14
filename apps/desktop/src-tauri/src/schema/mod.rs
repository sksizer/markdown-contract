//! The desktop domain model (D-0018 §D4): ontogen-annotated entities defined
//! once, from which build.rs generates persistence, store, API, transports,
//! and TS bindings. This module also owns the error/event vocabulary the
//! generated code links against (AppError, ChangeOp, EntityKind).

mod config_edit;
mod drift;
mod finding_record;
mod opener_preference;
mod openers;
mod scan_run;
mod vault;
mod vault_status;

pub mod dto;

pub use config_edit::{ConfigFileEntry, ConfigFiles, VaultConfig};
pub use drift::{DriftEntry, DriftResult};
pub use finding_record::FindingRecord;
pub use opener_preference::OpenerPreference;
pub use openers::{OpenPreview, OpenerInfo};
pub use scan_run::ScanRun;
pub use vault::Vault;
pub use vault_status::{ScanRunInfo, StatusFinding, VaultInfo, VaultStatus};

// Re-export DTOs at the schema level (generated code imports from crate::schema::).
pub use dto::finding_record::{CreateFindingRecordInput, UpdateFindingRecordInput};
pub use dto::opener_preference::{CreateOpenerPreferenceInput, UpdateOpenerPreferenceInput};
pub use dto::scan_run::{CreateScanRunInput, UpdateScanRunInput};
pub use dto::vault::{CreateVaultInput, UpdateVaultInput};

// ── Error type ──────────────────────────────────────────────────────────────
// Generated store code imports AppError with entity-specific NotFound variants.

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Vault not found: {0}")]
    VaultNotFound(String),
    #[error("ScanRun not found: {0}")]
    ScanRunNotFound(String),
    #[error("FindingRecord not found: {0}")]
    FindingRecordNotFound(String),
    #[error("OpenerPreference not found: {0}")]
    OpenerPreferenceNotFound(String),
    /// A caller-fixable rejection (the registry.ts RegistryError analogue),
    /// e.g. registering a vault whose path is already tracked.
    #[error("Invalid request: {0}")]
    Invalid(String),
    #[error("Scan failed: {0}")]
    ScanFailed(String),
    #[error("Database error: {0}")]
    DbError(String),
}

impl From<AppError> for String {
    fn from(e: AppError) -> Self {
        e.to_string()
    }
}

// ── Event types ─────────────────────────────────────────────────────────────
// Generated store code emits change events via self.emit_change().

#[derive(Debug, Clone)]
pub enum ChangeOp {
    Created,
    Updated,
    Deleted,
}

#[derive(Debug, Clone)]
pub enum EntityKind {
    Vault,
    ScanRun,
    FindingRecord,
    OpenerPreference,
}
