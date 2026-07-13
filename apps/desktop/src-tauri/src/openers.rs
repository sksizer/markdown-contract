//! "Open in …" orchestration (D-0018 §D5), behind the generated API layer the
//! same way scans.rs is: api::v1::openers forwards here. The preference merge
//! is a pure function over plain data (unit-tested); the OS calls (app
//! detection, spawning) stay thin path-opener passthroughs.

use std::path::Path;

use path_opener::PathOpener;

use crate::AppState;
use crate::schema::{AppError, OpenPreview, OpenerInfo, OpenerPreference};

/// Merge path-opener's detected apps with the stored OpenerPreference rows:
/// keep installed apps only, drop rows a preference disables, and order by
/// preference `sort_order` (preferred rows first, then the rest by name).
pub fn merge_openers(detected: Vec<PathOpener>, prefs: &[OpenerPreference]) -> Vec<OpenerInfo> {
    let mut merged: Vec<OpenerInfo> = detected
        .into_iter()
        .filter(|app| app.is_available)
        .filter_map(|app| {
            let pref = prefs.iter().find(|p| p.app_id == app.app_id);
            if pref.is_some_and(|p| !p.enabled) {
                return None;
            }
            Some(OpenerInfo {
                accepts_markdown: app.file_support.accepts_extension("md"),
                app_id: app.app_id,
                name: app.name,
                command: app.command,
                accepts_directories: app.accepts_directories,
                // Un-preferred apps sort after every explicit preference.
                sort_order: pref.map_or(i32::MAX, |p| p.sort_order),
            })
        })
        .collect();
    merged.sort_by(|a, b| (a.sort_order, &a.name).cmp(&(b.sort_order, &b.name)));
    merged
}

/// Detected installed apps, preference-merged. Detection shells out to
/// `which`/bundle checks, so it runs on the blocking pool.
pub async fn list_openers(state: &AppState) -> Result<Vec<OpenerInfo>, AppError> {
    let prefs = state
        .store()
        .await?
        .list_opener_preferences(None, None)
        .await?;
    let detected = tokio::task::spawn_blocking(path_opener::detect_installed_apps)
        .await
        .map_err(|e| AppError::Invalid(format!("opener detection failed: {e}")))?;
    Ok(merge_openers(detected, &prefs))
}

/// Launch `path` with the app identified by `app_id` (path-opener dispatches
/// the per-app launch strategy, e.g. Obsidian's `obsidian://` URI).
pub fn open_path(path: &str, app_id: &str) -> Result<(), AppError> {
    path_opener::open(Path::new(path), app_id)
        .map_err(|e| AppError::Invalid(format!("open with '{app_id}' failed: {e}")))
}

/// What `open_path` would spawn, without spawning it.
pub fn preview_open(path: &str, app_id: &str) -> Result<OpenPreview, AppError> {
    let preview = path_opener::preview_command(Path::new(path), app_id)
        .map_err(|e| AppError::Invalid(format!("preview for '{app_id}' failed: {e}")))?;
    Ok(OpenPreview {
        program: preview.program,
        args: preview.args,
    })
}

#[cfg(test)]
mod tests {
    use path_opener::FileSupport;

    use super::*;

    fn app(app_id: &str, name: &str, available: bool) -> PathOpener {
        PathOpener {
            app_id: app_id.to_string(),
            name: name.to_string(),
            command: app_id.to_string(),
            is_available: available,
            accepts_directories: true,
            file_support: FileSupport::Any,
            is_default: false,
            is_hidden: false,
            sort_order: None,
        }
    }

    fn pref(app_id: &str, enabled: bool, sort_order: i32) -> OpenerPreference {
        OpenerPreference {
            id: format!("pref-{app_id}"),
            app_id: app_id.to_string(),
            enabled,
            sort_order,
        }
    }

    #[test]
    fn only_installed_apps_are_listed() {
        let merged = merge_openers(
            vec![
                app("vscode", "Visual Studio Code", true),
                app("zed", "Zed", false),
            ],
            &[],
        );
        let ids: Vec<_> = merged.iter().map(|o| o.app_id.as_str()).collect();
        assert_eq!(ids, ["vscode"]);
    }

    #[test]
    fn a_disabling_preference_removes_the_app() {
        let merged = merge_openers(
            vec![
                app("vscode", "Visual Studio Code", true),
                app("zed", "Zed", true),
            ],
            &[pref("vscode", false, 0)],
        );
        let ids: Vec<_> = merged.iter().map(|o| o.app_id.as_str()).collect();
        assert_eq!(ids, ["zed"]);
    }

    #[test]
    fn preferences_order_first_then_names() {
        let merged = merge_openers(
            vec![
                app("zed", "Zed", true),
                app("vscode", "Visual Studio Code", true),
                app("obsidian", "Obsidian", true),
            ],
            &[pref("zed", true, 1), pref("obsidian", true, 2)],
        );
        let ids: Vec<_> = merged.iter().map(|o| o.app_id.as_str()).collect();
        // zed (sort 1), obsidian (sort 2), then the un-preferred rest by name.
        assert_eq!(ids, ["zed", "obsidian", "vscode"]);
    }

    #[test]
    fn file_support_flattens_to_accepts_markdown() {
        let mut markdown_only = app("obsidian", "Obsidian", true);
        markdown_only.file_support = FileSupport::Extensions(vec!["md".into()]);
        let mut no_files = app("terminal", "Terminal", true);
        no_files.file_support = FileSupport::NotSupported;

        let merged = merge_openers(vec![markdown_only, no_files], &[]);
        let obsidian = merged.iter().find(|o| o.app_id == "obsidian").unwrap();
        let terminal = merged.iter().find(|o| o.app_id == "terminal").unwrap();
        assert!(obsidian.accepts_markdown);
        assert!(!terminal.accepts_markdown);
    }

    #[test]
    fn preview_reports_the_effective_command() {
        let preview = preview_open("/tmp/some-vault", "vscode").unwrap();
        assert_eq!(preview.program, "code");
        assert_eq!(
            preview.args.last().map(String::as_str),
            Some("/tmp/some-vault")
        );
    }

    #[test]
    fn unknown_app_ids_are_invalid() {
        assert!(matches!(
            open_path("/tmp/x", "not-a-real-app"),
            Err(AppError::Invalid(_))
        ));
        assert!(matches!(
            preview_open("/tmp/x", "not-a-real-app"),
            Err(AppError::Invalid(_))
        ));
    }
}
