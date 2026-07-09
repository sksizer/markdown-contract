//! `load_contract` — compile a declarative YAML contract document into a runtime
//! [`Contract`], the same object the programmatic builders produce (D-0008). A
//! YAML-authored contract is therefore indistinguishable downstream: same findings,
//! same ids, same positions.
//!
//! Compiles both planes: the **frontmatter** schema (schema-DSL → [`Schema`]) and the
//! **body grammar** (sections / leaves → the combinator IR), plus the body root's
//! `requires:` / `forbids:` as one document-scoped text rule. Cross-cutting custom
//! rules and the `$ref` code escape hatch are deferred and not part of v1.

use serde_yaml::Value;

use super::body::compile_body;
use super::errors::DeclarativeError;
use super::parse::{DeclarativeKind, parse_declarative_doc};
use super::schema::compile_object_schema;
use super::text::compile_body_text_rule;
use crate::contract::{Contract, FrontmatterSpec};
use crate::schema::Schema;

/// Compile a declarative YAML contract (text) into a runtime [`Contract`].
pub fn load_contract(yaml_text: &str) -> Result<Contract, DeclarativeError> {
    let doc = parse_declarative_doc(yaml_text)?;
    if doc.kind != DeclarativeKind::Contract {
        return Err(DeclarativeError::InvalidDocument(
            "expected a contract document (kind: contract), got kind: config".into(),
        ));
    }
    compile_contract_object(&doc.raw)
}

/// Build a [`Contract`] from a raw `{ frontmatter?, body? }` mapping (no envelope
/// needed — used by inline config contracts).
pub fn compile_contract_object(raw: &serde_yaml::Mapping) -> Result<Contract, DeclarativeError> {
    let mut contract = Contract::new();

    if let Some(fm) = raw.get(Value::String("frontmatter".into())) {
        contract.frontmatter = Some(FrontmatterSpec {
            schema: compile_frontmatter(fm)?,
        });
    }

    if let Some(body) = raw.get(Value::String("body".into())) {
        contract.body = Some(compile_body(body, "body")?);
        // `requires:` / `forbids:` on the body root (sibling of `sections:`) → one
        // document-scoped text rule attached at the contract level (D-0011 § Match
        // scope — body root). `compile_body` has already verified `body` is a mapping.
        if let Value::Mapping(body_map) = body
            && let Some(doc_rule) = compile_body_text_rule(body_map, "body")?
        {
            contract.rules.push(doc_rule);
        }
    }

    Ok(contract)
}

fn compile_frontmatter(fm: &Value) -> Result<Schema, DeclarativeError> {
    let Value::Mapping(node) = fm else {
        return Err(DeclarativeError::InvalidSchema(
            "frontmatter must be a mapping with an optional 'strict' flag and a 'fields' map"
                .into(),
        ));
    };
    let strict = node
        .get(Value::String("strict".into()))
        .and_then(Value::as_bool)
        == Some(true);
    compile_object_schema(
        node.get(Value::String("fields".into())),
        strict,
        "frontmatter",
    )
}

/// Read a `*.contract.yaml` file and compile it into a runtime [`Contract`] (fs — the
/// thin native layer).
#[cfg(feature = "native")]
pub fn load_contract_file(path: &std::path::Path) -> Result<Contract, DeclarativeError> {
    let text = std::fs::read_to_string(path).map_err(|e| DeclarativeError::ContractRefRead {
        target: path.display().to_string(),
        reason: e.to_string(),
    })?;
    load_contract(&text)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::finding::FindingLevel;
    use crate::validate::validate;

    fn brief(findings: &[crate::finding::Finding]) -> Vec<(&str, FindingLevel, Option<u32>)> {
        findings
            .iter()
            .map(|f| (f.id.as_str(), f.level, f.pos.map(|p| p.line)))
            .collect()
    }

    // Contract first — the v08 fixture shape: one YAML contract, both planes, one pass.
    #[test]
    fn a_yaml_contract_validates_both_planes() {
        let contract = load_contract(
            "mcVersion: 1\nkind: contract\nfrontmatter:\n  strict: true\n  fields:\n    id:\n      type: string\n      pattern: '^D-[0-9A-Z]{4}$'\n    status:\n      enum: [open/proposed, open/accepted]\n\nbody:\n  order: none\n  allowUnknown: true\n  sections:\n    - section: Summary\n    - section: Context\n",
        )
        .unwrap();
        let pass = "---\nid: D-0099\nstatus: open/proposed\n---\n\n## Summary\n\nA summary.\n\n## Context\n\nWhy.\n";
        assert_eq!(validate(pass, &contract, "d.md"), vec![]);
        let fail = "---\nid: D-0099\nstatus: open/draft\n---\n\n## Summary\n\nA summary.\n";
        assert_eq!(
            brief(&validate(fail, &contract, "d.md")),
            vec![
                ("frontmatter/enum", FindingLevel::Error, Some(3)),
                ("structure/section-missing", FindingLevel::Error, Some(6)),
            ]
        );
    }

    #[test]
    fn body_root_text_keys_attach_one_doc_rule() {
        let contract = load_contract(
            "mcVersion: 1\nkind: contract\nbody:\n  sections:\n    - section: Summary\n  forbids:\n    - pattern: '}scripts/'\n      normalize: false\n",
        )
        .unwrap();
        assert_eq!(contract.rules.len(), 1);
        let fail = "## Summary\n\nreaches }scripts/x.sh directly\n";
        assert_eq!(
            brief(&validate(fail, &contract, "d.md")),
            vec![("text/forbids/doc/o9pijh", FindingLevel::Error, Some(3))]
        );
    }

    #[test]
    fn a_config_document_is_not_a_contract() {
        let Err(e) = load_contract("mcVersion: 1\nkind: config\nrules: []\n") else {
            panic!("expected a DeclarativeError")
        };
        assert!(e.to_string().contains("expected a contract document"));
    }
}
