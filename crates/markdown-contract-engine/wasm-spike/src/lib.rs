//! SPIKE: a minimal wasm-bindgen surface over the matched engine's declarative
//! validation plane, to answer the packaging questions in `../wasm-spike/FINDINGS.md`.
//!
//! One representative entry point is exposed: validate a markdown document against a
//! declarative YAML contract and return the findings as the JSON interchange string
//! (the exact `Finding[]` shape both engines emit). This mirrors what the TS
//! `packages/core` declarative plane does today, so it is the right parity target for
//! "TS declarative plane becomes a thin wasm wrapper".
//!
//! Marshalling choice: findings cross the boundary as a **JSON string**, not a
//! structured JS object. `Finding`'s serde shape is already the frozen interchange
//! format, so a `serde_json::to_string` here plus a `JSON.parse` on the JS side is
//! (a) zero extra dependency — no `serde-wasm-bindgen` glue — and (b) exactly the
//! bytes the goldens pin. The cost is one JSON encode + one JSON.parse per call; see
//! FINDINGS §4.

use markdown_contract_engine::{load_contract, validate};
use wasm_bindgen::prelude::*;

/// Validate `source` (a markdown document) against `contract_yaml` (a declarative
/// `kind: contract` YAML document), reporting `path` as the finding path.
///
/// Returns the findings as a JSON array string: `[{"id","level","path","pos"?,
/// "message","fix"?}, ...]`. A malformed/unsupported contract is surfaced as a thrown
/// JS `Error` (the `DeclarativeError`'s message), not a finding.
#[wasm_bindgen]
pub fn validate_document(
    source: &str,
    contract_yaml: &str,
    path: &str,
) -> Result<String, JsError> {
    let contract =
        load_contract(contract_yaml).map_err(|e| JsError::new(&e.to_string()))?;
    let findings = validate(source, &contract, path);
    serde_json::to_string(&findings).map_err(|e| JsError::new(&e.to_string()))
}

/// The engine build id + a marker, so a harness can prove which artifact it loaded.
#[wasm_bindgen]
pub fn engine_info() -> String {
    format!(
        "markdown-contract-engine-wasm-spike {} (engine core, native feature OFF)",
        env!("CARGO_PKG_VERSION")
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    // The surface is a plain Rust fn under the wasm-bindgen attribute, so it runs
    // natively too — the same code path the wasm artifact exercises.
    const CONTRACT: &str = "mcVersion: 1\nkind: contract\nbody:\n  sections:\n    - section: Summary\n    - section: Context\n";

    // Contract first: a conforming doc yields an empty findings array.
    #[test]
    fn a_conforming_doc_yields_no_findings() {
        let doc = "## Summary\n\ns\n\n## Context\n\nc\n";
        assert_eq!(validate_document(doc, CONTRACT, "d.md").unwrap(), "[]");
    }

    #[test]
    fn a_missing_section_is_reported_as_the_interchange_json() {
        let out = validate_document("## Summary\n\ns\n", CONTRACT, "d.md").unwrap();
        assert!(out.contains(r#""id":"structure/section-missing""#));
        assert!(out.contains(r#""path":"d.md""#));
    }

    // NOTE: the error path (a malformed contract → thrown JS `Error`) can't be
    // exercised natively — `JsError::new` is a wasm-bindgen import that panics off
    // wasm32 ("cannot call wasm-bindgen imported functions on non-wasm targets").
    // That path is covered on the real wasm artifact by `harness/run-node.cjs`.
}
