use serde::{Deserialize, Serialize};

/// The drift check's result (D-0019 workstream B) — the daemon-side mirror of
/// `init --check`: run the committed config over the tree; any error-level
/// finding means the corpus drifted from the contract. Hand-owned wire DTO,
/// primitives only (no entity fields → no ontogen-ts long-tail duplication).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DriftResult {
    /// True when any error-level finding was produced.
    pub drifted: bool,
    /// One entry per error finding (folded via the rule-id heuristic).
    pub entries: Vec<DriftEntry>,
    /// Warn-level findings, carried as advisory `"{path}: {message}"` strings.
    pub warnings: Vec<String>,
}

/// One drift entry — an error finding recast in drift vocabulary.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DriftEntry {
    /// The DriftKind vocabulary: "section-added" | "section-removed" |
    /// "field-added" | "field-removed" | "field-changed" | "order-changed".
    pub kind: String,
    /// The offending location, `"{path}"` or `"{path}:{line}"`.
    pub target: String,
    /// `"{finding_id} — {message}"`.
    pub detail: String,
}
