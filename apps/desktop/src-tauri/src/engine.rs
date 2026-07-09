//! The scan-engine seam (D-0018 §D4): the hand-written trait the scan
//! orchestration (src/scans.rs) calls through. The real
//! `crates/markdown-contract-engine` implementation gets wired in the next
//! phase; until then `StubScanEngine` keeps the IPC surface honest end-to-end
//! (scan now → persisted green ScanRun).

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
/// Synchronous by design: engine work is CPU/fs-bound, and callers that need
/// to stay off the async executor can wrap the call in `spawn_blocking`.
pub trait ScanEngine: Send + Sync {
    fn scan(
        &self,
        vault_path: &str,
        config_path: &str,
    ) -> Result<Vec<EngineFinding>, ScanEngineError>;
}

/// Placeholder engine: every vault scans green. Replaced by the
/// markdown-contract-engine adapter next phase.
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
