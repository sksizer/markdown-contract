//! [`EngineRouter`] — the production `ScanEngine` (D-0018 §D2's fallback
//! policy): try the in-process native engine first; when the vault's config
//! declares something only the TypeScript engine can run, delegate to the CLI
//! fallback instead of failing or silently under-checking.
//!
//! The fallback triggers are:
//!
//! | trigger                                                      | route      |
//! |--------------------------------------------------------------|------------|
//! | config path itself is `.js` / `.mjs`                          | CLI        |
//! | default YAML config absent, `markdown-contract.config.js` /   |            |
//! | `.config.mjs` present in the vault root                       | CLI (that file) |
//! | YAML config load hits `DeclarativeError::UnsupportedVersion`  | CLI        |
//! | … `DeclarativeError::RefEscape` (`$ref` code escape)          | CLI        |
//! | … `DeclarativeError::CodeContractRef` (`.js`/`.ts` contract)  | CLI        |
//! | any other load/run failure                                    | error run  |
//! | no config anywhere                                            | error run  |

use std::path::{Path, PathBuf};
use std::sync::Arc;

use markdown_contract_engine::declarative::DeclarativeError;

use super::native::NativeScanError;
use super::{CliScanEngine, EngineFinding, NativeScanEngine, ScanEngine, ScanEngineError};

/// The `.js`/`.mjs` config filenames probed in the vault root when the
/// registered (default YAML) config is absent — the TS CLI's discovery names,
/// in its probe order.
const JS_CONFIG_NAMES: &[&str] = &[
    "markdown-contract.config.js",
    "markdown-contract.config.mjs",
];

/// Where one scan should go, decided BEFORE loading anything.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Route {
    /// Load the YAML config natively (escape errors may still divert to CLI).
    Native,
    /// A JS config only the TypeScript engine can execute — CLI with this file.
    Cli(PathBuf),
    /// No config at all: fail the scan (mirrors the daemon's "scaffold one
    /// first" guard).
    Missing,
}

/// The pre-load routing decision: a `.js`/`.mjs` config path goes straight to
/// the CLI; an existing config path is native territory; an absent one falls
/// back to probing the vault root for a JS config before giving up.
pub fn route(vault_path: &str, config_path: &str) -> Route {
    if is_js_config(config_path) {
        return Route::Cli(PathBuf::from(config_path));
    }
    if Path::new(config_path).exists() {
        return Route::Native;
    }
    for name in JS_CONFIG_NAMES {
        let candidate = Path::new(vault_path).join(name);
        if candidate.exists() {
            return Route::Cli(candidate);
        }
    }
    Route::Missing
}

fn is_js_config(path: &str) -> bool {
    let lower = path.to_ascii_lowercase();
    lower.ends_with(".js") || lower.ends_with(".mjs")
}

/// Does this load error mean "the vault needs the TypeScript engine"? — the
/// typed detection hooks D-0018 names: an `mcVersion` this build doesn't
/// speak, the `$ref` code escape, or a code-authored contract ref.
pub fn needs_ts_engine(err: &DeclarativeError) -> bool {
    matches!(
        err,
        DeclarativeError::UnsupportedVersion(_)
            | DeclarativeError::RefEscape { .. }
            | DeclarativeError::CodeContractRef { .. }
    )
}

/// Native first, CLI when the config is out of the native engine's reach.
pub struct EngineRouter {
    native: NativeScanEngine,
    fallback: Arc<dyn ScanEngine>,
}

impl Default for EngineRouter {
    fn default() -> Self {
        Self::with_fallback(Arc::new(CliScanEngine::default()))
    }
}

impl EngineRouter {
    /// A router delegating escape-hatch vaults to `fallback` (production: the
    /// [`CliScanEngine`]; tests: a recording double).
    pub fn with_fallback(fallback: Arc<dyn ScanEngine>) -> Self {
        Self {
            native: NativeScanEngine,
            fallback,
        }
    }
}

impl ScanEngine for EngineRouter {
    fn scan(
        &self,
        vault_path: &str,
        config_path: &str,
    ) -> Result<Vec<EngineFinding>, ScanEngineError> {
        match route(vault_path, config_path) {
            Route::Cli(js_config) => self.fallback.scan(vault_path, &js_config.to_string_lossy()),
            Route::Missing => Err(ScanEngineError(format!(
                "no contract config at {config_path} — scaffold one first (init)"
            ))),
            Route::Native => match self.native.try_scan(vault_path, config_path) {
                Ok(findings) => Ok(findings),
                Err(NativeScanError::Config(e)) if needs_ts_engine(&e) => {
                    self.fallback.scan(vault_path, config_path)
                }
                Err(e) => Err(ScanEngineError(e.to_string())),
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use super::super::fixture::{TempVault, write_code_ref_config};
    use super::*;

    /// Fallback double: records every (vault, config) it is asked to scan.
    #[derive(Default)]
    struct RecordingEngine {
        calls: Mutex<Vec<(String, String)>>,
    }

    impl ScanEngine for RecordingEngine {
        fn scan(
            &self,
            vault_path: &str,
            config_path: &str,
        ) -> Result<Vec<EngineFinding>, ScanEngineError> {
            self.calls
                .lock()
                .unwrap()
                .push((vault_path.to_string(), config_path.to_string()));
            Ok(Vec::new())
        }
    }

    fn router_with_recorder() -> (EngineRouter, Arc<RecordingEngine>) {
        let recorder = Arc::new(RecordingEngine::default());
        (EngineRouter::with_fallback(recorder.clone()), recorder)
    }

    fn fallback_configs(recorder: &RecordingEngine) -> Vec<String> {
        recorder
            .calls
            .lock()
            .unwrap()
            .iter()
            .map(|(_, config)| config.clone())
            .collect()
    }

    // Contract first — the pre-load decision table.
    #[test]
    fn route_decision_table() {
        // An existing YAML config → native.
        let vault = TempVault::mini("route-yaml");
        assert_eq!(route(vault.path(), vault.config_path()), Route::Native);

        // A registered .js/.mjs config path → CLI with that very file.
        for js in ["/v/markdown-contract.config.mjs", "/v/custom.config.JS"] {
            assert_eq!(route("/v", js), Route::Cli(PathBuf::from(js)));
        }

        // Default YAML absent, a JS config in the vault root → CLI with it.
        let vault = TempVault::empty("route-js-probe");
        let mjs = vault.root().join("markdown-contract.config.mjs");
        std::fs::write(&mjs, "export default { rules: [] };\n").unwrap();
        assert_eq!(route(vault.path(), vault.config_path()), Route::Cli(mjs));

        // Nothing anywhere → missing.
        let vault = TempVault::empty("route-missing");
        assert_eq!(route(vault.path(), vault.config_path()), Route::Missing);
    }

    // The escape-variant table: exactly the three D-0018 hooks divert to the CLI.
    #[test]
    fn escape_detection_table() {
        assert!(needs_ts_engine(&DeclarativeError::UnsupportedVersion(
            "2".into()
        )));
        assert!(needs_ts_engine(&DeclarativeError::RefEscape {
            path: "frontmatter.id".into()
        }));
        assert!(needs_ts_engine(&DeclarativeError::CodeContractRef {
            path: "rules[0].contract".into(),
            target: "./task.contract.ts".into(),
        }));

        assert!(!needs_ts_engine(&DeclarativeError::InvalidYaml("x".into())));
        assert!(!needs_ts_engine(&DeclarativeError::InvalidDocument(
            "x".into()
        )));
        assert!(!needs_ts_engine(&DeclarativeError::InvalidKind("x".into())));
        assert!(!needs_ts_engine(&DeclarativeError::InvalidSchema(
            "x".into()
        )));
        assert!(!needs_ts_engine(&DeclarativeError::InvalidBody("x".into())));
        assert!(!needs_ts_engine(&DeclarativeError::InvalidTextSpec(
            "x".into()
        )));
        assert!(!needs_ts_engine(&DeclarativeError::InvalidConfig(
            "x".into()
        )));
        assert!(!needs_ts_engine(&DeclarativeError::ContractRefRead {
            target: "a.yaml".into(),
            reason: "gone".into(),
        }));
    }

    #[test]
    fn a_native_vault_never_reaches_the_fallback() {
        let vault = TempVault::mini("router-native");
        let (router, recorder) = router_with_recorder();
        let findings = router.scan(vault.path(), vault.config_path()).unwrap();
        assert_eq!(findings.len(), 1, "the native engine's finding");
        assert!(recorder.calls.lock().unwrap().is_empty());
    }

    #[test]
    fn a_code_contract_ref_delegates_to_the_fallback() {
        let vault = TempVault::mini("router-code-ref");
        write_code_ref_config(&vault);
        let (router, recorder) = router_with_recorder();
        router.scan(vault.path(), vault.config_path()).unwrap();
        assert_eq!(
            fallback_configs(&recorder),
            vec![vault.config_path().to_string()]
        );
    }

    #[test]
    fn a_ref_escape_in_an_inline_contract_delegates() {
        let vault = TempVault::mini("router-ref-escape");
        std::fs::write(
            vault.config_path(),
            "mcVersion: 1\nkind: config\nrules:\n  - include: ['**/*.md']\n    contract:\n      frontmatter:\n        fields:\n          id:\n            $ref: ./custom.ts\n",
        )
        .unwrap();
        let (router, recorder) = router_with_recorder();
        router.scan(vault.path(), vault.config_path()).unwrap();
        assert_eq!(recorder.calls.lock().unwrap().len(), 1);
    }

    #[test]
    fn an_unsupported_mc_version_delegates() {
        let vault = TempVault::mini("router-version");
        std::fs::write(
            vault.config_path(),
            "mcVersion: 2\nkind: config\nrules: []\n",
        )
        .unwrap();
        let (router, recorder) = router_with_recorder();
        router.scan(vault.path(), vault.config_path()).unwrap();
        assert_eq!(recorder.calls.lock().unwrap().len(), 1);
    }

    #[test]
    fn a_js_config_discovered_in_the_vault_delegates_with_that_file() {
        let vault = TempVault::empty("router-js");
        let mjs = vault.root().join("markdown-contract.config.mjs");
        std::fs::write(&mjs, "export default { rules: [] };\n").unwrap();
        let (router, recorder) = router_with_recorder();
        router.scan(vault.path(), vault.config_path()).unwrap();
        assert_eq!(
            fallback_configs(&recorder),
            vec![mjs.to_string_lossy().into_owned()]
        );
    }

    // A broken-but-declarative config is a plain error run, NOT a fallback:
    // the TS engine would reject it identically.
    #[test]
    fn an_invalid_config_fails_without_fallback() {
        let vault = TempVault::mini("router-invalid");
        std::fs::write(vault.config_path(), "mcVersion: 1\nkind: config\n").unwrap();
        let (router, recorder) = router_with_recorder();
        let err = router.scan(vault.path(), vault.config_path()).unwrap_err();
        assert!(err.0.contains("config.rules"));
        assert!(recorder.calls.lock().unwrap().is_empty());
    }

    // Mirrors runs.ts requireConfig: a bare `kind: contract` at the config
    // path is the loader's "expected a config document" error, not a fallback.
    #[test]
    fn a_bare_contract_document_fails_like_the_daemon() {
        let vault = TempVault::mini("router-bare-contract");
        std::fs::write(
            vault.config_path(),
            super::super::fixture::MINI_CONTRACT_YAML,
        )
        .unwrap();
        let (router, recorder) = router_with_recorder();
        let err = router.scan(vault.path(), vault.config_path()).unwrap_err();
        assert!(err.0.contains("expected a config document"));
        assert!(recorder.calls.lock().unwrap().is_empty());
    }

    #[test]
    fn a_missing_config_is_a_scaffold_first_error() {
        let vault = TempVault::empty("router-none");
        let (router, recorder) = router_with_recorder();
        let err = router.scan(vault.path(), vault.config_path()).unwrap_err();
        assert!(err.0.contains("no contract config"));
        assert!(err.0.contains("scaffold one first"));
        assert!(recorder.calls.lock().unwrap().is_empty());
    }
}
