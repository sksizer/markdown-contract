//! The Obsidian dialect (BASE, always on) — barrel only; logic lives in the siblings.
//!
//! - [`anchors`] — line-terminal `^block-id` tokens, the addressing primitive.
//! - [`wikilinks`] — `[[wikilink]]` / `![[transclusion]]` recognition over flattened text.

pub mod anchors;
pub mod wikilinks;

pub use anchors::{extract_trailing_anchor, is_standalone_anchor, TrailingAnchor};
pub use wikilinks::{extract_vault_refs, VaultRef, VaultRefKind};
