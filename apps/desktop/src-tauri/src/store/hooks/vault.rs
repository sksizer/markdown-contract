//! Lifecycle hooks for Vault.
//!
//! This file was scaffolded by ontogen. It is yours to edit.
//! Fill in hook bodies with custom logic (validation, side effects, etc.).
//! This file is NEVER overwritten by the generator.

#![allow(unused_variables, clippy::unnecessary_wraps, clippy::unused_async)]

use crate::schema::{AppError, Vault};
use crate::store::Store;
use crate::store::generated::vault::VaultUpdate;

/// Slugify a vault name into an id, e.g. "My Docs" → "vault-my-docs" —
/// the same scheme as the Bun daemon's registry (apps/web/src/daemon/registry.ts).
pub fn slug_id(name: &str) -> String {
    let slug: String = name
        .to_lowercase()
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect();
    let slug = slug
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-");
    format!("vault-{}", if slug.is_empty() { "untitled" } else { &slug })
}

/// Called before a vault is inserted: derives the slug id when the caller left
/// it empty, and enforces the registry's path dedupe (one vault per path) —
/// the flat-file registry semantics, kept in SQLite (D-0018 §D5).
pub async fn before_create(store: &Store, vault: &mut Vault) -> Result<(), AppError> {
    if vault.id.is_empty() {
        vault.id = slug_id(&vault.name);
    }
    let existing = store.list_vaults(None, None).await?;
    if let Some(dup) = existing.iter().find(|v| v.path == vault.path) {
        return Err(AppError::Invalid(format!(
            "vault path already registered as '{}': {}",
            dup.id, vault.path
        )));
    }
    if existing.iter().any(|v| v.id == vault.id) {
        return Err(AppError::Invalid(format!(
            "vault id already registered: {}",
            vault.id
        )));
    }
    Ok(())
}

/// Called after a vault is successfully created.
pub async fn after_create(_store: &Store, _vault: &Vault) -> Result<(), AppError> {
    Ok(())
}

/// Called before a vault is updated. Receives current state and pending changes.
pub async fn before_update(
    _store: &Store,
    _current: &Vault,
    _updates: &VaultUpdate,
) -> Result<(), AppError> {
    Ok(())
}

/// Called after a vault is successfully updated.
pub async fn after_update(_store: &Store, _vault: &Vault) -> Result<(), AppError> {
    Ok(())
}

/// Called before a vault is deleted.
pub async fn before_delete(_store: &Store, _id: &str) -> Result<(), AppError> {
    Ok(())
}

/// Called after a vault is successfully deleted.
pub async fn after_delete(_store: &Store, _id: &str) -> Result<(), AppError> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::slug_id;

    #[test]
    fn slug_id_mirrors_the_registry_scheme() {
        assert_eq!(slug_id("My Docs"), "vault-my-docs");
        assert_eq!(slug_id("  Weird -- Name!  "), "vault-weird-name");
        assert_eq!(slug_id("!!!"), "vault-untitled");
    }
}
