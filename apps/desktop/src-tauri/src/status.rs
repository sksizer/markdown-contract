//! The vault-status projection (D-0019 workstream A) — the one place a
//! [`Vault`] is joined with its latest [`ScanRun`] + findings into a
//! [`VaultStatus`], sitting BEHIND the generated API layer (api/v1/vault_status)
//! the way scan orchestration sits behind api/v1/scan. Retires the #251
//! Bun-daemon stopgap by making status a first-class, cross-surface read.

use crate::schema::{AppError, FindingRecord, ScanRun, Vault, VaultStatus};
use crate::store::Store;

/// Project every vault into its status — the dashboard's list read. Fetches
/// runs + findings ONCE and groups in memory (not N queries per vault).
pub async fn project_all(store: &Store) -> Result<Vec<VaultStatus>, AppError> {
    let vaults = store.list_vaults(None, None).await?;
    let runs = store.list_scan_runs(None, None).await?;
    let findings = store.list_finding_records(None, None).await?;
    Ok(vaults
        .into_iter()
        .map(|vault| project(vault, &runs, &findings))
        .collect())
}

/// Project one vault into its status — the detail read.
pub async fn project_one(store: &Store, vault: Vault) -> Result<VaultStatus, AppError> {
    let runs = store.list_scan_runs(None, None).await?;
    let findings = store.list_finding_records(None, None).await?;
    Ok(project(vault, &runs, &findings))
}

/// The pure join: pick this vault's latest run (drives `state`) and the findings
/// of its latest FINISHED run (preserved across an in-flight re-run). Runs are
/// ordered by `(started_at, id)` so the newest wins deterministically even for
/// same-timestamp back-to-back runs. Entities are mapped to their hand-owned
/// mirror types via `.into()` (see schema::vault_status for why).
fn project(vault: Vault, runs: &[ScanRun], findings: &[FindingRecord]) -> VaultStatus {
    let mut mine: Vec<&ScanRun> = runs.iter().filter(|r| r.vault_id == vault.id).collect();
    mine.sort_by(|a, b| (&a.started_at, &a.id).cmp(&(&b.started_at, &b.id)));

    let latest_run = mine.last().copied().cloned();
    let state = latest_run
        .as_ref()
        .map_or_else(|| "unknown".to_string(), |r| r.status.clone());

    // Findings come from the latest FINISHED run, so an in-flight scan
    // ("running", no findings yet) doesn't blank the dashboard.
    let latest_finished = mine.iter().rev().find(|r| r.finished_at.is_some());
    let findings = latest_finished.map_or_else(Vec::new, |run| {
        findings
            .iter()
            .filter(|f| f.scan_run_id == run.id)
            .cloned()
            .map(Into::into)
            .collect()
    });

    VaultStatus {
        vault: vault.into(),
        state,
        latest_run: latest_run.map(Into::into),
        findings,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn vault(id: &str) -> Vault {
        Vault {
            id: id.to_string(),
            name: id.to_string(),
            path: format!("/tmp/{id}"),
            config_path: format!("/tmp/{id}/markdown-contract.yaml"),
            watch_enabled: false,
            schedule: None,
            created_at: "2026-07-14T00:00:00Z".to_string(),
            updated_at: "2026-07-14T00:00:00Z".to_string(),
        }
    }

    fn run(id: &str, vault_id: &str, started_at: &str, status: &str, finished: bool) -> ScanRun {
        ScanRun {
            id: id.to_string(),
            vault_id: vault_id.to_string(),
            started_at: started_at.to_string(),
            finished_at: finished.then(|| "2026-07-14T00:00:01Z".to_string()),
            trigger: "manual".to_string(),
            status: status.to_string(),
            error_count: 0,
            warn_count: 0,
            report_count: 0,
            error_message: None,
        }
    }

    fn finding(id: &str, run_id: &str, finding_id: &str) -> FindingRecord {
        FindingRecord {
            id: id.to_string(),
            scan_run_id: run_id.to_string(),
            finding_id: finding_id.to_string(),
            level: "error".to_string(),
            file_path: "README.md".to_string(),
            line: Some(1),
            col: Some(1),
            message: "boom".to_string(),
        }
    }

    // Contract: a never-scanned vault projects to state "unknown", no run, no findings.
    #[test]
    fn a_never_scanned_vault_is_unknown() {
        let status = project(vault("v"), &[], &[]);
        assert_eq!(status.state, "unknown");
        assert!(status.latest_run.is_none());
        assert!(status.findings.is_empty());
    }

    // Contract: a green vault projects to state "green" with its run and no findings.
    #[test]
    fn a_green_vault_carries_its_latest_run() {
        let runs = [run("r1", "v", "2026-07-14T00:00:00Z", "green", true)];
        let status = project(vault("v"), &runs, &[]);
        assert_eq!(status.state, "green");
        assert_eq!(status.latest_run.unwrap().id, "r1");
        assert!(status.findings.is_empty());
    }

    // Contract: a vault with findings carries exactly its latest run's findings.
    #[test]
    fn findings_come_from_the_latest_finished_run() {
        let runs = [
            run("r1", "v", "2026-07-14T00:00:00Z", "green", true),
            run("r2", "v", "2026-07-14T00:00:05Z", "findings", true),
        ];
        let findings = [
            finding("r1-f0", "r1", "old/gone"),
            finding("r2-f0", "r2", "structure/section-missing"),
        ];
        let status = project(vault("v"), &runs, &findings);
        assert_eq!(status.state, "findings");
        assert_eq!(status.latest_run.unwrap().id, "r2");
        assert_eq!(status.findings.len(), 1);
        assert_eq!(status.findings[0].finding_id, "structure/section-missing");
    }

    // Edge: an in-flight re-run shows "running" but keeps the last finished
    // run's findings (the dashboard doesn't blank mid-scan).
    #[test]
    fn an_in_flight_run_preserves_the_last_findings() {
        let runs = [
            run("r1", "v", "2026-07-14T00:00:00Z", "findings", true),
            run("r2", "v", "2026-07-14T00:00:05Z", "running", false),
        ];
        let findings = [finding("r1-f0", "r1", "structure/section-missing")];
        let status = project(vault("v"), &runs, &findings);
        assert_eq!(status.state, "running");
        assert_eq!(status.latest_run.unwrap().id, "r2", "state tracks the newest run");
        assert_eq!(status.findings.len(), 1, "findings preserved from r1");
        assert_eq!(status.findings[0].scan_run_id, "r1");
    }

    // Edge: another vault's runs never leak into this one's projection.
    #[test]
    fn runs_are_scoped_to_their_vault() {
        let runs = [
            run("r1", "v", "2026-07-14T00:00:00Z", "green", true),
            run("x1", "other", "2026-07-14T00:00:09Z", "error", true),
        ];
        let status = project(vault("v"), &runs, &[]);
        assert_eq!(status.state, "green", "the other vault's error run is ignored");
        assert_eq!(status.latest_run.unwrap().id, "r1");
    }
}
