//! Generated transports over the one API layer. IPC is the desktop UI's path;
//! the Axum HTTP transport is generated unconditionally but compiled only
//! behind the `daemon` cargo feature — the D-0012 daemon-convergence seam.
pub mod ipc;

#[cfg(feature = "daemon")]
pub mod http;
