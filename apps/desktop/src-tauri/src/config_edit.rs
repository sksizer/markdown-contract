//! Config-file editing (D-0019 workstream B) — read/validate/write a vault's
//! router `markdown-contract.yaml` AND the `*.contract.yaml` files it references,
//! ported from the Bun daemon's `config.ts`. These are the ONLY vault files the
//! daemon may write (C-0010: the documents themselves are never edited here).
//!
//! Validation goes through the engine's own parsers (`load_config` for the
//! router, `load_contract` for a referenced contract — the same compile
//! `load_config_file`/`run_corpus` sit on), so a save can never land a file the
//! engine would reject. Discovery (`list_config_files`) deliberately does NOT
//! use `load_config`: it parses the router with plain `serde_yaml` so it can list
//! referenced files even when some are missing or broken.

use std::collections::HashSet;
use std::path::{Component, Path, PathBuf};

use markdown_contract_engine::{load_config, load_contract};

use crate::schema::{AppError, ConfigFileEntry, ConfigFiles, VaultConfig};

// ── path helpers (lexical — no fs, so non-existent refs still normalize) ──────

/// Lexically normalize `.`/`..` without touching the filesystem (so a not-yet-
/// created contract ref still resolves). Mirrors Node's `path.resolve`
/// normalization on an already-absolute input.
fn normalize_lexical(path: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    for comp in path.components() {
        match comp {
            Component::CurDir => {}
            Component::ParentDir => {
                out.pop();
            }
            other => out.push(other.as_os_str()),
        }
    }
    out
}

/// True when `resolved` sits strictly inside `root` (never the root itself) —
/// the path jail. Component-wise `starts_with`, so `/vault` does not admit
/// `/vault-other`. Mirrors `config.ts::insideVault`.
fn inside_vault(root: &Path, resolved: &Path) -> bool {
    let root = normalize_lexical(root);
    let resolved = normalize_lexical(resolved);
    resolved != root && resolved.starts_with(&root)
}

/// The path of `to` relative to `from` (with `..` as needed) — mirrors Node's
/// `path.relative`, used to label a discovered contract file.
fn rel_to(from: &Path, to: &Path) -> String {
    let from = normalize_lexical(from);
    let to = normalize_lexical(to);
    let from_comps: Vec<Component<'_>> = from.components().collect();
    let to_comps: Vec<Component<'_>> = to.components().collect();
    let common = from_comps
        .iter()
        .zip(&to_comps)
        .take_while(|(a, b)| a == b)
        .count();
    let mut result = PathBuf::new();
    for _ in common..from_comps.len() {
        result.push("..");
    }
    for c in &to_comps[common..] {
        result.push(c.as_os_str());
    }
    result.to_string_lossy().into_owned()
}

/// Does this ref look like a contract FILE path (vs a named/inline ref)?
fn is_yaml_path(s: &str) -> bool {
    let l = s.to_lowercase();
    l.ends_with(".yaml") || l.ends_with(".yml")
}

// ── engine verdicts ──────────────────────────────────────────────────────────

/// The engine's verdict on `raw` as a router config: None when it compiles,
/// else the parser's message. Contract refs resolve relative to the config
/// file's directory, exactly as `load_config_file` resolves them.
fn config_verdict(raw: &str, config_path: &Path) -> Option<String> {
    let base = config_path
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_default();
    let mut resolver = move |target: &str| -> Result<String, String> {
        let tp = Path::new(target);
        let resolved = if tp.is_absolute() {
            tp.to_path_buf()
        } else {
            base.join(tp)
        };
        std::fs::read_to_string(&resolved).map_err(|e| e.to_string())
    };
    match load_config(raw, &mut resolver) {
        Ok(_) => None,
        Err(e) => Some(e.to_string()),
    }
}

/// The engine's verdict on `raw` as a standalone contract document.
fn contract_verdict(raw: &str) -> Option<String> {
    match load_contract(raw) {
        Ok(_) => None,
        Err(e) => Some(e.to_string()),
    }
}

/// Write `raw` verbatim and atomically (tmp + rename), creating parents.
fn write_atomic(path: &Path, raw: &str) -> Result<(), AppError> {
    let io = |e: std::io::Error| AppError::Invalid(format!("write {}: {e}", path.display()));
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(io)?;
    }
    // `${path}.tmp` (append, not with_extension — that would replace `.yaml`).
    let mut tmp = path.as_os_str().to_owned();
    tmp.push(".tmp");
    let tmp = PathBuf::from(tmp);
    std::fs::write(&tmp, raw).map_err(io)?;
    std::fs::rename(&tmp, path).map_err(io)?;
    Ok(())
}

// ── router config read/write ─────────────────────────────────────────────────

/// Read the vault's router config file verbatim. Missing is not an error; a
/// broken file reports its parse verdict rather than failing.
pub fn read_config(config_path: &Path) -> VaultConfig {
    if !config_path.exists() {
        return VaultConfig {
            exists: false,
            raw: String::new(),
            parse_error: None,
        };
    }
    match std::fs::read_to_string(config_path) {
        Ok(raw) => {
            let parse_error = config_verdict(&raw, config_path);
            VaultConfig {
                exists: true,
                raw,
                parse_error,
            }
        }
        Err(e) => VaultConfig {
            exists: true,
            raw: String::new(),
            parse_error: Some(e.to_string()),
        },
    }
}

/// Replace the router config's contents. Validates FIRST (returns
/// `AppError::Invalid` — the 400-ish caller-fixable variant — when `raw` doesn't
/// compile), then writes verbatim and atomically.
pub fn save_config(config_path: &Path, raw: &str) -> Result<(), AppError> {
    if let Some(verdict) = config_verdict(raw, config_path) {
        return Err(AppError::Invalid(verdict));
    }
    write_atomic(config_path, raw)
}

// ── referenced contract files (the config-files pair) ────────────────────────

/// Every contract-file path a parsed router doc references: `contracts:` map
/// string values, plus `rules[].contract` yaml-suffixed refs that are NOT map
/// keys. Best-effort over untyped YAML (tolerates shapes `load_config` rejects).
fn referenced_contracts(doc: &serde_yaml::Value) -> Vec<String> {
    let Some(map) = doc.as_mapping() else {
        return Vec::new();
    };
    let mut refs = Vec::new();
    let mut keys: HashSet<String> = HashSet::new();

    if let Some(contracts) = map
        .get(serde_yaml::Value::from("contracts"))
        .and_then(serde_yaml::Value::as_mapping)
    {
        for (k, v) in contracts {
            if let Some(key) = k.as_str() {
                keys.insert(key.to_string());
            }
            if let Some(val) = v.as_str() {
                refs.push(val.to_string());
            }
        }
    }

    if let Some(rules) = map
        .get(serde_yaml::Value::from("rules"))
        .and_then(serde_yaml::Value::as_sequence)
    {
        for rule in rules {
            let contract = rule
                .as_mapping()
                .and_then(|m| m.get(serde_yaml::Value::from("contract")))
                .and_then(serde_yaml::Value::as_str);
            if let Some(contract) = contract {
                if is_yaml_path(contract) && !keys.contains(contract) {
                    refs.push(contract.to_string());
                }
            }
        }
    }

    refs
}

/// The vault's editable contract files: the router config first (always), then
/// every contract file it references, deduped, each read verbatim with its
/// per-kind verdict. Refs that escape the vault root are silently dropped; a
/// missing/broken router yields just the router entry (never throws).
pub fn list_config_files(vault_path: &Path, config_path: &Path) -> ConfigFiles {
    let router = read_config(config_path);
    let mut files = vec![ConfigFileEntry {
        rel_path: file_name_of(config_path),
        kind: "config".to_string(),
        exists: router.exists,
        raw: router.raw.clone(),
        parse_error: router.parse_error.clone(),
    }];
    if !router.exists {
        return ConfigFiles { files };
    }

    let doc: serde_yaml::Value = match serde_yaml::from_str(&router.raw) {
        Ok(doc) => doc,
        Err(_) => return ConfigFiles { files }, // not YAML — router entry's verdict says so
    };

    let base_dir = config_path.parent().unwrap_or_else(|| Path::new(""));
    let router_abs = normalize_lexical(config_path);
    let mut seen: HashSet<PathBuf> = HashSet::new();
    for reference in referenced_contracts(&doc) {
        let resolved = normalize_lexical(&base_dir.join(&reference));
        if resolved == router_abs || seen.contains(&resolved) {
            continue;
        }
        seen.insert(resolved.clone());
        if !inside_vault(vault_path, &resolved) {
            continue;
        }
        let exists = resolved.exists();
        let raw = if exists {
            std::fs::read_to_string(&resolved).unwrap_or_default()
        } else {
            String::new()
        };
        files.push(ConfigFileEntry {
            rel_path: rel_to(base_dir, &resolved),
            kind: "contract".to_string(),
            exists,
            parse_error: if exists { contract_verdict(&raw) } else { None },
            raw,
        });
    }

    ConfigFiles { files }
}

/// Replace ONE config file by `rel_path` (relative to the config dir). The
/// router validates as a config (`load_config`); anything else validates as a
/// standalone contract (`load_contract`) and MAY be created. Rejects absolute
/// paths, non-yaml suffixes, and refs that escape the vault root.
pub fn save_config_file(
    vault_path: &Path,
    config_path: &Path,
    rel_path: &str,
    raw: &str,
) -> Result<(), AppError> {
    let rp = Path::new(rel_path);
    if rp.is_absolute() {
        return Err(AppError::Invalid(format!("relPath must be relative: {rel_path}")));
    }
    if !is_yaml_path(rel_path) {
        return Err(AppError::Invalid(format!(
            "relPath must end in .yaml or .yml: {rel_path}"
        )));
    }
    let base_dir = config_path.parent().unwrap_or_else(|| Path::new(""));
    let resolved = normalize_lexical(&base_dir.join(rp));
    if resolved == normalize_lexical(config_path) {
        return save_config(config_path, raw); // the router itself
    }
    if !inside_vault(vault_path, &resolved) {
        return Err(AppError::Invalid(format!(
            "relPath escapes the vault root: {rel_path}"
        )));
    }
    if let Some(verdict) = contract_verdict(raw) {
        return Err(AppError::Invalid(verdict));
    }
    write_atomic(&resolved, raw)
}

fn file_name_of(path: &Path) -> String {
    path.file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── the path jail: the security-critical contract ──
    #[test]
    fn inside_vault_admits_children_only() {
        let root = Path::new("/vault");
        assert!(inside_vault(root, Path::new("/vault/contracts/x.yaml")));
        assert!(inside_vault(root, Path::new("/vault/x.yaml")));
        assert!(!inside_vault(root, Path::new("/vault")), "root itself is not inside");
        assert!(!inside_vault(root, Path::new("/etc/passwd")), "sibling tree excluded");
        assert!(
            !inside_vault(root, Path::new("/vault-other/x.yaml")),
            "prefix-string neighbor excluded (component-wise)"
        );
    }

    #[test]
    fn normalize_collapses_dot_dot() {
        assert_eq!(
            normalize_lexical(Path::new("/vault/cfg/../contracts/x.yaml")),
            PathBuf::from("/vault/contracts/x.yaml")
        );
        // A `..`-escape resolves ABOVE the vault, so the jail rejects it.
        let escaped = normalize_lexical(Path::new("/vault/cfg/../../etc/passwd"));
        assert!(!inside_vault(Path::new("/vault"), &escaped));
    }

    #[test]
    fn rel_to_computes_dotdot_paths() {
        // config dir is /vault; a ref up-and-over stays labeled relatively.
        assert_eq!(rel_to(Path::new("/vault"), Path::new("/vault/contracts/x.yaml")), "contracts/x.yaml");
        assert_eq!(rel_to(Path::new("/vault/cfg"), Path::new("/vault/contracts/x.yaml")), "../contracts/x.yaml");
    }

    // ── ref discovery over untyped YAML ──
    #[test]
    fn discovers_contracts_map_and_rule_refs_but_not_named_keys() {
        let doc: serde_yaml::Value = serde_yaml::from_str(
            "contracts:\n  guide: contracts/guide.contract.yaml\nrules:\n  - include: ['**/*.md']\n    contract: contracts/notes.contract.yaml\n  - include: ['x/*.md']\n    contract: guide\n",
        )
        .unwrap();
        let refs = referenced_contracts(&doc);
        assert!(refs.contains(&"contracts/guide.contract.yaml".to_string()), "map value");
        assert!(refs.contains(&"contracts/notes.contract.yaml".to_string()), "direct rule ref");
        assert!(!refs.contains(&"guide".to_string()), "a named ref (map key) is not a file");
    }

    #[test]
    fn a_non_mapping_doc_references_nothing() {
        let doc: serde_yaml::Value = serde_yaml::from_str("- just\n- a list\n").unwrap();
        assert!(referenced_contracts(&doc).is_empty());
    }

    // ── save guards ──
    #[test]
    fn save_config_file_rejects_absolute_and_escaping_paths() {
        let vault = Path::new("/vault");
        let cfg = Path::new("/vault/markdown-contract.yaml");
        assert!(matches!(
            save_config_file(vault, cfg, "/etc/evil.yaml", "x"),
            Err(AppError::Invalid(_))
        ));
        assert!(matches!(
            save_config_file(vault, cfg, "notes.txt", "x"),
            Err(AppError::Invalid(m)) if m.contains("yaml")
        ));
        assert!(matches!(
            save_config_file(vault, cfg, "../../etc/evil.yaml", "x"),
            Err(AppError::Invalid(m)) if m.contains("escapes")
        ));
    }
}
