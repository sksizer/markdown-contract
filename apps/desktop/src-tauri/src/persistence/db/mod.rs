//! SQLite boot: connection + idempotent schema creation over the generated
//! SeaORM entities. The Tauri setup hook (src/lib.rs) points this at a db file
//! in the app data dir; tests point it at `sqlite::memory:`.

pub mod conversions;
pub mod entities;

use sea_orm::{ConnectionTrait, Database, DatabaseConnection, DbErr, Schema};

/// Open a SeaORM connection. `url` is a sqlx SQLite URL, e.g.
/// `sqlite:///path/to/app.db?mode=rwc` or `sqlite::memory:`.
pub async fn connect(url: &str) -> Result<DatabaseConnection, DbErr> {
    Database::connect(url).await
}

/// Create every entity table if absent — the boot-time "migration" for a
/// schema that is regenerated from src/schema on each build. `IF NOT EXISTS`
/// keeps it idempotent across app launches.
pub async fn create_schema(db: &DatabaseConnection) -> Result<(), DbErr> {
    let backend = db.get_database_backend();
    let schema = Schema::new(backend);
    let statements = [
        schema.create_table_from_entity(entities::vault::Entity),
        schema.create_table_from_entity(entities::scan_run::Entity),
        schema.create_table_from_entity(entities::finding_record::Entity),
        schema.create_table_from_entity(entities::opener_preference::Entity),
    ];
    for mut statement in statements {
        statement.if_not_exists();
        db.execute(backend.build(&statement)).await?;
    }
    Ok(())
}
