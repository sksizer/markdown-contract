//! The body-grammar + content-leaf compiler — the v1 YAML body DSL → the engine
//! combinators (D-0008 § Body grammar / § Content leaves), mirroring the TS
//! `declarative/body.ts`.
//!
//! A `body:` mapping becomes a [`SectionSeq`]; each node becomes a section / oneOf /
//! gap spec (wrapped in `optional` when flagged), with nested `children` recursing and
//! a `content` leaf (or a named-leaf record) compiled to table / list / code /
//! maxWords. Table `cells` and list `everyItem` schemas reuse the closed-vocabulary
//! compiler; `requires:` / `forbids:` on a section node become node-local text rules.
//! The build-time grammar guards the TS combinators enforce (camelCase key collisions,
//! repeat bounds) run here as [`DeclarativeError`]s.

use serde_yaml::Value;

use super::errors::DeclarativeError;
use super::schema::compile_schema;
use super::text::{compile_section_text_rules, has_text_keys};
use crate::camel::to_camel_key;
use crate::contract::{
    CodeConfig, EveryItem, ExtraColumns, GapSpec, LeafSpec, LevelOpts, ListConfig, OneOfSpec,
    Order, SectionContent, SectionOpts, SectionSeq, SectionSpec, Spec, TableConfig,
};

const LEAF_KEYS: &[&str] = &["table", "list", "code", "maxWords"];

fn get<'a>(map: &'a serde_yaml::Mapping, key: &str) -> Option<&'a Value> {
    map.get(Value::String(key.into()))
}

fn err(msg: String) -> DeclarativeError {
    DeclarativeError::InvalidBody(msg)
}

fn num(map: &serde_yaml::Mapping, key: &str) -> Option<f64> {
    get(map, key).and_then(Value::as_f64)
}

/// Compile a `body:` mapping into a body grammar.
pub fn compile_body(node: &Value, path: &str) -> Result<SectionSeq, DeclarativeError> {
    compile_level(node, path)
}

fn compile_level(node: &Value, path: &str) -> Result<SectionSeq, DeclarativeError> {
    let Value::Mapping(map) = node else {
        return Err(err(format!(
            "{path}: must be a mapping with a 'sections' list"
        )));
    };
    let mut opts = LevelOpts::default();
    if let Some(order) = get(map, "order") {
        opts.order = match order.as_str() {
            Some("none") => Order::None,
            Some("recognized-relative") => Order::RecognizedRelative,
            Some("strict") => Order::Strict,
            _ => {
                return Err(err(format!(
                    "{path}.order must be none | recognized-relative | strict (got {})",
                    serde_json::to_string(&crate::frontmatter::yaml_to_json(order.clone()))
                        .unwrap_or_else(|_| "?".into())
                )));
            }
        };
    }
    if let Some(v) = get(map, "allowUnknown") {
        opts.allow_unknown = v
            .as_bool()
            .ok_or_else(|| err(format!("{path}.allowUnknown must be a boolean")))?;
    }
    let Some(Value::Sequence(nodes)) = get(map, "sections") else {
        return Err(err(format!("{path}.sections must be a list of nodes")));
    };
    let specs: Vec<Spec> = nodes
        .iter()
        .enumerate()
        .map(|(i, n)| compile_node(n, &format!("{path}.sections[{i}]")))
        .collect::<Result<_, _>>()?;
    assert_no_key_collision(&specs, path)?;
    Ok(SectionSeq { opts, specs })
}

/// The build-time key-collision guard the TS `sections()` runs: among declared
/// section/oneOf primary names at one level, two distinct names collapsing to one
/// camelCase key are rejected (alias spellings within one slot are one logical slot).
fn assert_no_key_collision(specs: &[Spec], path: &str) -> Result<(), DeclarativeError> {
    let mut key_to_name: Vec<(String, String)> = Vec::new();
    for spec in specs {
        let inner = unwrap_inner(spec);
        let primary = match inner {
            Spec::Section(s) => s.names.first(),
            Spec::OneOf(o) => o.names.first(),
            _ => None,
        };
        let Some(primary) = primary else { continue };
        let key = to_camel_key(primary);
        if key.is_empty() {
            continue;
        }
        if let Some((_, prior)) = key_to_name.iter().find(|(k, _)| *k == key) {
            if prior != primary {
                return Err(err(format!(
                    "{path}: contract/key-collision — section names ‘{prior}’ and ‘{primary}’ both generate the camelCase key ‘{key}’; generated OOM keys must be unique"
                )));
            }
        } else {
            key_to_name.push((key, primary.clone()));
        }
    }
    Ok(())
}

fn unwrap_inner(spec: &Spec) -> &Spec {
    match spec {
        Spec::Optional(inner) => unwrap_inner(inner),
        other => other,
    }
}

fn compile_node(node: &Value, path: &str) -> Result<Spec, DeclarativeError> {
    let Value::Mapping(map) = node else {
        return Err(err(format!(
            "{path}: a body node must be a mapping (section / oneOf / gap)"
        )));
    };
    let is_optional = get(map, "optional").and_then(Value::as_bool) == Some(true);
    let spec = if get(map, "oneOf").is_some() {
        compile_one_of(map, path)?
    } else if get(map, "gap").is_some() {
        compile_gap(map)
    } else if get(map, "section").is_some() {
        compile_section_node(map, path)?
    } else {
        return Err(err(format!(
            "{path}: a body node needs one of section / oneOf / gap"
        )));
    };
    Ok(if is_optional {
        Spec::Optional(Box::new(spec))
    } else {
        spec
    })
}

/// Compile a `oneOf: [...]` node.
fn compile_one_of(map: &serde_yaml::Mapping, path: &str) -> Result<Spec, DeclarativeError> {
    let names: Option<Vec<String>> = get(map, "oneOf")
        .and_then(Value::as_sequence)
        .map(|seq| seq.iter().map(|v| v.as_str().map(str::to_string)).collect())
        .unwrap_or(None);
    let names = match names {
        Some(n) if !n.is_empty() => n,
        _ => {
            return Err(err(format!(
                "{path}.oneOf must be a non-empty list of section names"
            )));
        }
    };
    let opts = section_opts(map, path)?;
    assert_repeat_bounds(
        opts.as_ref(),
        names.first().map(String::as_str).unwrap_or(""),
        path,
    )?;
    Ok(Spec::OneOf(OneOfSpec { names, opts }))
}

/// Compile a `gap: { min?, max? }` node.
fn compile_gap(map: &serde_yaml::Mapping) -> Spec {
    let (min, max) = match get(map, "gap") {
        Some(Value::Mapping(g)) => (
            g.get(Value::String("min".into())).and_then(Value::as_u64),
            g.get(Value::String("max".into())).and_then(Value::as_u64),
        ),
        _ => (None, None),
    };
    Spec::Gap(GapSpec {
        min: min.map(|n| n as usize),
        max: max.map(|n| n as usize),
    })
}

/// Compile a `section: <name>` node (with optional `aliases`).
fn compile_section_node(map: &serde_yaml::Mapping, path: &str) -> Result<Spec, DeclarativeError> {
    let Some(name) = get(map, "section").and_then(Value::as_str) else {
        return Err(err(format!(
            "{path}.section must be a heading name (string)"
        )));
    };
    let mut names = vec![name.to_string()];
    if let Some(aliases) = get(map, "aliases") {
        let list: Option<Vec<String>> = aliases
            .as_sequence()
            .map(|seq| seq.iter().map(|v| v.as_str().map(str::to_string)).collect())
            .unwrap_or(None);
        match list {
            Some(mut l) => names.append(&mut l),
            None => {
                return Err(err(format!(
                    "{path}.aliases must be a list of alias spellings"
                )));
            }
        }
    }
    let opts = section_opts(map, path)?;
    assert_repeat_bounds(opts.as_ref(), name, path)?;
    Ok(Spec::Section(SectionSpec { names, opts }))
}

/// The build-time repeatable-bounds guard the TS `section()` / `oneOf()` run.
fn assert_repeat_bounds(
    opts: Option<&SectionOpts>,
    label: &str,
    path: &str,
) -> Result<(), DeclarativeError> {
    let Some(opts) = opts else { return Ok(()) };
    if !opts.repeatable {
        if opts.min.is_some() || opts.max.is_some() {
            return Err(err(format!(
                "{path}: contract/repeat-bounds — section ‘{label}’ declares min/max without ‘repeatable: true’; occurrence bounds apply only to a repeatable slot"
            )));
        }
        return Ok(());
    }
    if let (Some(min), Some(max)) = (opts.min, opts.max)
        && min > max
    {
        return Err(err(format!(
            "{path}: contract/repeat-bounds — section ‘{label}’ has min {min} greater than max {max}"
        )));
    }
    Ok(())
}

fn section_opts(
    map: &serde_yaml::Mapping,
    path: &str,
) -> Result<Option<SectionOpts>, DeclarativeError> {
    let mut opts = SectionOpts::default();
    let mut any = false;
    if let Some(anchor) = get(map, "anchor") {
        opts.anchor = Some(scalar_string(anchor));
        any = true;
    }
    if let Some(v) = get(map, "repeatable") {
        opts.repeatable = v
            .as_bool()
            .ok_or_else(|| err(format!("{path}.repeatable must be a boolean")))?;
        any = true;
    }
    if let Some(v) = get(map, "min") {
        opts.min = Some(occurrence_bound(v, "min", path)?);
        any = true;
    }
    if let Some(v) = get(map, "max") {
        opts.max = Some(occurrence_bound(v, "max", path)?);
        any = true;
    }
    if let Some(content) = get(map, "content") {
        opts.content = Some(compile_content(content, &format!("{path}.content"))?);
        any = true;
    }
    if let Some(children) = get(map, "children") {
        opts.children = Some(compile_level(children, &format!("{path}.children"))?);
        any = true;
    }
    // `requires:` / `forbids:` on a section node → node-local rules over that section's
    // subtree (compiled and consistency-checked even when a list is empty).
    if has_text_keys(map) {
        let label = get(map, "section")
            .and_then(Value::as_str)
            .unwrap_or(path)
            .to_string();
        let rules = compile_section_text_rules(map, path, &label)?;
        if !rules.is_empty() {
            opts.rules = rules;
            any = true;
        }
    }
    Ok(any.then_some(opts))
}

/// A repeatable-slot occurrence bound: a non-negative integer (the TS `section()`'s
/// `contract/repeat-bounds` integer guard, folded into the DSL type check).
fn occurrence_bound(v: &Value, key: &str, path: &str) -> Result<usize, DeclarativeError> {
    let n = v
        .as_f64()
        .ok_or_else(|| err(format!("{path}.{key} must be a number")))?;
    if n.fract() != 0.0 || n < 0.0 {
        return Err(err(format!(
            "{path}: contract/repeat-bounds — {key} must be a non-negative integer (got {n})"
        )));
    }
    Ok(n as usize)
}

/// A YAML scalar as its string spelling (the TS `String(node.anchor)`).
fn scalar_string(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => n.to_string(),
        Value::Null => "null".into(),
        other => serde_yaml::to_string(other)
            .map(|s| s.trim_end().to_string())
            .unwrap_or_default(),
    }
}

/// A single-key mapping whose key is a leaf keyword — a leaf, not a named-leaf record.
fn is_leaf_map(map: &serde_yaml::Mapping) -> bool {
    map.len() == 1
        && map
            .keys()
            .next()
            .and_then(Value::as_str)
            .is_some_and(|k| LEAF_KEYS.contains(&k))
}

fn compile_content(content: &Value, path: &str) -> Result<SectionContent, DeclarativeError> {
    let Value::Mapping(map) = content else {
        return Err(err(format!(
            "{path}: must be a leaf (table/list/code/maxWords) or a named-leaf map"
        )));
    };
    if is_leaf_map(map) {
        return Ok(SectionContent::Single(compile_leaf(map, path)?));
    }
    // A record of `^anchor`-named leaves.
    let mut entries = Vec::with_capacity(map.len());
    for (name, leaf) in map {
        let Some(name) = name.as_str() else {
            return Err(err(format!("{path}: named-leaf keys must be strings")));
        };
        let Value::Mapping(leaf_map) = leaf else {
            return Err(err(format!(
                "{path}.{name}: a leaf must be a single-key mapping (table | list | code | maxWords)"
            )));
        };
        entries.push((
            name.to_string(),
            compile_leaf(leaf_map, &format!("{path}.{name}"))?,
        ));
    }
    Ok(SectionContent::Anchored(entries))
}

fn compile_leaf(map: &serde_yaml::Mapping, path: &str) -> Result<LeafSpec, DeclarativeError> {
    if map.len() != 1 {
        return Err(err(format!(
            "{path}: a leaf must be a single-key mapping (table | list | code | maxWords)"
        )));
    }
    let (key, cfg) = map.iter().next().expect("len == 1");
    match key.as_str() {
        Some("maxWords") => {
            let n = cfg
                .as_f64()
                .ok_or_else(|| err(format!("{path}.maxWords must be a number")))?;
            Ok(LeafSpec::max_words(n))
        }
        Some("code") => {
            let lang = cfg
                .as_mapping()
                .and_then(|m| get(m, "lang"))
                .and_then(Value::as_str)
                .map(str::to_string);
            Ok(LeafSpec::code_with(CodeConfig { lang }))
        }
        Some("table") => Ok(LeafSpec::table_with(table_config(cfg, path)?)),
        Some("list") => Ok(LeafSpec::list_with(list_config(cfg, path)?)),
        other => Err(err(format!(
            "{path}: unknown leaf '{}'",
            other.unwrap_or("?")
        ))),
    }
}

fn table_config(cfg: &Value, path: &str) -> Result<TableConfig, DeclarativeError> {
    let Value::Mapping(map) = cfg else {
        return Err(err(format!("{path}.table must be a mapping")));
    };
    let columns: Option<Vec<String>> = get(map, "columns")
        .and_then(Value::as_sequence)
        .map(|seq| seq.iter().map(|v| v.as_str().map(str::to_string)).collect())
        .unwrap_or(None);
    let Some(columns) = columns else {
        return Err(err(format!(
            "{path}.table.columns must be a list of column names"
        )));
    };
    let mut out = TableConfig {
        columns,
        ..Default::default()
    };
    if let Some(anchor) = get(map, "anchor") {
        out.anchor = Some(scalar_string(anchor));
    }
    out.min_rows = num(map, "minRows");
    out.extra_columns = match get(map, "extraColumns").and_then(Value::as_str) {
        Some("error") => ExtraColumns::Error,
        _ => ExtraColumns::Ignore,
    };
    if let Some(cells) = get(map, "cells") {
        let Value::Mapping(cells) = cells else {
            return Err(err(format!(
                "{path}.table.cells must be a mapping of column → schema"
            )));
        };
        for (col, schema) in cells {
            let Some(col) = col.as_str() else {
                return Err(err(format!("{path}.table.cells keys must be column names")));
            };
            out.cells.push((
                col.to_string(),
                compile_schema(schema, &format!("{path}.table.cells.{col}"))?,
            ));
        }
    }
    Ok(out)
}

fn list_config(cfg: &Value, path: &str) -> Result<ListConfig, DeclarativeError> {
    let Value::Mapping(map) = cfg else {
        return Err(err(format!("{path}.list must be a mapping")));
    };
    let mut out = ListConfig {
        ordered: get(map, "ordered").and_then(Value::as_bool),
        min_items: num(map, "minItems"),
        every_item: None,
    };
    if let Some(every_item) = get(map, "everyItem") {
        out.every_item = Some(if every_item.as_str() == Some("checkbox") {
            EveryItem::Checkbox
        } else {
            EveryItem::Schema(compile_schema(
                every_item,
                &format!("{path}.list.everyItem"),
            )?)
        });
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn body(yaml: &str) -> Result<SectionSeq, DeclarativeError> {
        let v: Value = serde_yaml::from_str(yaml).unwrap();
        compile_body(&v, "body")
    }

    // Contract first: the canonical body compiles into the combinator shapes.
    #[test]
    fn sections_one_of_gap_and_optional_compile() {
        let seq = body(
            "order: strict\nallowUnknown: false\nsections:\n  - section: Title\n  - oneOf: [Goal, 'Goal / Problem statement']\n  - gap:\n      min: 1\n      max: 2\n  - section: Appendix\n    optional: true\n",
        )
        .unwrap();
        assert_eq!(seq.opts.order, Order::Strict);
        assert!(!seq.opts.allow_unknown);
        assert_eq!(seq.specs.len(), 4);
        assert!(matches!(&seq.specs[0], Spec::Section(s) if s.names == ["Title"]));
        assert!(matches!(&seq.specs[1], Spec::OneOf(o) if o.names.len() == 2));
        assert!(matches!(&seq.specs[2], Spec::Gap(g) if g.min == Some(1) && g.max == Some(2)));
        assert!(matches!(&seq.specs[3], Spec::Optional(_)));
    }

    #[test]
    fn content_leaves_compile_to_typed_configs() {
        let seq = body(
            "sections:\n  - section: Files\n    anchor: files\n    content:\n      table:\n        columns: [Location, Kind]\n        minRows: 1\n        extraColumns: error\n        cells:\n          Kind:\n            enum: [add, modify]\n",
        )
        .unwrap();
        let Spec::Section(s) = &seq.specs[0] else {
            panic!()
        };
        let opts = s.opts.as_ref().unwrap();
        assert_eq!(opts.anchor.as_deref(), Some("files"));
        let Some(SectionContent::Single(leaf)) = &opts.content else {
            panic!()
        };
        let Some(crate::contract::LeafConfig::Table(t)) = &leaf.config else {
            panic!()
        };
        assert_eq!(t.columns, ["Location", "Kind"]);
        assert_eq!(t.min_rows, Some(1.0));
        assert_eq!(t.extra_columns, ExtraColumns::Error);
        assert_eq!(t.cells.len(), 1);
    }

    #[test]
    fn named_leaf_records_and_children_recurse() {
        let seq = body(
            "sections:\n  - section: Decision\n    content:\n      components:\n        table:\n          columns: ['#']\n      risks:\n        table:\n          columns: [Risk]\n    children:\n      order: strict\n      sections:\n        - section: Components\n",
        )
        .unwrap();
        let Spec::Section(s) = &seq.specs[0] else {
            panic!()
        };
        let opts = s.opts.as_ref().unwrap();
        let Some(SectionContent::Anchored(entries)) = &opts.content else {
            panic!()
        };
        assert_eq!(entries[0].0, "components");
        assert_eq!(entries[1].0, "risks");
        assert!(opts.children.is_some());
    }

    #[test]
    fn section_text_keys_become_node_rules() {
        let seq =
            body("sections:\n  - section: Summary\n    requires:\n      - pattern: outcome\n")
                .unwrap();
        let Spec::Section(s) = &seq.specs[0] else {
            panic!()
        };
        assert_eq!(s.opts.as_ref().unwrap().rules.len(), 1);
    }

    #[test]
    fn grammar_guards_and_dsl_typing_reject() {
        // key collision among declared names
        assert!(
            body("sections:\n  - section: Files to touch\n  - section: Files To Touch\n").is_err()
        );
        // min/max without repeatable
        assert!(body("sections:\n  - section: Entry\n    min: 1\n").is_err());
        // min above max
        assert!(
            body("sections:\n  - section: Entry\n    repeatable: true\n    min: 3\n    max: 1\n")
                .is_err()
        );
        // bad order keyword; missing sections list; unknown node
        assert!(body("order: alphabetical\nsections: []\n").is_err());
        assert!(body("order: none\n").is_err());
        assert!(body("sections:\n  - wibble: 1\n").is_err());
    }
}
