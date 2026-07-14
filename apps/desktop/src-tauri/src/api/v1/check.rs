use ontogen_macros::ontogen;

use crate::AppState;
use crate::schema::{AppError, DriftResult};

/// Drift check for a vault (D-0019 workstream B) — run the committed config over
/// the tree; error-level findings mean the corpus drifted from the contract.
/// A read: it computes and returns, it does NOT persist a ScanRun. Thin by
/// design — the fold lives in crate::drift, behind this generated API layer.
#[ontogen(rename = "check")]
pub async fn check(state: &AppState, vault_id: String) -> Result<DriftResult, AppError> {
    crate::drift::check(state, &vault_id).await
}
