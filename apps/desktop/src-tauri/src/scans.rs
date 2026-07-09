//! Hand-written scan orchestration — the one place "scan a vault" is
//! implemented, sitting BEHIND the generated API layer per D-0018 §D4 (the
//! transports forward to api::v1::scan::scan_now, which forwards here; the
//! watcher/scheduler/startup/tray triggers call here too with their own
//! trigger string). Every finished run is fanned out on the AppState's
//! scan-completion broadcast — the seam notifications, the tray, and the
//! webview "scan:completed" event hang off.

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};

use crate::AppState;
use crate::schema::{AppError, FindingRecord, ScanRun, Vault};
use crate::store::Store;
use crate::store::generated::scan_run::ScanRunUpdate;

/// One finished scan, broadcast from [`run_scan`]: the run, its vault, and
/// the status of the vault's PREVIOUS finished run (None on the first scan) —
/// exactly what transition-edge notification detection needs.
#[derive(Debug, Clone)]
pub struct ScanCompleted {
    pub vault: Vault,
    pub run: ScanRun,
    pub previous_status: Option<String>,
}

/// Run one scan of `vault_id` now: persist a "running" ScanRun, call through
/// the ScanEngine seam, persist each finding as a FindingRecord, and finalize
/// the run with counts + status ("green" | "findings" | "error").
pub async fn run_scan(
    state: &AppState,
    vault_id: &str,
    trigger: &str,
) -> Result<ScanRun, AppError> {
    let store = state.store().await?;
    let vault = store.get_vault(vault_id).await?;
    let previous_status = latest_finished_status(store, &vault.id).await?;

    let run_id = new_run_id(&vault.id);
    store
        .create_scan_run(ScanRun {
            id: run_id.clone(),
            vault_id: vault.id.clone(),
            started_at: now_iso8601(),
            finished_at: None,
            trigger: trigger.to_string(),
            status: "running".to_string(),
            error_count: 0,
            warn_count: 0,
            report_count: 0,
            error_message: None,
        })
        .await?;

    // The engine seam, behind spawn_blocking: real scans are fs/CPU-bound (and
    // the CLI fallback blocks on a child process), so a large vault must not
    // stall the executor. A panicked/cancelled engine task becomes an error run.
    let engine = state.engine_arc();
    let (vault_path, config_path) = (vault.path.clone(), vault.config_path.clone());
    let outcome = tokio::task::spawn_blocking(move || engine.scan(&vault_path, &config_path))
        .await
        .unwrap_or_else(|join_err| {
            Err(crate::engine::ScanEngineError(format!(
                "engine task failed: {join_err}"
            )))
        });

    let mut update = ScanRunUpdate {
        finished_at: Some(Some(now_iso8601())),
        ..Default::default()
    };
    match outcome {
        Ok(findings) => {
            let (mut errors, mut warns, mut reports) = (0, 0, 0);
            for (index, finding) in findings.iter().enumerate() {
                match finding.level.as_str() {
                    "error" => errors += 1,
                    "warn" => warns += 1,
                    _ => reports += 1,
                }
                store
                    .create_finding_record(FindingRecord {
                        id: format!("{run_id}-f{index}"),
                        scan_run_id: run_id.clone(),
                        finding_id: finding.finding_id.clone(),
                        level: finding.level.clone(),
                        file_path: finding.file_path.clone(),
                        line: finding.line,
                        col: finding.col,
                        message: finding.message.clone(),
                    })
                    .await?;
            }
            update.error_count = Some(errors);
            update.warn_count = Some(warns);
            update.report_count = Some(reports);
            update.status = Some(
                if findings.is_empty() {
                    "green"
                } else {
                    "findings"
                }
                .to_string(),
            );
        }
        Err(e) => {
            update.status = Some("error".to_string());
            update.error_message = Some(Some(e.to_string()));
        }
    }
    let run = store.update_scan_run(&run_id, update).await?;

    state.notify_scan_completed(ScanCompleted {
        vault,
        run: run.clone(),
        previous_status,
    });
    Ok(run)
}

/// Scan every registered vault with `trigger`, sequentially (no stampede).
/// Per-vault failures are reported to stderr and don't stop the sweep — the
/// startup sweep and the tray's "Scan all now" both want best-effort.
pub async fn scan_all(state: &AppState, trigger: &str) {
    let vaults = match state.store().await {
        Ok(store) => match store.list_vaults(None, None).await {
            Ok(vaults) => vaults,
            Err(e) => {
                eprintln!("scan_all({trigger}): listing vaults failed: {e}");
                return;
            }
        },
        Err(e) => {
            eprintln!("scan_all({trigger}): store unavailable: {e}");
            return;
        }
    };
    for vault in vaults {
        if let Err(e) = run_scan(state, &vault.id, trigger).await {
            eprintln!("scan_all({trigger}): scanning '{}' failed: {e}", vault.id);
        }
    }
}

/// The status of the vault's most recent FINISHED run (skips in-flight
/// "running" rows), or None when the vault has never completed a scan.
async fn latest_finished_status(store: &Store, vault_id: &str) -> Result<Option<String>, AppError> {
    let runs = store.list_scan_runs(None, None).await?;
    Ok(runs
        .into_iter()
        .filter(|r| r.vault_id == vault_id && r.finished_at.is_some())
        .max_by(|a, b| (&a.started_at, &a.id).cmp(&(&b.started_at, &b.id)))
        .map(|r| r.status))
}

/// The most recent run per vault (including in-flight ones) — the tray menu's
/// per-vault "current status" source.
pub async fn latest_runs_by_vault(store: &Store) -> Result<HashMap<String, ScanRun>, AppError> {
    let mut latest: HashMap<String, ScanRun> = HashMap::new();
    for run in store.list_scan_runs(None, None).await? {
        match latest.get(&run.vault_id) {
            Some(cur) if (&cur.started_at, &cur.id) >= (&run.started_at, &run.id) => {}
            _ => {
                latest.insert(run.vault_id.clone(), run);
            }
        }
    }
    Ok(latest)
}

/// "run-<vault_id>-<epoch_nanos>-<seq>": time-ordered and collision-free even
/// for back-to-back runs inside one nanosecond tick.
fn new_run_id(vault_id: &str) -> String {
    static SEQ: AtomicU64 = AtomicU64::new(0);
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let seq = SEQ.fetch_add(1, Ordering::Relaxed);
    format!("run-{vault_id}-{nanos}-{seq}")
}

fn now_iso8601() -> String {
    time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use crate::engine::{EngineFinding, ScanEngine, ScanEngineError, StubScanEngine};
    use crate::schema::Vault;

    use super::*;

    /// Test double: an engine that returns a fixed set of findings (or fails).
    struct FixedScanEngine(Result<Vec<EngineFinding>, String>);

    impl ScanEngine for FixedScanEngine {
        fn scan(
            &self,
            _vault_path: &str,
            _config_path: &str,
        ) -> Result<Vec<EngineFinding>, ScanEngineError> {
            self.0.clone().map_err(ScanEngineError)
        }
    }

    async fn state_with(engine: Arc<dyn ScanEngine>) -> AppState {
        let db = crate::persistence::db::connect("sqlite::memory:")
            .await
            .unwrap();
        crate::persistence::db::create_schema(&db).await.unwrap();
        AppState::new(Arc::new(db), engine)
    }

    async fn register_vault_at(state: &AppState, path: &str, config_path: &str) -> Vault {
        let store = state.store().await.unwrap();
        store
            .create_vault(Vault {
                id: String::new(), // the before_create hook slugs it from name
                name: "My Docs".to_string(),
                path: path.to_string(),
                config_path: config_path.to_string(),
                watch_enabled: true,
                schedule: None,
                created_at: "2026-07-09T00:00:00Z".to_string(),
                updated_at: "2026-07-09T00:00:00Z".to_string(),
            })
            .await
            .unwrap()
    }

    async fn register_vault(state: &AppState) -> Vault {
        register_vault_at(state, "/tmp/my-docs", "/tmp/my-docs/markdown-contract.yaml").await
    }

    #[tokio::test]
    async fn a_clean_vault_scans_green() {
        let state = state_with(Arc::new(StubScanEngine)).await;
        let vault = register_vault(&state).await;

        let run = run_scan(&state, &vault.id, "manual").await.unwrap();

        assert_eq!(run.vault_id, "vault-my-docs");
        assert_eq!(run.trigger, "manual");
        assert_eq!(run.status, "green");
        assert_eq!(
            (run.error_count, run.warn_count, run.report_count),
            (0, 0, 0)
        );
        assert!(run.finished_at.is_some());
    }

    #[tokio::test]
    async fn findings_are_counted_by_level_and_persisted() {
        let engine = FixedScanEngine(Ok(vec![
            EngineFinding {
                finding_id: "structure/missing-section".to_string(),
                level: "error".to_string(),
                file_path: "README.md".to_string(),
                line: Some(3),
                col: Some(1),
                message: "missing required section".to_string(),
            },
            EngineFinding {
                finding_id: "content/max-words".to_string(),
                level: "warn".to_string(),
                file_path: "docs/guide.md".to_string(),
                line: None,
                col: None,
                message: "section too long".to_string(),
            },
        ]));
        let state = state_with(Arc::new(engine)).await;
        let vault = register_vault(&state).await;

        let run = run_scan(&state, &vault.id, "watch").await.unwrap();

        assert_eq!(run.status, "findings");
        assert_eq!(
            (run.error_count, run.warn_count, run.report_count),
            (1, 1, 0)
        );
        let store = state.store().await.unwrap();
        let records: Vec<_> = store
            .list_finding_records(None, None)
            .await
            .unwrap()
            .into_iter()
            .filter(|r| r.scan_run_id == run.id)
            .collect();
        assert_eq!(records.len(), 2);
        assert_eq!(records[0].finding_id, "structure/missing-section");
        assert_eq!(records[0].line, Some(3));
    }

    #[tokio::test]
    async fn an_engine_failure_becomes_an_error_run() {
        let engine = FixedScanEngine(Err("config unreadable".to_string()));
        let state = state_with(Arc::new(engine)).await;
        let vault = register_vault(&state).await;

        let run = run_scan(&state, &vault.id, "manual").await.unwrap();

        assert_eq!(run.status, "error");
        assert_eq!(run.error_message.as_deref(), Some("config unreadable"));
    }

    #[tokio::test]
    async fn completions_broadcast_the_run_and_the_previous_status() {
        let state = state_with(Arc::new(StubScanEngine)).await;
        let vault = register_vault(&state).await;
        let mut completions = state.subscribe_scan_completions();

        run_scan(&state, &vault.id, "manual").await.unwrap();
        let first = completions.recv().await.unwrap();
        assert_eq!(first.vault.name, "My Docs");
        assert_eq!(first.run.status, "green");
        assert_eq!(
            first.previous_status, None,
            "first scan has no previous run"
        );

        run_scan(&state, &vault.id, "watch").await.unwrap();
        let second = completions.recv().await.unwrap();
        assert_eq!(second.previous_status.as_deref(), Some("green"));
    }

    // End-to-end with the REAL engine (the production EngineRouter over the
    // mini-vault fixture): run_scan persists the native engine's finding as a
    // FindingRecord, field for field.
    #[tokio::test]
    async fn the_real_engine_persists_finding_records_end_to_end() {
        let vault_dir = crate::engine::fixture::TempVault::mini("scans-e2e");
        let state = state_with(Arc::new(crate::engine::EngineRouter::default())).await;
        let vault = register_vault_at(&state, vault_dir.path(), vault_dir.config_path()).await;

        let run = run_scan(&state, &vault.id, "manual").await.unwrap();

        assert_eq!(run.status, "findings");
        assert_eq!(
            (run.error_count, run.warn_count, run.report_count),
            (1, 0, 0)
        );
        let store = state.store().await.unwrap();
        let records: Vec<_> = store
            .list_finding_records(None, None)
            .await
            .unwrap()
            .into_iter()
            .filter(|r| r.scan_run_id == run.id)
            .collect();
        assert_eq!(records.len(), 1);
        let record = &records[0];
        assert_eq!(record.finding_id, "structure/section-missing");
        assert_eq!(record.level, "error");
        assert_eq!(record.file_path, "docs/guide.md", "vault-relative path");
        assert_eq!((record.line, record.col), (Some(1), Some(1)));
        assert!(record.message.contains("Overview"));
    }

    // A vault whose config needs the TS engine, with no CLI installed: the run
    // finishes as an error carrying the install pointer (never a silent green).
    #[tokio::test]
    async fn a_ts_engine_vault_without_the_cli_is_an_error_run() {
        let vault_dir = crate::engine::fixture::TempVault::mini("scans-ts-vault");
        crate::engine::fixture::write_code_ref_config(&vault_dir);
        let router = crate::engine::EngineRouter::with_fallback(Arc::new(
            crate::engine::CliScanEngine::new("markdown-contract-definitely-not-installed"),
        ));
        let state = state_with(Arc::new(router)).await;
        let vault = register_vault_at(&state, vault_dir.path(), vault_dir.config_path()).await;

        let run = run_scan(&state, &vault.id, "manual").await.unwrap();

        assert_eq!(run.status, "error");
        let message = run.error_message.unwrap();
        assert!(message.contains("TypeScript engine"));
        assert!(message.contains("npm install -g markdown-contract"));
    }

    #[tokio::test]
    async fn scan_all_sweeps_every_vault() {
        let state = state_with(Arc::new(StubScanEngine)).await;
        let vault = register_vault(&state).await;

        scan_all(&state, "startup").await;

        let store = state.store().await.unwrap();
        let latest = latest_runs_by_vault(store).await.unwrap();
        let run = latest.get(&vault.id).expect("vault was swept");
        assert_eq!(run.trigger, "startup");
        assert_eq!(run.status, "green");
    }

    #[tokio::test]
    async fn scanning_an_unknown_vault_is_not_found() {
        let state = state_with(Arc::new(StubScanEngine)).await;
        let err = run_scan(&state, "vault-nope", "manual").await.unwrap_err();
        assert!(matches!(err, AppError::VaultNotFound(_)));
    }
}
