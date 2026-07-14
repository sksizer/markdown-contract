//! The API layer the transports forward to: generated CRUD modules (one per
//! entity, in generated/) plus the hand-written custom endpoints beside them.
//! ontogen scans this directory and emits a handler per transport for every
//! function here — hand-written logic is never duplicated per transport.
pub mod echo;
pub mod generated;
pub mod openers;
pub mod scan;
pub mod vault_status;
pub use generated::*;
