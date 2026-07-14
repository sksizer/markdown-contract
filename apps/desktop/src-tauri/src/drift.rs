//! Drift check (D-0019 workstream B) — the daemon-side mirror of `init --check`,
//! ported from the Bun daemon's `runs.ts` (`checkVault`/`findingToDrift`/
//! `driftKind`). Runs the vault's EXISTING config over the tree through the same
//! engine seam a scan uses; any error-level finding means the corpus drifted
//! from the committed contract. This is a read — it computes and returns, it
//! does NOT persist a ScanRun (unlike `scan_now`).
//!
//! The fold is a prototype heuristic (the real re-infer-vs-on-disk diff is future
//! work, gated on the inference port `init` also needs), kept byte-identical to
//! the TS so both surfaces classify drift the same way.

use crate::AppState;
use crate::engine::EngineFinding;
use crate::schema::{AppError, DriftEntry, DriftResult};

/// Run the drift check for `vault_id`: scan through the engine seam, fold error
/// findings into drift entries. Config-missing / engine failure surfaces as an
/// error (the Bun daemon's `requireConfig` guard is the engine's own
/// "no contract config" error here).
pub async fn check(state: &AppState, vault_id: &str) -> Result<DriftResult, AppError> {
    let store = state.store().await?;
    let vault = store.get_vault(vault_id).await?;

    // Behind spawn_blocking like scans::run_scan — engine work is fs/CPU-bound.
    let engine = state.engine_arc();
    let (path, config_path) = (vault.path.clone(), vault.config_path.clone());
    let findings = tokio::task::spawn_blocking(move || engine.scan(&path, &config_path))
        .await
        .map_err(|e| AppError::ScanFailed(format!("engine task failed: {e}")))?
        .map_err(|e| AppError::ScanFailed(e.to_string()))?;

    Ok(fold_drift(&findings))
}

/// Fold a run's findings into a DriftResult: error findings become entries,
/// warn findings ride along as advisory warnings.
fn fold_drift(findings: &[EngineFinding]) -> DriftResult {
    let errors: Vec<&EngineFinding> = findings.iter().filter(|f| f.level == "error").collect();
    DriftResult {
        drifted: !errors.is_empty(),
        entries: errors.iter().map(|f| finding_to_drift(f)).collect(),
        warnings: findings
            .iter()
            .filter(|f| f.level == "warn")
            .map(|f| format!("{}: {}", f.file_path, f.message))
            .collect(),
    }
}

/// One error finding → a DriftEntry (the rule-id keyword heuristic).
fn finding_to_drift(f: &EngineFinding) -> DriftEntry {
    let at = f.line.map(|line| format!(":{line}")).unwrap_or_default();
    DriftEntry {
        kind: drift_kind(&f.finding_id.to_lowercase()).to_string(),
        target: format!("{}{at}", f.file_path),
        detail: format!("{} — {}", f.finding_id, f.message),
    }
}

/// The rule-id → DriftKind keyword fold (byte-identical to `runs.ts::driftKind`).
fn drift_kind(id: &str) -> &'static str {
    let section = id.contains("section");
    if id.contains("order") {
        return "order-changed";
    }
    if id.contains("unknown") || id.contains("unexpected") || id.contains("extra") {
        return if section { "section-added" } else { "field-added" };
    }
    if id.contains("missing") || id.contains("absent") || id.contains("required") {
        return if section { "section-removed" } else { "field-removed" };
    }
    "field-changed"
}

#[cfg(test)]
mod tests {
    use super::*;

    fn finding(finding_id: &str, level: &str, file: &str, line: Option<i32>) -> EngineFinding {
        EngineFinding {
            finding_id: finding_id.to_string(),
            level: level.to_string(),
            file_path: file.to_string(),
            line,
            col: None,
            message: "msg".to_string(),
        }
    }

    // Contract: a clean run (no findings) is no drift.
    #[test]
    fn no_findings_is_no_drift() {
        let drift = fold_drift(&[]);
        assert!(!drift.drifted);
        assert!(drift.entries.is_empty());
        assert!(drift.warnings.is_empty());
    }

    // Contract: an error finding drifts, with target + detail composed from it.
    #[test]
    fn an_error_finding_becomes_a_drift_entry() {
        let drift = fold_drift(&[finding(
            "structure/section-missing",
            "error",
            "docs/guide.md",
            Some(3),
        )]);
        assert!(drift.drifted);
        assert_eq!(drift.entries.len(), 1);
        let e = &drift.entries[0];
        assert_eq!(e.kind, "section-removed", "missing + section → section-removed");
        assert_eq!(e.target, "docs/guide.md:3");
        assert_eq!(e.detail, "structure/section-missing — msg");
    }

    // Contract: warn-level findings are advisory warnings, not drift entries.
    #[test]
    fn warn_findings_are_advisory_not_drift() {
        let drift = fold_drift(&[finding("content/max-words", "warn", "a.md", None)]);
        assert!(!drift.drifted, "warns alone don't count as drift");
        assert!(drift.entries.is_empty());
        assert_eq!(drift.warnings, vec!["a.md: msg"]);
    }

    // The keyword fold, case by case (mirrors runs.ts::driftKind).
    #[test]
    fn drift_kind_keyword_fold() {
        assert_eq!(drift_kind("structure/section-order"), "order-changed");
        assert_eq!(drift_kind("structure/unknown-section"), "section-added");
        assert_eq!(drift_kind("frontmatter/unexpected-field"), "field-added");
        assert_eq!(drift_kind("structure/section-missing"), "section-removed");
        assert_eq!(drift_kind("frontmatter/required-field"), "field-removed");
        assert_eq!(drift_kind("content/max-words"), "field-changed");
    }
}
