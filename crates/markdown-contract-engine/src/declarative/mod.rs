//! The declarative front-end (D-0008): YAML in, runtime
//! [`Contract`](crate::contract::Contract)s / [`CorpusConfig`](crate::runner::CorpusConfig)s
//! out — the data-authoring twin of the programmatic builders, with authoring mistakes
//! rejected at compile time as typed [`DeclarativeError`]s.
//!
//! This file is a barrel only: it re-exports, it holds no logic.

pub mod body;
pub mod config;
pub mod errors;
pub mod load;
pub mod parse;
pub mod schema;
pub mod text;

pub use body::compile_body;
#[cfg(feature = "native")]
pub use config::load_config_file;
pub use config::{ContractResolver, load_config};
pub use errors::DeclarativeError;
#[cfg(feature = "native")]
pub use load::load_contract_file;
pub use load::{compile_contract_object, load_contract};
pub use parse::{DeclarativeDoc, DeclarativeKind, parse_declarative_doc};
pub use schema::{compile_object_schema, compile_schema};
pub use text::{compile_body_text_rule, compile_section_text_rules, has_text_keys};
