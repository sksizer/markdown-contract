//! The scan-engine seam (D-0018 §D4): the hand-written trait the scan
//! orchestration (src/scans.rs) calls through, plus the real implementations
//! behind it — one responsibility per sibling module:
//!
//! - [`native`] — the in-process `markdown-contract-engine` adapter (D-0018 §D2).
//! - [`cli`] — the TS-CLI fallback (`markdown-contract validate --format json`).
//! - [`router`] — [`EngineRouter`], the production engine: native first, CLI
//!   fallback when the vault's config needs the TypeScript engine.
//! - [`map`] — engine `Finding` → [`EngineFinding`] mapping shared by both.
//!
//! `StubScanEngine` (every vault scans green) stays for tests.

pub mod cli;
pub mod map;
pub mod native;
pub mod router;

#[cfg(test)]
pub(crate) mod fixture;

pub use cli::CliScanEngine;
pub use native::NativeScanEngine;
pub use router::EngineRouter;

/// One finding as the engine reports it — the transport-free subset of the
/// D-0001 finding shape the desktop persists per run.
#[derive(Debug, Clone)]
pub struct EngineFinding {
    /// The engine's namespaced finding id, e.g. "structure/missing-section".
    pub finding_id: String,
    /// "error" | "warn" | "report".
    pub level: String,
    /// Vault-relative path of the offending file.
    pub file_path: String,
    /// 1-based position, when pinned.
    pub line: Option<i32>,
    pub col: Option<i32>,
    pub message: String,
}

/// A scan attempt that never produced findings (config unreadable, engine
/// crash, …) — maps to ScanRun status "error".
#[derive(Debug, thiserror::Error)]
#[error("{0}")]
pub struct ScanEngineError(pub String);

/// Validate a vault (markdown tree root + contract config) into findings.
///
/// Synchronous by design: engine work is CPU/fs-bound (the CLI fallback even
/// blocks on a child process), and callers that need to stay off the async
/// executor wrap the call in `spawn_blocking` (scans::run_scan does).
pub trait ScanEngine: Send + Sync {
    fn scan(
        &self,
        vault_path: &str,
        config_path: &str,
    ) -> Result<Vec<EngineFinding>, ScanEngineError>;
}

/// Test engine: every vault scans green. Production uses [`EngineRouter`];
/// this stays as the neutral double for orchestration tests.
pub struct StubScanEngine;

impl ScanEngine for StubScanEngine {
    fn scan(
        &self,
        _vault_path: &str,
        _config_path: &str,
    ) -> Result<Vec<EngineFinding>, ScanEngineError> {
        Ok(Vec::new())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stub_engine_scans_any_vault_green() {
        let findings = StubScanEngine.scan("/some/vault", "/some/vault/markdown-contract.yaml");
        assert!(findings.expect("stub never fails").is_empty());
    }
}
