use ontogen_macros::{ontogen, stateless};

use crate::schema::AppError;

/// The IPC smoke test, kept from the template: the Nuxt frontend invokes
/// `echo` and expects the message back with the "Echo from Rust:" marker
/// (see app/utils/echo.ts). Now an API-layer fn so the generated transports
/// (and TS bindings) carry it instead of a hand-registered command; the
/// rename pins the historical command name (default would be `echo_echo`).
#[stateless]
#[ontogen(rename = "echo")]
pub fn echo(message: &str) -> Result<String, AppError> {
    Ok(format!("Echo from Rust: {message}"))
}
