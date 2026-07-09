//! The matched Rust engine for markdown-contract (D-0018 §D2) — this phase: the core
//! model, the markdown projection, and the structure plane, with finding parity to the
//! TypeScript engine in `packages/core` (identical ids, level defaults, 1-based
//! positions, deterministic sort, and JSON shape).
//!
//! fs-free and `wasm32-unknown-unknown`-compatible: strings in, findings out. fs, glob
//! walking, and config discovery belong to a thin native layer, not this crate.
//!
//! Next phase (seams left in place, see module docs): the content plane
//! (table/list/code/maxWords + frontmatter schema), declarative text constraints, the
//! declarative YAML contract loader, and the shared corpus harness.
//!
//! This file is a barrel only: it re-exports, it holds no logic.

pub mod camel;
pub mod contract;
pub mod dialect;
pub mod finding;
pub mod parse;
pub mod registry;
pub mod structure;
pub mod tree;
pub mod validate;

pub use camel::to_camel_key;
pub use contract::{
    Contract, DocRule, FrontmatterSpec, GapSpec, LeafSpec, LevelOpts, OneOfSpec, Order, Rule,
    SectionContent, SectionOpts, SectionSeq, SectionSpec, Spec, doc_rule, gap, gap_bounds, one_of,
    one_of_with, optional, rule, section, section_with, sections,
};
pub use finding::{EditRange, Finding, FindingLevel, Fix, SourcePos, TextEdit};
pub use parse::{Frontmatter, FrontmatterSplit, parse_document, split_frontmatter};
pub use registry::{Ctx, FindingSpec, Registry};
pub use structure::{match_structure, scan_heading_depth_jumps};
pub use tree::{BlockKind, BlockNode, DocTree, ListItem, SectionNode};
pub use validate::{sort_findings, validate, validate_tree};
