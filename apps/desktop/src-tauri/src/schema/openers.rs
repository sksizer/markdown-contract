use serde::{Deserialize, Serialize};

/// One entry of the "open in …" menu (D-0018 §D5): a path-opener detected app,
/// already filtered to installed + not disabled by an OpenerPreference row.
///
/// Hand-owned wire DTO (not an entity): path-opener's own `PathOpener` type
/// can't cross the generated TS surface (external crate — outside the ontogen
/// type pool — and its `specta` feature pins a conflicting rc), so the API
/// layer flattens it into this shape.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OpenerInfo {
    /// path-opener's stable app id, e.g. "obsidian", "vscode".
    pub app_id: String,
    /// Human-friendly name, e.g. "Visual Studio Code".
    pub name: String,
    /// The shell command path-opener would invoke.
    pub command: String,
    /// Whether this opener can open a directory (the per-vault menu).
    pub accepts_directories: bool,
    /// Whether this opener can open a markdown file (the per-finding menu).
    pub accepts_markdown: bool,
    /// Menu position after preference merging (preferred rows first).
    pub sort_order: i32,
}

/// What `open_path` would spawn, without spawning it — path-opener's
/// `CommandPreview`, mirrored onto the generated TS surface so the UI can
/// show the effective command before launching (D-0018 §D5).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OpenPreview {
    /// The program as passed to `Command::new`.
    pub program: String,
    /// The argv list (excludes `program`).
    pub args: Vec<String>,
}
