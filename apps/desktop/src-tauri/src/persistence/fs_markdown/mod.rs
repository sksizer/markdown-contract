//! This app persists to SQLite, not markdown — but ontogen's generated store
//! code for `belongs_to` relations imports wikilink helpers from this fixed
//! module path (a documented 0.2.x caveat). These are the no-op stubs the
//! iron-log example ships for the same reason.
pub mod parser;
