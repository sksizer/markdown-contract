//! The `daemon` feature's HTTP host: mounts the generated Axum routes (the
//! same service surface the IPC commands expose) on a loopback listener, the
//! way the Bun daemon serves its JSON API (D-0018 §D4 convergence seam).
//!
//! This is the standalone-web-server end of D-0019's Option 2 (converge the web
//! surface onto the generated Rust HTTP server). `boot` builds an [`AppState`]
//! WITHOUT Tauri — the resident-app plumbing in `lib.rs::run` needs a
//! `tauri::App` for the platform data dir; here the caller supplies the SQLite
//! URL and we stand up the same store + engine the IPC commands use. The
//! `mc-daemon` bin (`src/bin/daemon.rs`) is the entry point that calls `serve`.

use std::net::SocketAddr;
use std::path::Path;
use std::sync::Arc;

use crate::engine::EngineRouter;
use crate::persistence;
use crate::AppState;

/// Build an [`AppState`] backed by the SQLite database at `db_path`, standing up
/// the same store + production engine (`EngineRouter`) the Tauri IPC commands
/// use — but with no `tauri::App` dependency, so a headless server can host it.
///
/// `mode=rwc` creates the file on first boot; `create_schema` is idempotent, so
/// every boot converges (mirrors `lib.rs::boot_state`). Pass `":memory:"` for an
/// ephemeral in-process database.
pub async fn boot(db_path: &Path) -> Result<AppState, Box<dyn std::error::Error>> {
    if let Some(parent) = db_path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)?;
        }
    }
    let url = if db_path == Path::new(":memory:") {
        "sqlite::memory:".to_string()
    } else {
        format!("sqlite://{}?mode=rwc", db_path.display())
    };
    let db = persistence::db::connect(&url).await?;
    persistence::db::create_schema(&db).await?;
    Ok(AppState::new(Arc::new(db), Arc::new(EngineRouter::default())))
}

/// Serve the generated entity routes at `addr` until the task is cancelled.
pub async fn serve(state: Arc<AppState>, addr: SocketAddr) -> std::io::Result<()> {
    let router = crate::api::transport::http::entity_routes().with_state(state);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, router).await
}

#[cfg(test)]
mod tests {
    use super::*;

    // Contract: `boot` stands up a working store over an in-memory database —
    // a freshly-booted daemon has an empty vault registry (no Tauri needed).
    #[tokio::test]
    async fn boot_yields_a_usable_empty_store() {
        let state = boot(Path::new(":memory:")).await.expect("boot in-memory");
        let store = state.store().await.expect("store");
        let vaults = store.list_vaults(None, None).await.expect("list vaults");
        assert!(vaults.is_empty(), "a fresh daemon has no vaults");
    }
}
