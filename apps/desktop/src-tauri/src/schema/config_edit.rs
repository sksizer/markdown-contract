use serde::{Deserialize, Serialize};

/// A vault's router config file, read verbatim (D-0019 workstream B). Hand-owned
/// wire DTO. A missing file is `exists: false` (not an error — `init` scaffolds);
/// a broken on-disk file reports its `parse_error` rather than failing the read.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct VaultConfig {
    pub exists: bool,
    /// The file's bytes verbatim (empty when it doesn't exist).
    pub raw: String,
    /// The engine's parse verdict: None when it compiles, else the message.
    pub parse_error: Option<String>,
}

/// The vault's editable contract files (D-0019 workstream B): the router config
/// first, then every `*.contract.yaml` it references — the config-authoring
/// surface the dashboard edits.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ConfigFiles {
    pub files: Vec<ConfigFileEntry>,
}

/// One editable config/contract file, read verbatim with its per-kind verdict.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ConfigFileEntry {
    /// Path relative to the config file's directory (e.g. "markdown-contract.yaml",
    /// "contracts/guide.contract.yaml").
    pub rel_path: String,
    /// "config" for the router, "contract" for a referenced contract file.
    pub kind: String,
    pub exists: bool,
    pub raw: String,
    pub parse_error: Option<String>,
}
