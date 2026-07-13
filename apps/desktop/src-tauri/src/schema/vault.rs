use ontogen_macros::OntologyEntity;
use serde::{Deserialize, Serialize};

/// A tracked vault — the durable registration record, mirroring the Bun
/// daemon's flat-file registry semantics (apps/web/src/daemon/registry.ts:
/// slug ids, path-deduped) but persisted in SQLite via the generated store.
/// Slugging + path dedupe live in the vault store hooks (src/store/hooks/vault.rs).
#[derive(Debug, Clone, Serialize, Deserialize, OntologyEntity)]
#[ontology(entity, table = "vaults")]
pub struct Vault {
    /// Slug id, e.g. "vault-my-docs". Left empty on create, the before_create
    /// hook derives it from `name`.
    #[ontology(id)]
    pub id: String,

    pub name: String,

    /// Absolute path to the markdown tree's root. Unique across the registry.
    pub path: String,

    /// Path to the `markdown-contract.yaml` config governing this vault.
    pub config_path: String,

    /// Whether the app file-watches this vault (scan-on-change).
    pub watch_enabled: bool,

    /// Optional cron expression for scheduled scans (D-0018 §D5); None = unscheduled.
    #[serde(default)]
    pub schedule: Option<String>,

    /// ISO 8601 timestamps.
    pub created_at: String,
    pub updated_at: String,
}
