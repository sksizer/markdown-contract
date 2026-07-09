//! The `daemon` feature's HTTP host: mounts the generated Axum routes (the
//! same service surface the IPC commands expose) on a loopback listener, the
//! way the Bun daemon serves its JSON API (D-0018 §D4 convergence seam).

use std::net::SocketAddr;
use std::sync::Arc;

use crate::AppState;

/// Serve the generated entity routes at `addr` until the task is cancelled.
pub async fn serve(state: Arc<AppState>, addr: SocketAddr) -> std::io::Result<()> {
    let router = crate::api::transport::http::entity_routes().with_state(state);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, router).await
}
