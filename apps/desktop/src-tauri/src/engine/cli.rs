//! The TS-CLI fallback (D-0018 §D2): vaults whose configs need the TypeScript
//! engine (code contracts, `$ref`, `.js`/`.mjs` configs) are validated by
//! shelling out to an installed `markdown-contract` CLI:
//!
//! ```text
//! markdown-contract validate <vault> --config <file> --format json
//! ```
//!
//! The binary is looked up on `PATH` only (a plain `Command::new`); an `npx` /
//! package-manager fallback is deliberately not attempted — keeping the seam
//! one process spawn — so a CLI installed only as a project-local dependency is
//! not found. When the binary is absent the scan fails with a clear
//! error_message telling the user to install the TypeScript CLI.
//!
//! `--format json` prints the `Finding[]` interchange array (D-0001) — the very
//! shape `markdown_contract_engine::Finding` deserializes — so parsing reuses
//! the engine crate's serde model and the shared [`map`](super::map) mapping.
//! Exit codes follow the CLI contract: `0` clean, `1` findings (both parse
//! stdout), `2` usage/config error (fails the scan with the CLI's stderr).

use std::ffi::OsString;
use std::process::Command;

use markdown_contract_engine::Finding;

use super::map::to_engine_finding;
use super::{EngineFinding, ScanEngine, ScanEngineError};

/// The PATH name of the TypeScript CLI.
const CLI_PROGRAM: &str = "markdown-contract";

/// The install pointer shown when the binary is missing.
const CLI_MISSING_HELP: &str = "this vault's config needs the TypeScript engine, but the \
`markdown-contract` CLI was not found on PATH. Install it globally (e.g. `npm install -g \
markdown-contract` or `bun add -g markdown-contract`) and scan again. (Only PATH is searched — \
a project-local install without a global shim is not picked up.)";

/// Shell-out engine over the TypeScript `markdown-contract` CLI.
pub struct CliScanEngine {
    program: OsString,
}

impl Default for CliScanEngine {
    fn default() -> Self {
        Self::new(CLI_PROGRAM)
    }
}

impl CliScanEngine {
    /// An engine invoking `program` (tests point this at a stub script).
    pub fn new(program: impl Into<OsString>) -> Self {
        Self {
            program: program.into(),
        }
    }
}

impl ScanEngine for CliScanEngine {
    fn scan(
        &self,
        vault_path: &str,
        config_path: &str,
    ) -> Result<Vec<EngineFinding>, ScanEngineError> {
        let output = Command::new(&self.program)
            .arg("validate")
            .arg(vault_path)
            .arg("--config")
            .arg(config_path)
            .arg("--format")
            .arg("json")
            .output()
            .map_err(|e| {
                if e.kind() == std::io::ErrorKind::NotFound {
                    ScanEngineError(CLI_MISSING_HELP.to_string())
                } else {
                    ScanEngineError(format!("failed to run the markdown-contract CLI: {e}"))
                }
            })?;
        interpret_output(
            output.status.code(),
            &String::from_utf8_lossy(&output.stdout),
            &String::from_utf8_lossy(&output.stderr),
        )
    }
}

/// Fold one CLI invocation into findings: exit `0`/`1` parse stdout (the
/// findings array — `1` only means error-level findings exist); anything else
/// (the CLI's usage/config exit `2`, or a signal kill) fails the scan with the
/// CLI's own diagnostics.
pub fn interpret_output(
    code: Option<i32>,
    stdout: &str,
    stderr: &str,
) -> Result<Vec<EngineFinding>, ScanEngineError> {
    match code {
        Some(0) | Some(1) => parse_findings_json(stdout),
        _ => {
            let detail = if stderr.trim().is_empty() {
                stdout.trim()
            } else {
                stderr.trim()
            };
            let exit = code.map_or("killed by signal".to_string(), |c| format!("exit {c}"));
            Err(ScanEngineError(format!(
                "markdown-contract CLI failed ({exit}): {detail}"
            )))
        }
    }
}

/// Parse the CLI's `--format json` output (a `Finding[]` array) into the
/// desktop shape via the shared mapping.
pub fn parse_findings_json(json: &str) -> Result<Vec<EngineFinding>, ScanEngineError> {
    let findings: Vec<Finding> = serde_json::from_str(json).map_err(|e| {
        ScanEngineError(format!(
            "could not parse the markdown-contract CLI's JSON output: {e}"
        ))
    })?;
    Ok(findings.into_iter().map(to_engine_finding).collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Captured verbatim from the TypeScript CLI over the same mini-vault the
    /// native tests use (fixture.rs):
    ///
    /// ```sh
    /// cd packages/core && bun run build
    /// node dist/cli/index.js validate <mini-vault> \
    ///   --config markdown-contract.yaml --format json   # exit 1
    /// ```
    const CAPTURED_CLI_JSON: &str = r#"[
  {
    "id": "structure/section-missing",
    "level": "error",
    "path": "docs/guide.md",
    "message": "required section ‘Overview’ is missing",
    "pos": {
      "line": 1,
      "col": 1
    }
  }
]"#;

    // Contract first: the captured TS output parses into the exact desktop shape.
    #[test]
    fn parses_the_captured_ts_cli_output() {
        let findings = parse_findings_json(CAPTURED_CLI_JSON).unwrap();
        assert_eq!(findings.len(), 1);
        let f = &findings[0];
        assert_eq!(f.finding_id, "structure/section-missing");
        assert_eq!(f.level, "error");
        assert_eq!(f.file_path, "docs/guide.md");
        assert_eq!((f.line, f.col), (Some(1), Some(1)));
        assert_eq!(f.message, "required section ‘Overview’ is missing");
    }

    #[test]
    fn a_clean_run_parses_to_no_findings() {
        assert!(interpret_output(Some(0), "[]", "").unwrap().is_empty());
    }

    #[test]
    fn exit_one_still_parses_findings() {
        let findings = interpret_output(Some(1), CAPTURED_CLI_JSON, "").unwrap();
        assert_eq!(findings.len(), 1);
    }

    #[test]
    fn exit_two_fails_with_the_cli_diagnostics() {
        let err = interpret_output(Some(2), "", "markdown-contract: config not found: x.yaml\n")
            .unwrap_err();
        assert!(err.0.contains("exit 2"));
        assert!(err.0.contains("config not found"));
    }

    #[test]
    fn a_signal_kill_and_garbage_output_are_clear_errors() {
        assert!(
            interpret_output(None, "", "")
                .unwrap_err()
                .0
                .contains("killed by signal")
        );
        assert!(
            interpret_output(Some(0), "not json", "")
                .unwrap_err()
                .0
                .contains("JSON output")
        );
    }

    #[test]
    fn a_missing_binary_explains_how_to_install_the_ts_engine() {
        let engine = CliScanEngine::new("markdown-contract-definitely-not-installed");
        let err = engine
            .scan("/some/vault", "/some/vault/mc.config.mjs")
            .unwrap_err();
        assert!(err.0.contains("TypeScript engine"));
        assert!(err.0.contains("npm install -g markdown-contract"));
    }

    // End-to-end through a stub "CLI" (a shell script echoing the captured
    // JSON and exiting 1), pinning the spawn → interpret → map pipeline.
    #[cfg(unix)]
    #[test]
    fn spawns_the_cli_and_maps_its_findings() {
        use std::os::unix::fs::PermissionsExt;

        let vault = super::super::fixture::TempVault::empty("cli-stub");
        let script = vault.root().join("fake-markdown-contract");
        std::fs::write(
            &script,
            format!("#!/bin/sh\ncat <<'EOF'\n{CAPTURED_CLI_JSON}\nEOF\nexit 1\n"),
        )
        .unwrap();
        std::fs::set_permissions(&script, std::fs::Permissions::from_mode(0o755)).unwrap();

        let engine = CliScanEngine::new(script.as_os_str());
        let findings = engine.scan(vault.path(), vault.config_path()).unwrap();
        assert_eq!(findings.len(), 1);
        assert_eq!(findings[0].file_path, "docs/guide.md");
    }
}
