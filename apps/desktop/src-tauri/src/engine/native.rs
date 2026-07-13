//! The in-process engine adapter (D-0018 §D2): load the vault's declarative
//! YAML config with `markdown-contract-engine` and run the corpus over the
//! vault directory.
//!
//! Config semantics mirror the TS daemon's `runs.ts` → `loadConfigFile`: the
//! vault's config file must be a `kind: config` router (contract refs resolve
//! relative to the config file's directory; a bare `kind: contract` document is
//! rejected with the loader's own "expected a config document" error, exactly
//! as the daemon rejects it). The vault root is the run root, so findings come
//! back with vault-relative POSIX paths — the daemon's reporting convention.
//!
//! The error is TYPED ([`NativeScanError`]) so the router can tell "this
//! vault's config needs the TypeScript engine" (a `DeclarativeError` escape
//! variant) apart from an ordinary failure; standalone `ScanEngine` use folds
//! both into a plain [`ScanEngineError`].

use std::path::Path;

use markdown_contract_engine::declarative::DeclarativeError;
use markdown_contract_engine::runner::compile_matcher;
use markdown_contract_engine::{RunOptions, load_config_file, run_corpus, walk_dir};

use super::map::to_engine_finding;
use super::{EngineFinding, ScanEngine, ScanEngineError};

/// Why a native scan produced no findings — split so the router can detect the
/// declarative escape variants and delegate to the CLI fallback.
#[derive(Debug, thiserror::Error)]
pub enum NativeScanError {
    /// the config (or a contract it references) failed to compile
    #[error("{0}")]
    Config(#[from] DeclarativeError),
    /// the run itself failed (directory walk / file read / bad glob)
    #[error("{0}")]
    Run(String),
}

/// The in-process `markdown-contract-engine` scan.
#[derive(Default)]
pub struct NativeScanEngine;

impl NativeScanEngine {
    /// Load `config_path` and run the corpus over `vault_path`, keeping the
    /// error typed for the router's escape detection.
    ///
    /// The walk feeds the fs-free `run_corpus` rather than `run_corpus_dir`:
    /// the dir convenience reads EVERY file as UTF-8 up front, which a real
    /// vault's binary content (attachments, `.git` objects) would fail. Like
    /// the TS runner — which reads a file only after it routes — this reads
    /// only files some rule's `include` could match (a superset of the routed
    /// set, so findings are identical), decoding lossily the way Node's
    /// `readFileSync(_, "utf8")` does.
    pub fn try_scan(
        &self,
        vault_path: &str,
        config_path: &str,
    ) -> Result<Vec<EngineFinding>, NativeScanError> {
        let config = load_config_file(Path::new(config_path))?;
        let root = Path::new(vault_path);
        let paths = walk_dir(root).map_err(|e| NativeScanError::Run(e.to_string()))?;

        let includes = config
            .rules
            .iter()
            .map(|rule| compile_matcher(&rule.include))
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| NativeScanError::Run(e.to_string()))?;
        let mut files = Vec::new();
        for rel in paths {
            if includes.iter().any(|matcher| matcher.is_match(&rel)) {
                let bytes = std::fs::read(root.join(&rel))
                    .map_err(|e| NativeScanError::Run(format!("{rel}: {e}")))?;
                files.push((rel, String::from_utf8_lossy(&bytes).into_owned()));
            }
        }

        let outcome = run_corpus(
            &config,
            files
                .iter()
                .map(|(path, source)| (path.as_str(), source.as_str())),
            &RunOptions::default(),
        )
        .map_err(|e| NativeScanError::Run(e.to_string()))?;
        Ok(outcome
            .findings
            .into_iter()
            .map(to_engine_finding)
            .collect())
    }
}

impl ScanEngine for NativeScanEngine {
    fn scan(
        &self,
        vault_path: &str,
        config_path: &str,
    ) -> Result<Vec<EngineFinding>, ScanEngineError> {
        self.try_scan(vault_path, config_path)
            .map_err(|e| ScanEngineError(e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::super::fixture::{TempVault, write_code_ref_config};
    use super::*;

    // Contract first: the mini-vault (one router config, one contract ref, a
    // passing and a failing doc) scans into exactly one mapped finding with a
    // vault-relative path.
    #[test]
    fn scans_a_vault_into_mapped_findings() {
        let vault = TempVault::mini("native-scan");
        let findings = NativeScanEngine
            .scan(vault.path(), vault.config_path())
            .unwrap();
        assert_eq!(findings.len(), 1);
        let f = &findings[0];
        assert_eq!(f.finding_id, "structure/section-missing");
        assert_eq!(f.level, "error");
        assert_eq!(f.file_path, "docs/guide.md", "path is vault-relative");
        assert_eq!((f.line, f.col), (Some(1), Some(1)));
        assert!(f.message.contains("Overview"));
    }

    #[test]
    fn a_clean_vault_scans_green() {
        let vault = TempVault::mini("native-clean");
        std::fs::write(
            vault.root().join("docs/guide.md"),
            "## Overview\n\nAll good now.\n",
        )
        .unwrap();
        let findings = NativeScanEngine
            .scan(vault.path(), vault.config_path())
            .unwrap();
        assert!(findings.is_empty());
    }

    // The rule's `exclude` globs hold: a failing doc under drafts/ is skipped.
    #[test]
    fn excluded_files_are_not_scanned() {
        let vault = TempVault::mini("native-exclude");
        std::fs::create_dir_all(vault.root().join("drafts")).unwrap();
        std::fs::write(vault.root().join("drafts/wip.md"), "## Wrong\n\nwip\n").unwrap();
        let findings = NativeScanEngine
            .scan(vault.path(), vault.config_path())
            .unwrap();
        assert_eq!(findings.len(), 1);
        assert_eq!(findings[0].file_path, "docs/guide.md");
    }

    // Real vaults carry binary content (attachments, .git objects). Only
    // files a rule's include could route are read, so the scan doesn't choke.
    #[test]
    fn binary_vault_content_does_not_break_the_scan() {
        let vault = TempVault::mini("native-binary");
        std::fs::create_dir_all(vault.root().join(".git/objects")).unwrap();
        std::fs::write(
            vault.root().join(".git/objects/blob"),
            [0xFFu8, 0xFE, 0x00, 0x9C],
        )
        .unwrap();
        std::fs::write(
            vault.root().join("image.png"),
            [0x89u8, b'P', b'N', b'G', 0xFF, 0x00],
        )
        .unwrap();
        let findings = NativeScanEngine
            .scan(vault.path(), vault.config_path())
            .unwrap();
        assert_eq!(findings.len(), 1);
        assert_eq!(findings[0].file_path, "docs/guide.md");
    }

    #[test]
    fn a_missing_config_is_a_typed_config_error() {
        let vault = TempVault::mini("native-missing");
        let missing = vault.root().join("nope.yaml");
        let err = NativeScanEngine
            .try_scan(vault.path(), missing.to_str().unwrap())
            .unwrap_err();
        assert!(matches!(err, NativeScanError::Config(_)));
    }

    // The escape hook: a `.ts` contract ref surfaces as the typed
    // `DeclarativeError::CodeContractRef` the router keys its fallback on.
    #[test]
    fn a_code_contract_ref_is_the_typed_escape_error() {
        let vault = TempVault::mini("native-code-ref");
        write_code_ref_config(&vault);
        let err = NativeScanEngine
            .try_scan(vault.path(), vault.config_path())
            .unwrap_err();
        assert!(matches!(
            err,
            NativeScanError::Config(DeclarativeError::CodeContractRef { .. })
        ));
    }
}
