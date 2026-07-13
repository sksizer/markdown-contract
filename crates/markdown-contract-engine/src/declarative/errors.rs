//! The declarative front-end's authoring error — raised by the YAML loader/compiler
//! when a declarative document is malformed or uses a feature outside the v1 DSL.
//!
//! Typed (thiserror-style) rather than stringly: the variants a host cares about are
//! distinguishable — notably [`DeclarativeError::UnsupportedVersion`],
//! [`DeclarativeError::RefEscape`], and [`DeclarativeError::CodeContractRef`], the
//! "this vault needs the TS engine" detection hooks (D-0018).

/// A declarative document that could not be compiled into a contract / config.
#[derive(Debug, thiserror::Error)]
pub enum DeclarativeError {
    /// the YAML text itself does not parse
    #[error("invalid YAML: {0}")]
    InvalidYaml(String),

    /// the document parses but is not a mapping with the required envelope
    #[error("{0}")]
    InvalidDocument(String),

    /// an `mcVersion` outside the supported set — never best-effort parsed
    #[error("unsupported mcVersion: {0} (this build supports 1)")]
    UnsupportedVersion(String),

    /// a `kind` that is neither `contract` nor `config`
    #[error("kind must be \"contract\" or \"config\" (got {0})")]
    InvalidKind(String),

    /// a schema node outside the closed v1 vocabulary
    #[error("{0}")]
    InvalidSchema(String),

    /// a body-grammar node outside the v1 DSL (or a build-time grammar violation)
    #[error("{0}")]
    InvalidBody(String),

    /// a `requires:` / `forbids:` match spec outside the closed vocabulary (or a
    /// duplicate / contradiction)
    #[error("{0}")]
    InvalidTextSpec(String),

    /// a config document outside the v1 DSL
    #[error("{0}")]
    InvalidConfig(String),

    /// the deferred `$ref` code escape hatch (not part of v1 — D-0008 § Out of scope)
    #[error(
        "{path}: the code escape hatch ($ref) is deferred and not supported in v1 (see D-0008 § Out of scope)"
    )]
    RefEscape { path: String },

    /// a config contract ref to a code-authored `.js` / `.ts` module (deferred)
    #[error(
        "{path}: in v1 a contract ref must be a .yaml file (got '{target}'); referencing a code-authored .js/.ts contract is the deferred code escape (D-0008)"
    )]
    CodeContractRef { path: String, target: String },

    /// a referenced contract file could not be read
    #[error("failed to read contract ref '{target}': {reason}")]
    ContractRefRead { target: String, reason: String },
}

#[cfg(test)]
mod tests {
    use super::DeclarativeError;

    // Contract first: the hook variants render their diagnostic messages verbatim.
    #[test]
    fn hook_variants_render_their_messages() {
        let e = DeclarativeError::RefEscape {
            path: "frontmatter.id".into(),
        };
        assert_eq!(
            e.to_string(),
            "frontmatter.id: the code escape hatch ($ref) is deferred and not supported in v1 (see D-0008 § Out of scope)"
        );
        let e = DeclarativeError::UnsupportedVersion("2".into());
        assert_eq!(
            e.to_string(),
            "unsupported mcVersion: 2 (this build supports 1)"
        );
        let e = DeclarativeError::CodeContractRef {
            path: "rules[0].contract".into(),
            target: "./task.contract.ts".into(),
        };
        assert!(
            e.to_string()
                .contains(".js/.ts contract is the deferred code escape")
        );
    }
}
