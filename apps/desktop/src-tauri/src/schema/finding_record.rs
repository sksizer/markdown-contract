use ontogen_macros::OntologyEntity;
use serde::{Deserialize, Serialize};

/// One finding of one scan run — the persisted projection of the engine's
/// finding shape (D-0001: namespaced id, level, 1-based position).
#[derive(Debug, Clone, Serialize, Deserialize, OntologyEntity)]
#[ontology(entity, table = "finding_records")]
pub struct FindingRecord {
    #[ontology(id)]
    pub id: String,

    #[ontology(relation(belongs_to, target = "ScanRun"))]
    pub scan_run_id: String,

    /// The engine's namespaced finding id, e.g. "structure/missing-section".
    pub finding_id: String,

    /// "error" | "warn" | "report" (D-0001 severity vocabulary).
    pub level: String,

    /// Vault-relative path of the offending file.
    pub file_path: String,

    /// 1-based position, when the finding is pinned to one.
    #[serde(default)]
    pub line: Option<i32>,
    #[serde(default)]
    pub col: Option<i32>,

    pub message: String,
}
