use ontogen_macros::OntologyEntity;
use serde::{Deserialize, Serialize};

/// User preference for one entry of the "open in …" menu (D-0018 §D5).
/// Model only for now — the path-opener integration lands in a later phase.
#[derive(Debug, Clone, Serialize, Deserialize, OntologyEntity)]
#[ontology(entity, table = "opener_preferences")]
pub struct OpenerPreference {
    #[ontology(id)]
    pub id: String,

    /// path-opener's app identifier, e.g. "obsidian", "vscode".
    pub app_id: String,

    /// Whether the app shows in the open-in menu.
    pub enabled: bool,

    /// Menu position, ascending.
    pub sort_order: i32,
}
