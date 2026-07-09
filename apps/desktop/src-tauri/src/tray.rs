//! System tray (D-0018 §D5): the resident face. One tray icon (the app icon)
//! with a menu of per-vault status rows plus "Scan all now", "Open Markdown
//! Contract", and "Quit". The menu is rebuilt whenever the vault registry or
//! any run status changes (Store change broadcast + scan completions). The
//! main window CLOSES TO the tray (see lib.rs's on_window_event); the only
//! real exit is the tray's Quit.
//!
//! Label/tooltip building is pure (unit-tested); the tray/menu calls are the
//! thin OS layer.

use std::sync::Arc;

use tauri::menu::{MenuBuilder, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager};

use crate::AppState;
use crate::schema::{ScanRun, Vault};

/// The tray icon id, so refreshes can find it via `app.tray_by_id`.
const TRAY_ID: &str = "main-tray";

/// Menu-item id prefix for per-vault rows ("vault:<vault_id>").
const VAULT_ITEM_PREFIX: &str = "vault:";

/// One vault's tray-menu label: "<name> — <status>" ("not scanned yet" before
/// the first run). The status word is the ScanRun status vocabulary.
pub fn vault_item_label(name: &str, status: Option<&str>) -> String {
    format!("{name} — {}", status.unwrap_or("not scanned yet"))
}

/// The tray tooltip: the aggregate worst-of-all-vaults summary.
pub fn tray_tooltip(statuses: &[Option<&str>]) -> String {
    if statuses.is_empty() {
        return "Markdown Contract — no vaults tracked".to_string();
    }
    let count = |s: &str| statuses.iter().filter(|v| **v == Some(s)).count();
    let errors = count("error");
    let findings = count("findings");
    if errors > 0 {
        format!(
            "Markdown Contract — {errors} vault{} failing",
            plural(errors)
        )
    } else if findings > 0 {
        format!(
            "Markdown Contract — {findings} vault{} with findings",
            plural(findings)
        )
    } else {
        "Markdown Contract — all green".to_string()
    }
}

fn plural(n: usize) -> &'static str {
    if n == 1 { "" } else { "s" }
}

/// Build the tray and arm its refresh loop. Called once from app setup; in
/// environments without a tray protocol the failure is logged, not fatal.
pub fn spawn(app: AppHandle) {
    if let Err(e) = init(&app) {
        eprintln!("tray: not available in this environment: {e}");
        return;
    }
    tauri::async_runtime::spawn(async move {
        let state: Arc<AppState> = app.state::<Arc<AppState>>().inner().clone();
        let mut changes = match state.store().await {
            Ok(store) => store.subscribe(),
            Err(e) => {
                eprintln!("tray: store unavailable: {e}");
                return;
            }
        };
        refresh(&app, &state).await;
        loop {
            match changes.recv().await {
                // Vault rows change the list; ScanRun rows change statuses.
                Ok(change) => {
                    if matches!(
                        change.kind,
                        crate::schema::EntityKind::Vault | crate::schema::EntityKind::ScanRun
                    ) {
                        refresh(&app, &state).await;
                    }
                }
                Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {
                    refresh(&app, &state).await;
                }
                Err(tokio::sync::broadcast::error::RecvError::Closed) => return,
            }
        }
    });
}

/// Create the tray icon with the app's own icon and the menu-event handler.
fn init(app: &AppHandle) -> tauri::Result<()> {
    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("Markdown Contract")
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| on_menu_event(app, event.id().as_ref()));
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

/// Rebuild the tray menu from the current vault list + latest run statuses.
async fn refresh(app: &AppHandle, state: &Arc<AppState>) {
    let rows = match vault_rows(state).await {
        Ok(rows) => rows,
        Err(e) => {
            eprintln!("tray: reading vault statuses failed: {e}");
            return;
        }
    };
    let Some(tray) = app.tray_by_id(TRAY_ID) else {
        return;
    };

    let result = (|| -> tauri::Result<()> {
        let mut menu = MenuBuilder::new(app);
        for (vault, status) in &rows {
            let label = vault_item_label(&vault.name, status.as_deref());
            let id = format!("{VAULT_ITEM_PREFIX}{}", vault.id);
            menu = menu.item(&MenuItem::with_id(app, id, label, true, None::<&str>)?);
        }
        if !rows.is_empty() {
            menu = menu.separator();
        }
        menu = menu
            .text("scan-all", "Scan all now")
            .text("open-main", "Open Markdown Contract")
            .separator()
            .text("quit", "Quit");
        tray.set_menu(Some(menu.build()?))?;
        let statuses: Vec<Option<&str>> = rows.iter().map(|(_, s)| s.as_deref()).collect();
        tray.set_tooltip(Some(tray_tooltip(&statuses)))?;
        Ok(())
    })();
    if let Err(e) = result {
        eprintln!("tray: menu rebuild failed: {e}");
    }
}

/// Every vault paired with its latest run status (None = never scanned).
async fn vault_rows(
    state: &Arc<AppState>,
) -> Result<Vec<(Vault, Option<String>)>, crate::schema::AppError> {
    let store = state.store().await?;
    let vaults = store.list_vaults(None, None).await?;
    let latest: std::collections::HashMap<String, ScanRun> =
        crate::scans::latest_runs_by_vault(store).await?;
    Ok(vaults
        .into_iter()
        .map(|v| {
            let status = latest.get(&v.id).map(|r| r.status.clone());
            (v, status)
        })
        .collect())
}

/// Menu dispatch: Quit exits for real; everything else surfaces the window,
/// and "Scan all now" additionally sweeps every vault.
fn on_menu_event(app: &AppHandle, id: &str) {
    match id {
        "quit" => app.exit(0),
        "scan-all" => {
            let app = app.clone();
            tauri::async_runtime::spawn(async move {
                let state: Arc<AppState> = app.state::<Arc<AppState>>().inner().clone();
                crate::scans::scan_all(&state, "manual").await;
            });
        }
        "open-main" => show_main_window(app),
        other => {
            if other.starts_with(VAULT_ITEM_PREFIX) {
                show_main_window(app);
            }
        }
    }
}

/// Show + focus the main window (it may be hidden in the tray).
fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.webview_windows().values().next() {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vault_labels_pair_name_and_status() {
        assert_eq!(vault_item_label("Docs", Some("green")), "Docs — green");
        assert_eq!(
            vault_item_label("Docs", Some("findings")),
            "Docs — findings"
        );
        assert_eq!(vault_item_label("Docs", None), "Docs — not scanned yet");
    }

    #[test]
    fn tooltip_reports_worst_of_all_vaults() {
        assert_eq!(tray_tooltip(&[]), "Markdown Contract — no vaults tracked");
        assert_eq!(
            tray_tooltip(&[Some("green"), Some("green")]),
            "Markdown Contract — all green"
        );
        assert_eq!(
            tray_tooltip(&[Some("green"), Some("findings")]),
            "Markdown Contract — 1 vault with findings"
        );
        // Errors outrank findings.
        assert_eq!(
            tray_tooltip(&[Some("error"), Some("findings"), Some("error")]),
            "Markdown Contract — 2 vaults failing"
        );
        // A never-scanned vault doesn't spoil "all green".
        assert_eq!(
            tray_tooltip(&[Some("green"), None]),
            "Markdown Contract — all green"
        );
    }
}
