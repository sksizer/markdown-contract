//! Scan-completion fan-out (D-0018 §D5): one task subscribes to the
//! AppState's scan-completion broadcast and (1) emits the webview's
//! "scan:completed" Tauri event — the frontend's refresh signal — and
//! (2) raises a desktop notification, but only on STATUS TRANSITIONS
//! (green→findings, findings→green, →error), never on every scan.
//!
//! The transition detection and message building are pure (unit-tested);
//! the OS call is a thin tauri-plugin-notification passthrough.

use std::sync::Arc;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_notification::NotificationExt;

use crate::AppState;
use crate::scans::ScanCompleted;

/// The Tauri event name the frontend listens on to refresh after any scan.
pub const SCAN_COMPLETED_EVENT: &str = "scan:completed";

/// The "scan:completed" event payload — enough for the frontend to refresh
/// the right vault without a follow-up lookup.
#[derive(Debug, Clone, Serialize)]
pub struct ScanCompletedPayload {
    pub vault_id: String,
    pub run_id: String,
    pub status: String,
    pub error_count: i32,
    pub warn_count: i32,
}

/// Should this finished run notify? Only when the vault's status EDGE
/// changed: a vault that was green and stays green (or keeps the same
/// findings status) is silent. A first-ever scan counts as coming from
/// "green" — so a first scan straight into findings/error does notify.
pub fn should_notify(previous_status: Option<&str>, status: &str) -> bool {
    previous_status.unwrap_or("green") != status
}

/// Notification copy for one transition: title names the vault + new state,
/// body carries the error/warn counts (or the failure message).
pub fn notification_content(msg: &ScanCompleted) -> (String, String) {
    let vault = &msg.vault.name;
    match msg.run.status.as_str() {
        "green" => (
            format!("{vault} is green"),
            "All findings resolved — the vault validates clean.".to_string(),
        ),
        "error" => (
            format!("{vault}: scan failed"),
            msg.run
                .error_message
                .clone()
                .unwrap_or_else(|| "The scan could not complete.".to_string()),
        ),
        _ => (
            format!("{vault} has findings"),
            format!(
                "{} error{}, {} warning{}.",
                msg.run.error_count,
                if msg.run.error_count == 1 { "" } else { "s" },
                msg.run.warn_count,
                if msg.run.warn_count == 1 { "" } else { "s" },
            ),
        ),
    }
}

/// Arm the fan-out task. Called once from app setup.
pub fn spawn(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let state = app.state::<Arc<AppState>>().inner().clone();
        let mut completions = state.subscribe_scan_completions();
        loop {
            match completions.recv().await {
                Ok(msg) => handle(&app, &msg),
                Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {}
                Err(tokio::sync::broadcast::error::RecvError::Closed) => return,
            }
        }
    });
}

/// One completion: always emit the webview refresh event; notify the OS only
/// on a transition edge.
fn handle(app: &AppHandle, msg: &ScanCompleted) {
    let payload = ScanCompletedPayload {
        vault_id: msg.vault.id.clone(),
        run_id: msg.run.id.clone(),
        status: msg.run.status.clone(),
        error_count: msg.run.error_count,
        warn_count: msg.run.warn_count,
    };
    if let Err(e) = app.emit(SCAN_COMPLETED_EVENT, payload) {
        eprintln!("notifications: emitting {SCAN_COMPLETED_EVENT} failed: {e}");
    }

    if !should_notify(msg.previous_status.as_deref(), &msg.run.status) {
        return;
    }
    let (title, body) = notification_content(msg);
    if let Err(e) = app.notification().builder().title(title).body(body).show() {
        // Headless / notification-daemon-less environments: log, don't crash.
        eprintln!("notifications: desktop notification failed: {e}");
    }
}

#[cfg(test)]
mod tests {
    use crate::schema::{ScanRun, Vault};

    use super::*;

    fn completed(status: &str, previous: Option<&str>, errors: i32, warns: i32) -> ScanCompleted {
        ScanCompleted {
            vault: Vault {
                id: "vault-docs".to_string(),
                name: "Docs".to_string(),
                path: "/tmp/docs".to_string(),
                config_path: "/tmp/docs/markdown-contract.yaml".to_string(),
                watch_enabled: true,
                schedule: None,
                created_at: "2026-07-09T00:00:00Z".to_string(),
                updated_at: "2026-07-09T00:00:00Z".to_string(),
            },
            run: ScanRun {
                id: "run-1".to_string(),
                vault_id: "vault-docs".to_string(),
                started_at: "2026-07-09T10:00:00Z".to_string(),
                finished_at: Some("2026-07-09T10:00:01Z".to_string()),
                trigger: "watch".to_string(),
                status: status.to_string(),
                error_count: errors,
                warn_count: warns,
                report_count: 0,
                error_message: if status == "error" {
                    Some("config unreadable".to_string())
                } else {
                    None
                },
            },
            previous_status: previous.map(str::to_string),
        }
    }

    // The transition-edge contract: notify exactly when the status changed.
    #[test]
    fn transitions_notify() {
        assert!(should_notify(Some("green"), "findings"));
        assert!(should_notify(Some("findings"), "green"));
        assert!(should_notify(Some("green"), "error"));
        assert!(should_notify(Some("findings"), "error"));
        assert!(should_notify(Some("error"), "green"));
    }

    #[test]
    fn steady_states_stay_silent() {
        assert!(!should_notify(Some("green"), "green"));
        assert!(!should_notify(Some("findings"), "findings"));
        assert!(!should_notify(Some("error"), "error"));
    }

    #[test]
    fn a_first_scan_counts_as_coming_from_green() {
        assert!(!should_notify(None, "green"), "first clean scan is silent");
        assert!(should_notify(None, "findings"));
        assert!(should_notify(None, "error"));
    }

    #[test]
    fn findings_copy_names_the_vault_and_counts() {
        let (title, body) = notification_content(&completed("findings", Some("green"), 3, 1));
        assert_eq!(title, "Docs has findings");
        assert_eq!(body, "3 errors, 1 warning.");
    }

    #[test]
    fn green_copy_reads_as_recovery() {
        let (title, body) = notification_content(&completed("green", Some("findings"), 0, 0));
        assert_eq!(title, "Docs is green");
        assert!(body.contains("clean"));
    }

    #[test]
    fn error_copy_carries_the_failure_message() {
        let (title, body) = notification_content(&completed("error", Some("green"), 0, 0));
        assert_eq!(title, "Docs: scan failed");
        assert_eq!(body, "config unreadable");
    }
}
