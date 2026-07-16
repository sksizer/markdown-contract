//! `load_contract` — compile a declarative YAML contract document into a runtime
//! [`Contract`], the same object the programmatic builders produce (D-0008). A
//! YAML-authored contract is therefore indistinguishable downstream: same findings,
//! same ids, same positions.
//!
//! The envelope's `mcVersion` dispatches here (D-0020 § Envelope): `1` compiles through
//! the v1 compilers unchanged; `2` compiles through the v2 compilers
//! ([`super::schema_v2`] / [`super::body_v2`]) — same planes, the JSON-Schema-idiom
//! spelling, plus the contract-root `description:` carried for `Finding.hint`.
//!
//! Compiles both planes: the **frontmatter** schema (schema-DSL → [`Schema`]) and the
//! **body grammar** (sections / leaves → the combinator IR), plus the body root's
//! `requires:` / `forbids:` as one document-scoped text rule. Cross-cutting custom
//! rules and the `$ref` code escape hatch are deferred and not part of v1 or v2.

use serde_yaml::Value;

use super::body::compile_body;
use super::body_v2::compile_body_v2;
use super::errors::DeclarativeError;
use super::parse::{DeclarativeKind, parse_declarative_doc};
use super::schema::compile_object_schema;
use super::schema_v2::compile_frontmatter_v2;
use super::text::compile_body_text_rule;
use crate::contract::{Contract, DocRule, FrontmatterSpec};
use crate::finding::Finding;
use crate::registry::Ctx;
use crate::schema::Schema;
use crate::tree::DocTree;

/// Compile a declarative YAML contract (text) into a runtime [`Contract`].
pub fn load_contract(yaml_text: &str) -> Result<Contract, DeclarativeError> {
    let doc = parse_declarative_doc(yaml_text)?;
    if doc.kind != DeclarativeKind::Contract {
        return Err(DeclarativeError::InvalidDocument(
            "expected a contract document (kind: contract), got kind: config".into(),
        ));
    }
    compile_contract_object(&doc.raw, doc.mc_version)
}

/// Build a [`Contract`] from a raw `{ frontmatter?, body? }` mapping (no envelope
/// needed — used by inline config contracts, which compile with the config document's
/// `mc_version`).
pub fn compile_contract_object(
    raw: &serde_yaml::Mapping,
    mc_version: i64,
) -> Result<Contract, DeclarativeError> {
    match mc_version {
        1 => compile_contract_object_v1(raw),
        2 => compile_contract_object_v2(raw),
        other => Err(DeclarativeError::UnsupportedVersion(other.to_string())),
    }
}

/// The v1 path — UNCHANGED from D-0008.
fn compile_contract_object_v1(raw: &serde_yaml::Mapping) -> Result<Contract, DeclarativeError> {
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

/// The v2 path (D-0020): the frontmatter block is itself a JSON-Schema-subset node, the
/// body grammar uses the v2 spelling, and `description:` on the contract root / body
/// root is carried for `Finding.hint`.
fn compile_contract_object_v2(raw: &serde_yaml::Mapping) -> Result<Contract, DeclarativeError> {
    let mut contract = Contract::new();

    if let Some(d) = raw.get(Value::String("description".into())) {
        let Some(d) = d.as_str() else {
            return Err(DeclarativeError::InvalidDocument(
                "description must be a string".into(),
            ));
        };
        contract.description = Some(d.to_string());
    }

    if let Some(fm) = raw.get(Value::String("frontmatter".into())) {
        contract.frontmatter = Some(FrontmatterSpec {
            schema: compile_frontmatter_v2(fm)?,
        });
    }

    if let Some(body) = raw.get(Value::String("body".into())) {
        let seq = compile_body_v2(body, "body")?;
        let body_hint = seq.description.clone();
        contract.body = Some(seq);
        // The body root's `requires:` / `forbids:` → one document-scoped text rule,
        // exactly as v1; its findings inherit the body root's `description` as their
        // hint (the bound scope — D-0020 § description and Finding.hint).
        if let Value::Mapping(body_map) = body
            && let Some(doc_rule) = compile_body_text_rule(body_map, "body")?
        {
            contract.rules.push(match body_hint {
                Some(hint) => Box::new(HintedDocRule {
                    inner: doc_rule,
                    hint,
                }),
                None => doc_rule,
            });
        }
    }

    Ok(contract)
}

/// A doc-rule decorator stamping the bound scope's `description` onto findings that
/// carry no nearer hint — the body root's effective hint for document-scoped text
/// constraints (the contract-root fallback stays `validate`'s).
struct HintedDocRule {
    inner: Box<dyn DocRule>,
    hint: String,
}

impl DocRule for HintedDocRule {
    fn id(&self) -> &str {
        self.inner.id()
    }
    fn run(&self, tree: &DocTree, ctx: &Ctx) -> Vec<Finding> {
        let mut findings = self.inner.run(tree, ctx);
        for finding in &mut findings {
            if finding.hint.is_none() {
                finding.hint = Some(self.hint.clone());
            }
        }
        findings
    }
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

    // ── The v2 envelope dispatch (D-0020) ────────────────────────────────────────────

    // Contract first: one YAML document per version, semantically identical — v1 keeps
    // loading unchanged, v2 loads through the new compilers, v3 is rejected.
    #[test]
    fn envelope_dispatches_v1_and_v2_and_rejects_v3() {
        let v1 = load_contract(
            "mcVersion: 1\nkind: contract\nfrontmatter:\n  strict: true\n  fields:\n    id: { type: string }\nbody:\n  allowUnknown: false\n  sections:\n    - section: Summary\n",
        )
        .unwrap();
        let v2 = load_contract(
            "mcVersion: 2\nkind: contract\nfrontmatter:\n  type: object\n  additionalProperties: false\n  properties:\n    id: { type: string }\n  required: [id]\nbody:\n  additionalSections: false\n  sections:\n    - section: Summary\n",
        )
        .unwrap();
        let doc = "---\nid: D-0001\n---\n\n## Summary\n\nfine\n";
        assert_eq!(validate(doc, &v1, "d.md"), vec![]);
        assert_eq!(validate(doc, &v2, "d.md"), vec![]);
        let fail = "---\nid: D-0001\nzz: 1\n---\n\n## Wrong\n\nprose\n";
        assert_eq!(
            brief(&validate(fail, &v1, "d.md")),
            brief(&validate(fail, &v2, "d.md"))
        );

        let Err(e) = load_contract("mcVersion: 3\nkind: contract\nbody:\n  sections: []\n") else {
            panic!("expected a DeclarativeError")
        };
        assert_eq!(
            e.to_string(),
            "unsupported mcVersion: 3 (this build supports 1, 2)"
        );
    }

    #[test]
    fn a_v1_spelling_in_a_v2_document_is_a_migration_error() {
        let Err(e) = load_contract(
            "mcVersion: 2\nkind: contract\nbody:\n  sections:\n    - section: Entry\n      repeatable: true\n",
        ) else {
            panic!("expected a DeclarativeError")
        };
        assert!(e.to_string().contains("'repeatable' is the v1 spelling"));
    }

    // ── description → Finding.hint (D-0020) ─────────────────────────────────────────

    fn hints(findings: &[crate::finding::Finding]) -> Vec<(&str, Option<&str>)> {
        findings
            .iter()
            .map(|f| (f.id.as_str(), f.hint.as_deref()))
            .collect()
    }

    // Nearest enclosing description wins: leaf beats section beats body root beats
    // contract root; scopes with no nearer description fall outward.
    #[test]
    fn hint_resolves_to_the_nearest_enclosing_description() {
        let contract = load_contract(
            "mcVersion: 2\nkind: contract\ndescription: the decision record\nfrontmatter:\n  type: object\n  properties:\n    id:\n      type: string\n      description: the D-number\n    status: { type: string }\n  required: [id, status]\nbody:\n  description: the standard shape\n  additionalSections: false\n  sections:\n    - section: Summary\n      description: one paragraph, outcome first\n      content:\n        maxWords: 5\n      requires:\n        - pattern: outcome\n    - section: Files\n      content:\n        table:\n          columns: [Location]\n          minRows: 1\n          description: one row per touched file\n",
        )
        .unwrap();
        let doc = "---\nid: 7\n---\n\n## Summary\n\nSix words are in this paragraph.\n\n## Files\n\n| Location |\n| - |\n\n## Extras\n\nx\n";
        let out = validate(doc, &contract, "d.md");
        assert_eq!(
            hints(&out),
            vec![
                // a missing field with no description falls back to the contract root
                ("frontmatter/required", Some("the decision record")),
                // the failing field's own stored description
                ("frontmatter/type", Some("the D-number")),
                // text findings: the bound section's effective hint
                (
                    "text/requires/summary/1tc7itx",
                    Some("one paragraph, outcome first")
                ),
                // content findings: the section's description (maxWords carries none)
                ("content/max-words", Some("one paragraph, outcome first")),
                // the leaf's own description beats the section's absence
                ("content/table/min-rows", Some("one row per touched file")),
                // an unknown section: the body root's description
                ("structure/section-order", Some("the standard shape")),
            ]
        );
    }

    #[test]
    fn hint_is_absent_when_no_description_is_in_scope() {
        // A description-free v2 contract produces findings with no hint slot at all —
        // byte-identical serialization to a v1 contract's.
        let v2 = load_contract(
            "mcVersion: 2\nkind: contract\nbody:\n  sections:\n    - section: Summary\n",
        )
        .unwrap();
        let v1 = load_contract(
            "mcVersion: 1\nkind: contract\nbody:\n  sections:\n    - section: Summary\n",
        )
        .unwrap();
        let out_v2 = validate("## Wrong\n\nprose\n", &v2, "d.md");
        let out_v1 = validate("## Wrong\n\nprose\n", &v1, "d.md");
        assert_eq!(out_v2, out_v1);
        assert!(out_v2.iter().all(|f| f.hint.is_none()));
        assert!(
            serde_json::to_string(&out_v2)
                .unwrap()
                .eq(&serde_json::to_string(&out_v1).unwrap())
        );
    }

    #[test]
    fn body_root_text_rule_carries_the_body_description() {
        let contract = load_contract(
            "mcVersion: 2\nkind: contract\nbody:\n  description: no script paths\n  sections:\n    - section: Summary\n  forbids:\n    - pattern: '}scripts/'\n      normalize: false\n",
        )
        .unwrap();
        let out = validate("## Summary\n\nreaches }scripts/x.sh\n", &contract, "d.md");
        assert_eq!(
            hints(&out),
            vec![("text/forbids/doc/o9pijh", Some("no script paths"))]
        );
    }
}
