//! Test-only mini-vault fixture shared by the engine tests (native scan,
//! router decisions, scans.rs end-to-end): a temp directory holding a router
//! config, a referenced contract, one passing and one failing doc — cribbed
//! from `packages/core/tests/fixtures/validation/01-single-required-section`.

use std::path::{Path, PathBuf};

/// The router config: one rule over `**/*.md` (minus `drafts/**`) bound to the
/// `note` contract by name through the `contracts:` map.
pub const MINI_CONFIG_YAML: &str = "mcVersion: 1
kind: config
contracts:
  note: ./note.contract.yaml
rules:
  - include: ['**/*.md']
    exclude: ['drafts/**']
    contract: note
";

/// The referenced contract: one required `Overview` section.
pub const MINI_CONTRACT_YAML: &str = "mcVersion: 1
kind: contract
body:
  order: none
  allowUnknown: true
  sections:
    - section: Overview
";

/// A doc satisfying the contract.
pub const MINI_PASS_MD: &str = "## Overview\n\nThis note has the required section.\n";

/// A doc missing the required section → `structure/section-missing` at 1:1.
pub const MINI_FAIL_MD: &str =
    "## Summary\n\nThis document is missing the required Overview section.\n";

/// A scratch vault on disk, removed on drop.
pub struct TempVault {
    root: PathBuf,
    config: PathBuf,
}

impl TempVault {
    /// An empty scratch directory (no config yet), uniquely named per test.
    pub fn empty(name: &str) -> Self {
        let root = std::env::temp_dir().join(format!("mc-desktop-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&root);
        std::fs::create_dir_all(&root).unwrap();
        let config = root.join("markdown-contract.yaml");
        Self { root, config }
    }

    /// The mini-vault: router config + `note` contract + `good.md` (passes) +
    /// `docs/guide.md` (fails with one `structure/section-missing`).
    pub fn mini(name: &str) -> Self {
        let vault = Self::empty(name);
        std::fs::write(&vault.config, MINI_CONFIG_YAML).unwrap();
        std::fs::write(vault.root.join("note.contract.yaml"), MINI_CONTRACT_YAML).unwrap();
        std::fs::write(vault.root.join("good.md"), MINI_PASS_MD).unwrap();
        std::fs::create_dir_all(vault.root.join("docs")).unwrap();
        std::fs::write(vault.root.join("docs/guide.md"), MINI_FAIL_MD).unwrap();
        vault
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    /// The vault root as the `&str` the ScanEngine trait takes.
    pub fn path(&self) -> &str {
        self.root.to_str().unwrap()
    }

    /// The default `<vault>/markdown-contract.yaml` config path (registry
    /// semantics) — the file may or may not exist depending on the fixture.
    pub fn config_path(&self) -> &str {
        self.config.to_str().unwrap()
    }
}

impl Drop for TempVault {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.root);
    }
}

/// Overwrite the vault's router config with a rule referencing a code-authored
/// `.ts` contract — the deferred code escape (`DeclarativeError::CodeContractRef`).
pub fn write_code_ref_config(vault: &TempVault) {
    std::fs::write(
        vault.config_path(),
        "mcVersion: 1\nkind: config\nrules:\n  - include: ['**/*.md']\n    contract: ./note.contract.ts\n",
    )
    .unwrap();
}
