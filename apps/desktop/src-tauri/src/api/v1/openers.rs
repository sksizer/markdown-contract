use ontogen_macros::ontogen;

use crate::AppState;
use crate::schema::{AppError, OpenPreview, OpenerInfo};

/// The "open in …" menu's data (D-0018 §D5): path-opener's detected installed
/// apps, filtered/ordered by the stored OpenerPreference rows. Thin by design
/// — detection + merging live in crate::openers, behind this API layer.
#[ontogen(rename = "list_openers")]
pub async fn list_openers(state: &AppState) -> Result<Vec<OpenerInfo>, AppError> {
    crate::openers::list_openers(state).await
}

/// Open `path` (a vault directory or a finding's file) with the detected app
/// `app_id`, honoring per-app launch strategies (Obsidian's URI scheme, …).
#[ontogen(rename = "open_path")]
pub async fn open_path(state: &AppState, path: String, app_id: String) -> Result<(), AppError> {
    let _ = state; // uniform stateful signature; launch needs no store access
    crate::openers::open_path(&path, &app_id)
}

/// What `open_path` would spawn for `path` + `app_id`, without spawning it —
/// the UI shows this as the "what will launch" preview.
#[ontogen(rename = "preview_open")]
pub async fn preview_open(
    state: &AppState,
    path: String,
    app_id: String,
) -> Result<OpenPreview, AppError> {
    let _ = state;
    crate::openers::preview_open(&path, &app_id)
}
