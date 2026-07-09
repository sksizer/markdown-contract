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

/// Reject a schedule the scheduler could never arm. Empty/absent means
/// unscheduled and is always fine.
fn validate_schedule(schedule: Option<&str>) -> Result<(), AppError> {
    match schedule {
        Some(expr) if !expr.is_empty() => {
            crate::scheduler::validate_schedule(expr).map_err(AppError::Invalid)
        }
        _ => Ok(()),
    }
}

/// Called before a vault is inserted: derives the slug id when the caller left
/// it empty, enforces the registry's path dedupe (one vault per path — the
/// flat-file registry semantics, kept in SQLite, D-0018 §D5), and rejects
/// invalid cron schedules at the seam.
pub async fn before_create(store: &Store, vault: &mut Vault) -> Result<(), AppError> {
    if vault.id.is_empty() {
        vault.id = slug_id(&vault.name);
    }
    validate_schedule(vault.schedule.as_deref())?;
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

/// Called before a vault is updated: a pending schedule change must parse
/// (clearing it with None is always fine).
pub async fn before_update(
    _store: &Store,
    _current: &Vault,
    updates: &VaultUpdate,
) -> Result<(), AppError> {
    if let Some(schedule) = &updates.schedule {
        validate_schedule(schedule.as_deref())?;
    }
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
    use crate::schema::AppError;

    use super::{slug_id, validate_schedule};

    #[test]
    fn slug_id_mirrors_the_registry_scheme() {
        assert_eq!(slug_id("My Docs"), "vault-my-docs");
        assert_eq!(slug_id("  Weird -- Name!  "), "vault-weird-name");
        assert_eq!(slug_id("!!!"), "vault-untitled");
    }

    #[test]
    fn schedules_validate_at_the_seam() {
        assert!(validate_schedule(None).is_ok());
        assert!(
            validate_schedule(Some("")).is_ok(),
            "empty means unscheduled"
        );
        assert!(validate_schedule(Some("0 * * * *")).is_ok());
        assert!(matches!(
            validate_schedule(Some("every tuesday-ish")),
            Err(AppError::Invalid(_))
        ));
    }
}
