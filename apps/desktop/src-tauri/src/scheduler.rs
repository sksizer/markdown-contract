//! Scheduled scans (D-0018 §D5): each vault may carry a cron expression
//! (`Vault.schedule`); a tokio task per scheduled vault sleeps until croner's
//! next occurrence and fires `run_scan` with trigger "schedule". Expressions
//! are validated at the vault create/update seam (store hooks) with the same
//! parser, so an armed schedule can always compute occurrences.
//!
//! Rearming mirrors the watcher: subscribe to the Store's change broadcast
//! and rebuild the task set whenever a Vault row changes.

use std::str::FromStr;
use std::sync::Arc;

use chrono::{DateTime, Local, TimeZone};
use croner::Cron;
use tauri::{AppHandle, Manager};

use crate::AppState;
use crate::schema::EntityKind;

/// Is `expr` a cron expression the scheduler can arm? Used by the vault
/// store hooks to reject invalid schedules with AppError::Invalid.
pub fn validate_schedule(expr: &str) -> Result<(), String> {
    Cron::from_str(expr)
        .map(|_| ())
        .map_err(|e| format!("invalid cron expression '{expr}': {e}"))
}

/// The next occurrence of `expr` strictly after `from`, or None when the
/// expression is invalid or has no future occurrence.
pub fn next_occurrence<Tz: TimeZone>(expr: &str, from: &DateTime<Tz>) -> Option<DateTime<Tz>> {
    let cron = Cron::from_str(expr).ok()?;
    cron.find_next_occurrence(from, false).ok()
}

/// Arm the scheduling lifecycle: spawn a task per scheduled vault, rebuilt on
/// every Vault change event. Called once from app setup.
pub fn spawn(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let state: Arc<AppState> = app.state::<Arc<AppState>>().inner().clone();
        let mut changes = match state.store().await {
            Ok(store) => store.subscribe(),
            Err(e) => {
                eprintln!("scheduler: store unavailable, scheduling disabled: {e}");
                return;
            }
        };
        let mut tasks: Vec<tauri::async_runtime::JoinHandle<()>> = Vec::new();
        sync(&state, &mut tasks).await;
        loop {
            match changes.recv().await {
                Ok(change) if matches!(change.kind, EntityKind::Vault) => {
                    sync(&state, &mut tasks).await;
                }
                Ok(_) => {}
                Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {
                    sync(&state, &mut tasks).await;
                }
                Err(tokio::sync::broadcast::error::RecvError::Closed) => {
                    for task in &tasks {
                        task.abort();
                    }
                    return;
                }
            }
        }
    });
}

/// Rebuild the schedule tasks from the registry: abort the old set, spawn one
/// loop per vault that carries a schedule.
async fn sync(state: &Arc<AppState>, tasks: &mut Vec<tauri::async_runtime::JoinHandle<()>>) {
    for task in tasks.drain(..) {
        task.abort();
    }
    let vaults = match state.store().await {
        Ok(store) => match store.list_vaults(None, None).await {
            Ok(vaults) => vaults,
            Err(e) => {
                eprintln!("scheduler: listing vaults failed: {e}");
                return;
            }
        },
        Err(e) => {
            eprintln!("scheduler: store unavailable: {e}");
            return;
        }
    };
    for vault in vaults {
        let Some(expr) = vault.schedule.clone().filter(|s| !s.is_empty()) else {
            continue;
        };
        let state = state.clone();
        let id = vault.id.clone();
        tasks.push(tauri::async_runtime::spawn(async move {
            schedule_loop(&state, &id, &expr).await;
        }));
    }
}

/// Sleep until each next occurrence (local time — cron the way users read
/// it), then run a "schedule"-triggered scan. Ends if the expression stops
/// producing occurrences.
async fn schedule_loop(state: &Arc<AppState>, vault_id: &str, expr: &str) {
    loop {
        let Some(next) = next_occurrence(expr, &Local::now()) else {
            eprintln!("scheduler: '{vault_id}' schedule '{expr}' has no next occurrence");
            return;
        };
        let wait = (next - Local::now()).to_std().unwrap_or_default();
        tokio::time::sleep(wait).await;
        if let Err(e) = crate::scans::run_scan(state, vault_id, "schedule").await {
            eprintln!("scheduler: scan of '{vault_id}' failed: {e}");
        }
    }
}

#[cfg(test)]
mod tests {
    use chrono::Utc;

    use super::*;

    #[test]
    fn well_formed_cron_expressions_validate() {
        assert!(validate_schedule("0 * * * *").is_ok()); // hourly
        assert!(validate_schedule("*/15 * * * *").is_ok()); // every 15 min
        assert!(validate_schedule("0 9 * * MON-FRI").is_ok()); // weekday 9:00
    }

    #[test]
    fn malformed_cron_expressions_are_rejected_with_context() {
        let err = validate_schedule("not a cron").unwrap_err();
        assert!(
            err.contains("not a cron"),
            "message names the bad input: {err}"
        );
        assert!(
            validate_schedule("0 25 * * *").is_err(),
            "hour 25 is out of range"
        );
        assert!(validate_schedule("").is_err());
    }

    #[test]
    fn next_occurrence_is_the_upcoming_match() {
        // From 10:30 UTC, daily-at-noon next fires the same day at 12:00.
        let from = Utc.with_ymd_and_hms(2026, 7, 9, 10, 30, 0).unwrap();
        let next = next_occurrence("0 12 * * *", &from).unwrap();
        assert_eq!(next, Utc.with_ymd_and_hms(2026, 7, 9, 12, 0, 0).unwrap());
    }

    #[test]
    fn next_occurrence_rolls_over_to_the_next_day() {
        let from = Utc.with_ymd_and_hms(2026, 7, 9, 13, 0, 1).unwrap();
        let next = next_occurrence("0 12 * * *", &from).unwrap();
        assert_eq!(next, Utc.with_ymd_and_hms(2026, 7, 10, 12, 0, 0).unwrap());
    }

    #[test]
    fn next_occurrence_is_strictly_in_the_future() {
        // Exactly ON a match, the next occurrence is the following one.
        let from = Utc.with_ymd_and_hms(2026, 7, 9, 12, 0, 0).unwrap();
        let next = next_occurrence("0 12 * * *", &from).unwrap();
        assert_eq!(next, Utc.with_ymd_and_hms(2026, 7, 10, 12, 0, 0).unwrap());
    }

    #[test]
    fn next_occurrence_of_an_invalid_expression_is_none() {
        let from = Utc.with_ymd_and_hms(2026, 7, 9, 10, 30, 0).unwrap();
        assert!(next_occurrence("bogus", &from).is_none());
    }
}
