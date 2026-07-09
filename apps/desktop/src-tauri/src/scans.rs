//! Hand-written scan orchestration — the one place "scan a vault" is
//! implemented, sitting BEHIND the generated API layer per D-0018 §D4 (the
//! transports forward to api::v1::scan::scan_now, which forwards here; the
//! future watcher/scheduler call here too with their own trigger).

use std::sync::atomic::{AtomicU64, Ordering};

use crate::AppState;
use crate::schema::{AppError, FindingRecord, ScanRun};
use crate::store::generated::scan_run::ScanRunUpdate;

/// Run one scan of `vault_id` now: persist a "running" ScanRun, call through
/// the ScanEngine seam, persist each finding as a FindingRecord, and finalize
/// the run with counts + status ("green" | "findings" | "error").
pub async fn run_scan(state: &AppState, vault_id: &str, trigger: &str) -> Result<ScanRun, AppError> {
    let store = state.store().await?;
    let vault = store.get_vault(vault_id).await?;

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

    // The engine seam. The stub is instant; once the real engine lands, this
    // moves behind spawn_blocking so a large vault doesn't stall the executor.
    let outcome = state.engine().scan(&vault.path, &vault.config_path);

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
            update.status = Some(if findings.is_empty() { "green" } else { "findings" }.to_string());
        }
        Err(e) => {
            update.status = Some("error".to_string());
            update.error_message = Some(Some(e.to_string()));
        }
    }
    store.update_scan_run(&run_id, update).await
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
        fn scan(&self, _vault_path: &str, _config_path: &str) -> Result<Vec<EngineFinding>, ScanEngineError> {
            self.0.clone().map_err(ScanEngineError)
        }
    }

    async fn state_with(engine: Arc<dyn ScanEngine>) -> AppState {
        let db = crate::persistence::db::connect("sqlite::memory:").await.unwrap();
        crate::persistence::db::create_schema(&db).await.unwrap();
        AppState::new(Arc::new(db), engine)
    }

    async fn register_vault(state: &AppState) -> Vault {
        let store = state.store().await.unwrap();
        store
            .create_vault(Vault {
                id: String::new(), // the before_create hook slugs it from name
                name: "My Docs".to_string(),
                path: "/tmp/my-docs".to_string(),
                config_path: "/tmp/my-docs/markdown-contract.yaml".to_string(),
                watch_enabled: true,
                schedule: None,
                created_at: "2026-07-09T00:00:00Z".to_string(),
                updated_at: "2026-07-09T00:00:00Z".to_string(),
            })
            .await
            .unwrap()
    }

    #[tokio::test]
    async fn a_clean_vault_scans_green() {
        let state = state_with(Arc::new(StubScanEngine)).await;
        let vault = register_vault(&state).await;

        let run = run_scan(&state, &vault.id, "manual").await.unwrap();

        assert_eq!(run.vault_id, "vault-my-docs");
        assert_eq!(run.trigger, "manual");
        assert_eq!(run.status, "green");
        assert_eq!((run.error_count, run.warn_count, run.report_count), (0, 0, 0));
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
        assert_eq!((run.error_count, run.warn_count, run.report_count), (1, 1, 0));
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
    async fn scanning_an_unknown_vault_is_not_found() {
        let state = state_with(Arc::new(StubScanEngine)).await;
        let err = run_scan(&state, "vault-nope", "manual").await.unwrap_err();
        assert!(matches!(err, AppError::VaultNotFound(_)));
    }
}
