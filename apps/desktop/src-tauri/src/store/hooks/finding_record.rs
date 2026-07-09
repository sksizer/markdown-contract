//! Lifecycle hooks for FindingRecord.
//!
//! This file was scaffolded by ontogen. It is yours to edit.
//! Fill in hook bodies with custom logic (validation, side effects, etc.).
//! This file is NEVER overwritten by the generator.

#![allow(unused_variables, clippy::unnecessary_wraps, clippy::unused_async)]

use crate::schema::{AppError, FindingRecord};
use crate::store::Store;
use crate::store::generated::finding_record::FindingRecordUpdate;

/// Called before a finding_record is inserted. Modify the entity or return Err to reject.
pub async fn before_create(
    _store: &Store,
    _finding_record: &mut FindingRecord,
) -> Result<(), AppError> {
    Ok(())
}

/// Called after a finding_record is successfully created.
pub async fn after_create(_store: &Store, _finding_record: &FindingRecord) -> Result<(), AppError> {
    Ok(())
}

/// Called before a finding_record is updated. Receives current state and pending changes.
pub async fn before_update(
    _store: &Store,
    _current: &FindingRecord,
    _updates: &FindingRecordUpdate,
) -> Result<(), AppError> {
    Ok(())
}

/// Called after a finding_record is successfully updated.
pub async fn after_update(_store: &Store, _finding_record: &FindingRecord) -> Result<(), AppError> {
    Ok(())
}

/// Called before a finding_record is deleted.
pub async fn before_delete(_store: &Store, _id: &str) -> Result<(), AppError> {
    Ok(())
}

/// Called after a finding_record is successfully deleted.
pub async fn after_delete(_store: &Store, _id: &str) -> Result<(), AppError> {
    Ok(())
}
