use ontogen_macros::OntologyEntity;
use serde::{Deserialize, Serialize};

/// One validation run over a vault — the scan-history layer D-0012 deferred.
/// Created "running" by the scan orchestration (src/scans.rs) and finalized
/// with counts + status when the engine returns.
#[derive(Debug, Clone, Serialize, Deserialize, OntologyEntity)]
#[ontology(entity, table = "scan_runs")]
pub struct ScanRun {
    #[ontology(id)]
    pub id: String,

    #[ontology(relation(belongs_to, target = "Vault"))]
    pub vault_id: String,

    /// ISO 8601; `finished_at` is None while the run is in flight.
    pub started_at: String,
    #[serde(default)]
    pub finished_at: Option<String>,

    /// What started the run: "manual" | "watch" | "schedule" | "startup".
    /// A string (not an enum): ontogen's enum_field support is Option-shaped
    /// and this field is required, so the closed vocabulary is documentation —
    /// the same convention iron-log uses for its closed string sets.
    pub trigger: String,

    /// "running" | "green" | "findings" | "error".
    pub status: String,

    /// Finding counts by level (D-0001 vocabulary: error / warn / report).
    pub error_count: i32,
    pub warn_count: i32,
    pub report_count: i32,

    /// Present only for status "error": what stopped the run.
    #[serde(default)]
    pub error_message: Option<String>,
}
