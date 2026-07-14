use std::path::Path;

use ontogen_macros::ontogen;

use crate::AppState;
use crate::schema::{AppError, ConfigFiles, VaultConfig};

/// Read a vault's router config file verbatim (D-0019 workstream B) — the
/// config editor's initial load. Thin over crate::config_edit.
#[ontogen(rename = "read_config")]
pub async fn read_config(state: &AppState, vault_id: String) -> Result<VaultConfig, AppError> {
    let store = state.store().await?;
    let vault = store.get_vault(&vault_id).await?;
    Ok(crate::config_edit::read_config(Path::new(&vault.config_path)))
}

/// Replace a vault's router config file — validates before writing, so a save
/// can never land a config the engine would reject.
#[ontogen(rename = "save_config")]
pub async fn save_config(
    state: &AppState,
    vault_id: String,
    raw: String,
) -> Result<(), AppError> {
    let store = state.store().await?;
    let vault = store.get_vault(&vault_id).await?;
    crate::config_edit::save_config(Path::new(&vault.config_path), &raw)
}

/// The vault's editable config + referenced contract files — the full
/// contract-authoring set the dashboard's editor lists.
#[ontogen(rename = "list_config_files")]
pub async fn config_files(state: &AppState, vault_id: String) -> Result<ConfigFiles, AppError> {
    let store = state.store().await?;
    let vault = store.get_vault(&vault_id).await?;
    Ok(crate::config_edit::list_config_files(
        Path::new(&vault.path),
        Path::new(&vault.config_path),
    ))
}

/// Replace ONE config/contract file by `rel_path` (relative to the config dir),
/// validated + path-jailed to the vault root.
#[ontogen(rename = "save_config_file")]
pub async fn save_config_file(
    state: &AppState,
    vault_id: String,
    rel_path: String,
    raw: String,
) -> Result<(), AppError> {
    let store = state.store().await?;
    let vault = store.get_vault(&vault_id).await?;
    crate::config_edit::save_config_file(
        Path::new(&vault.path),
        Path::new(&vault.config_path),
        &rel_path,
        &raw,
    )
}
