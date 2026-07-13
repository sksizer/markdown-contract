// Scoped to the generated module (not the crate): ontogen 0.2.x emits
// `{svc}::{op}(&store, ...)` even when the store accessor already returns
// `&Store`, which trips clippy::needless_borrow under -D warnings.
#[allow(clippy::needless_borrow)]
pub mod generated;
pub use generated::*;
