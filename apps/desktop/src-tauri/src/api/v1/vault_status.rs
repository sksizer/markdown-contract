use ontogen_macros::ontogen;

use crate::AppState;
use crate::schema::{AppError, VaultStatus};

/// Every vault with its latest status (D-0019 workstream A) — the dashboard's
/// list read. Thin by design: the join lives in crate::status, behind this
/// generated API layer, so both transports (HTTP + IPC) share one projection.
///
/// Custom POST action (the whole custom-action surface is POST — `scan_now`,
/// `echo` — so a read routed as POST is the contract's convention, not a smell).
#[ontogen(rename = "vault_statuses")]
pub async fn vault_statuses(state: &AppState) -> Result<Vec<VaultStatus>, AppError> {
    let store = state.store().await?;
    crate::status::project_all(store).await
}

/// One vault's status projection — the detail read. 404s (VaultNotFound) when
/// the id is unknown, via the store's get_vault.
///
/// Named `vault_status_by_id` (not `vault_status`) so the generated route is a
/// distinct `/api/vault-statuses/by-id` — a bare `vault_status` collides with
/// the module's own `/api/vault-statuses` collection route (ontogen collapses a
/// fn named for its module to the empty action). The `rename` keeps the surface
/// name `vaultStatus(vaultId)` regardless.
#[ontogen(rename = "vault_status")]
pub async fn vault_status_by_id(
    state: &AppState,
    vault_id: String,
) -> Result<VaultStatus, AppError> {
    let store = state.store().await?;
    let vault = store.get_vault(&vault_id).await?;
    crate::status::project_one(store, vault).await
}
