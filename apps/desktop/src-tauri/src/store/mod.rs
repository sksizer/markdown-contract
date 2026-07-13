//! The central store the generated CRUD methods hang off (they are `impl Store`
//! blocks in generated/). Hand-written surface: the DB handle accessor and the
//! change-event fan-out the generated methods call into.

pub mod generated;
pub mod hooks;

pub use generated::*;

use std::sync::Arc;

use sea_orm::DatabaseConnection;
use tokio::sync::broadcast;

use crate::schema::{ChangeOp, EntityKind};

/// Central store providing CRUD access to all entities.
///
/// Generated code calls `self.db()` for database access and
/// `self.emit_change()` for event notification.
pub struct Store {
    db: Arc<DatabaseConnection>,
    change_tx: broadcast::Sender<EntityChange>,
}

/// One entity mutation, broadcast to subscribers (the seam a future
/// tray/notification layer listens on).
#[derive(Debug, Clone)]
pub struct EntityChange {
    pub op: ChangeOp,
    pub kind: EntityKind,
    pub id: String,
}

impl Store {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        let (change_tx, _) = broadcast::channel(256);
        Self { db, change_tx }
    }

    /// Access the database connection. Called by generated CRUD methods.
    pub fn db(&self) -> &DatabaseConnection {
        &self.db
    }

    /// Emit a change event. Called by generated CRUD methods.
    pub fn emit_change(&self, op: ChangeOp, kind: EntityKind, id: String) {
        let _ = self.change_tx.send(EntityChange { op, kind, id });
    }

    /// Subscribe to change events.
    pub fn subscribe(&self) -> broadcast::Receiver<EntityChange> {
        self.change_tx.subscribe()
    }
}
