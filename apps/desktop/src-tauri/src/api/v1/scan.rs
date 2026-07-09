use ontogen_macros::ontogen;

use crate::AppState;
use crate::schema::{AppError, ScanRun};

/// "Scan now" (the UI's manual trigger): run one scan of `vault_id`, persist
/// the ScanRun + FindingRecords, and return the finalized run. Thin by design
/// — the orchestration lives in crate::scans, behind this generated API layer,
/// where the watcher/scheduler triggers of the next phase call it too.
#[ontogen(rename = "scan_now")]
pub async fn scan_now(state: &AppState, vault_id: String) -> Result<ScanRun, AppError> {
    crate::scans::run_scan(state, &vault_id, "manual").await
}
