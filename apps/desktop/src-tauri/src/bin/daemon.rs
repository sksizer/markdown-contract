//! `mc-daemon` — the standalone HTTP host for the generated ontogen contract
//! (D-0019 Option 2). It constructs the same store + engine the Tauri IPC
//! commands use (via `daemon::boot`, no Tauri) and serves the generated Axum
//! routes over loopback — the Rust counterpart to the `apps/web` Bun daemon's
//! `/api/*` JSON API.
//!
//! Built only with the `daemon` feature:
//!   cargo run -p markdown-contract-desktop --features daemon --bin mc-daemon
//!
//! Configuration (env):
//!   MC_DAEMON_ADDR   loopback listen address        (default 127.0.0.1:4319)
//!   MC_DAEMON_DB     SQLite path, or ":memory:"     (default <tmp>/markdown-contract-daemon.db)

use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;

use markdown_contract_desktop_lib::daemon;

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr: SocketAddr = std::env::var("MC_DAEMON_ADDR")
        .unwrap_or_else(|_| "127.0.0.1:4319".to_string())
        .parse()?;
    // Default to the OS temp dir, not cwd — a dev daemon must not drop a stray
    // .db in whatever directory it's launched from. Callers embedding the daemon
    // (apps/web) pass an explicit MC_DAEMON_DB.
    let db_path = match std::env::var("MC_DAEMON_DB") {
        Ok(p) => PathBuf::from(p),
        Err(_) => std::env::temp_dir().join("markdown-contract-daemon.db"),
    };

    let state = Arc::new(daemon::boot(&db_path).await?);
    eprintln!("mc-daemon: serving the ontogen /api/* contract on http://{addr} (db: {db_path:?})");
    daemon::serve(state, addr).await?;
    Ok(())
}
