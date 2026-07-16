//! The schema-DSL compiler — the v1 "closed vocabulary" (D-0008 § Schema vocabulary),
//! YAML mapping in, a compiled [`Schema`] out, mirroring the TS `compileSchema` /
//! `compileObjectSchema`.
//!
//! The vocabulary is deliberately finite: `type` (string/number/boolean/array/object),
//! `enum`, `const`, with `min` / `max` / `pattern` / `format` / `int` constraints and
//! `optional` / `default` / `nullable` wrappers. Anything richer is the deferred code
//! escape hatch — `$ref` — which is NOT part of v1 and errors here (a typed
//! [`DeclarativeError::RefEscape`], the "vault needs the TS engine" hook).

use regex::Regex;
use serde_yaml::Value;

use super::errors::DeclarativeError;
use crate::schema::{ConstValue, STRING_FORMATS, Schema, StringFormat};

/// A human word for a YAML value's shape, for error messages (the TS `describe`).
fn describe(v: &Value) -> &'static str {
    match v {
        Value::Null => "null",
        Value::Sequence(_) => "a list",
        Value::Mapping(_) => "object",
        Value::String(_) => "string",
        Value::Number(_) => "number",
        Value::Bool(_) => "boolean",
        Value::Tagged(_) => "a tagged value",
    }
}

fn get<'a>(map: &'a serde_yaml::Mapping, key: &str) -> Option<&'a Value> {
    map.get(Value::String(key.into()))
}

/// A number-or-`None` reader for the optional `min` / `max` bound knobs (a non-number
/// is silently ignored, as in the TS `num`).
fn num(map: &serde_yaml::Mapping, key: &str) -> Option<f64> {
    get(map, key).and_then(Value::as_f64)
}

/// Compile one schema node (the closed vocabulary) into a [`Schema`].
pub fn compile_schema(node: &Value, path: &str) -> Result<Schema, DeclarativeError> {
    let Value::Mapping(n) = node else {
        return Err(DeclarativeError::InvalidSchema(format!(
            "{path}: a schema must be a mapping (got {})",
            describe(node)
        )));
    };

    if get(n, "$ref").is_some() {
        return Err(DeclarativeError::RefEscape { path: path.into() });
    }

    let mut schema = base(n, path)?;

    // Wrappers, applied outermost-last so a field can be nullable + default + optional.
    if get(n, "nullable").and_then(Value::as_bool) == Some(true) {
        schema = Schema::Nullable(Box::new(schema));
    }
    if get(n, "default").is_some() {
        schema = Schema::Default(Box::new(schema));
    }
    if get(n, "optional").and_then(Value::as_bool) == Some(true) {
        schema = Schema::Optional(Box::new(schema));
    }
    Ok(schema)
}

/// Compile an object shape `{ <key>: <schema> }` into a (strict) object schema — used
/// for `type: object` and the frontmatter plane.
pub fn compile_object_schema(
    fields: Option<&Value>,
    strict: bool,
    path: &str,
) -> Result<Schema, DeclarativeError> {
    let Some(Value::Mapping(map)) = fields else {
        return Err(DeclarativeError::InvalidSchema(format!(
            "{path}: fields must be a mapping of key → schema (got {})",
            fields.map_or("undefined", describe)
        )));
    };
    let mut compiled = Vec::with_capacity(map.len());
    for (key, value) in map {
        let Some(key) = key.as_str() else {
            return Err(DeclarativeError::InvalidSchema(format!(
                "{path}: field keys must be strings"
            )));
        };
        compiled.push((
            key.to_string(),
            compile_schema(value, &format!("{path}.{key}"))?,
        ));
    }
    Ok(Schema::Object {
        fields: compiled,
        strict,
    })
}

/// The un-wrapped base schema — exactly one of enum / const / type.
fn base(n: &serde_yaml::Mapping, path: &str) -> Result<Schema, DeclarativeError> {
    if let Some(values) = get(n, "enum") {
        let Some(seq) = values.as_sequence() else {
            return Err(bad_enum(path));
        };
        let strings: Option<Vec<String>> =
            seq.iter().map(|v| v.as_str().map(str::to_string)).collect();
        return match strings {
            Some(s) if !s.is_empty() => Ok(Schema::Enum(s)),
            _ => Err(bad_enum(path)),
        };
    }
    if let Some(c) = get(n, "const") {
        let value = match c {
            Value::String(s) => ConstValue::String(s.clone()),
            Value::Number(x) => ConstValue::Number(x.as_f64().unwrap_or(f64::NAN)),
            Value::Bool(b) => ConstValue::Bool(*b),
            Value::Null => ConstValue::Null,
            other => {
                return Err(DeclarativeError::InvalidSchema(format!(
                    "{path}: const must be a scalar (got {})",
                    describe(other)
                )));
            }
        };
        return Ok(Schema::Const(value));
    }
    if get(n, "type").is_some() {
        return typed(n, path);
    }
    Err(DeclarativeError::InvalidSchema(format!(
        "{path}: a schema needs one of type / enum / const"
    )))
}

fn bad_enum(path: &str) -> DeclarativeError {
    DeclarativeError::InvalidSchema(format!("{path}: enum must be a non-empty list of strings"))
}

fn typed(n: &serde_yaml::Mapping, path: &str) -> Result<Schema, DeclarativeError> {
    match get(n, "type").and_then(Value::as_str) {
        Some("string") => string_schema(n, path),
        Some("number") => Ok(Schema::Number {
            int: get(n, "int").and_then(Value::as_bool) == Some(true),
            min: num(n, "min"),
            max: num(n, "max"),
        }),
        Some("boolean") => Ok(Schema::Boolean),
        Some("array") => array_schema(n, path),
        Some("object") => compile_object_schema(
            get(n, "fields"),
            get(n, "strict").and_then(Value::as_bool) == Some(true),
            path,
        ),
        other => Err(DeclarativeError::InvalidSchema(format!(
            "{path}: unsupported type '{}' (string | number | boolean | array | object)",
            other.unwrap_or("?")
        ))),
    }
}

/// `type: string` — a named `format`, else a plain string with `min` / `max` / `pattern`.
fn string_schema(n: &serde_yaml::Mapping, path: &str) -> Result<Schema, DeclarativeError> {
    if let Some(format) = get(n, "format").and_then(Value::as_str) {
        let Some(f) = StringFormat::from_name(format) else {
            return Err(DeclarativeError::InvalidSchema(format!(
                "{path}: unsupported string format '{format}' (expected one of: {})",
                STRING_FORMATS
                    .iter()
                    .map(|(n, _)| *n)
                    .collect::<Vec<_>>()
                    .join(", ")
            )));
        };
        return Ok(Schema::Format {
            format: f,
            min: None,
            max: None,
            pattern: None,
        });
    }
    let pattern = match get(n, "pattern").and_then(Value::as_str) {
        Some(src) => Some(Regex::new(src).map_err(|e| {
            DeclarativeError::InvalidSchema(format!("{path}: invalid pattern /{src}/: {e}"))
        })?),
        None => None,
    };
    Ok(Schema::String {
        min: num(n, "min"),
        max: num(n, "max"),
        pattern,
    })
}

/// `type: array` — an `of` element schema, with optional `min` / `max` length bounds.
fn array_schema(n: &serde_yaml::Mapping, path: &str) -> Result<Schema, DeclarativeError> {
    let Some(of) = get(n, "of") else {
        return Err(DeclarativeError::InvalidSchema(format!(
            "{path}: an array schema needs an 'of' element schema"
        )));
    };
    Ok(Schema::Array {
        of: Box::new(compile_schema(of, &format!("{path}[]"))?),
        min: num(n, "min"),
        max: num(n, "max"),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::schema::{IssueKind, PathSeg};
    use serde_json::json;

    fn compile(yaml: &str) -> Result<Schema, DeclarativeError> {
        let v: Value = serde_yaml::from_str(yaml).unwrap();
        compile_schema(&v, "schema")
    }

    // Contract first: the v1 vocabulary compiles into a schema that validates like the
    // TS-compiled Zod — one plain input→output case per construct.
    #[test]
    fn string_with_pattern_compiles_and_validates() {
        let s = compile("type: string\npattern: '^D-[0-9A-Z]{4}$'").unwrap();
        assert!(s.safe_parse(Some(&json!("D-0014"))).is_ok());
        let issues = s.safe_parse(Some(&json!("X-1"))).unwrap_err();
        assert_eq!(
            issues[0].kind,
            IssueKind::InvalidFormat {
                format: "regex".into()
            }
        );
    }

    #[test]
    fn enum_const_and_wrappers_compile() {
        let e = compile("enum: [a, b]").unwrap();
        assert!(e.safe_parse(Some(&json!("b"))).is_ok());
        assert!(e.safe_parse(Some(&json!("c"))).is_err());

        let c = compile("const: 3").unwrap();
        assert!(c.safe_parse(Some(&json!(3))).is_ok());

        let w = compile("type: string\noptional: true\nnullable: true").unwrap();
        assert!(w.safe_parse(None).is_ok());
        assert!(w.safe_parse(Some(&json!(null))).is_ok());

        let d = compile("type: array\nof: { type: string }\ndefault: []").unwrap();
        assert!(d.safe_parse(None).is_ok()); // absent → default substitutes
        assert_eq!(
            d.safe_parse(Some(&json!(["ok", 3]))).unwrap_err()[0].path,
            vec![PathSeg::Index(1)]
        );
    }

    #[test]
    fn object_fields_and_strict_compile() {
        let s = compile("type: object\nstrict: true\nfields:\n  id: { type: string }").unwrap();
        let issues = s
            .safe_parse(Some(&json!({"id": "x", "zz": 1})))
            .unwrap_err();
        assert_eq!(
            issues[0].kind,
            IssueKind::UnrecognizedKeys {
                keys: vec!["zz".into()]
            }
        );
    }

    #[test]
    fn named_formats_compile() {
        let s = compile("type: string\nformat: date").unwrap();
        assert!(s.safe_parse(Some(&json!("2024-02-29"))).is_ok());
        assert!(s.safe_parse(Some(&json!("2023-02-29"))).is_err());
    }

    // The closed-vocabulary rejections — each is a typed DeclarativeError.
    #[test]
    fn out_of_vocabulary_shapes_are_rejected() {
        assert!(matches!(
            compile("$ref: ./custom.ts").unwrap_err(),
            DeclarativeError::RefEscape { .. }
        ));
        assert!(compile("enum: []").is_err());
        assert!(compile("enum: [1, 2]").is_err());
        assert!(compile("type: array").is_err()); // no `of`
        assert!(compile("type: wibble").is_err());
        assert!(compile("format: date").is_err()); // format without type is no base
        assert!(compile("type: string\nformat: zipcode").is_err());
        let v: Value = serde_yaml::from_str("- a").unwrap();
        assert!(compile_schema(&v, "schema").is_err()); // a schema must be a mapping
    }
}
