//! Engine `Finding` → [`EngineFinding`] mapping, shared by the native adapter
//! and the CLI fallback (whose `--format json` output deserializes into the
//! same `markdown_contract_engine::Finding` interchange shape, D-0001).
//!
//! Paths pass through untouched: both the native runner (`run_corpus_dir`) and
//! the TS CLI (run with the vault as the run root) already report POSIX paths
//! RELATIVE to the vault root — exactly what `FindingRecord.file_path` wants
//! (the daemon's `RunResult` reports the same vault-relative paths).

use markdown_contract_engine::{Finding, FindingLevel};

use super::EngineFinding;

/// The persisted level string for an engine level — the same lowercase
/// vocabulary the finding JSON carries ("error" | "warn" | "report").
pub fn level_str(level: FindingLevel) -> &'static str {
    match level {
        FindingLevel::Error => "error",
        FindingLevel::Warn => "warn",
        FindingLevel::Report => "report",
    }
}

/// Map one engine finding into the desktop's transport-free shape. `pos` is
/// already 1-based; an absent `pos` (whole-document finding) maps to
/// `line: None, col: None`, and a line-only `pos` keeps `col: None`.
pub fn to_engine_finding(finding: Finding) -> EngineFinding {
    EngineFinding {
        finding_id: finding.id,
        level: level_str(finding.level).to_string(),
        file_path: finding.path,
        line: finding.pos.map(|p| p.line as i32),
        col: finding.pos.and_then(|p| p.col).map(|c| c as i32),
        message: finding.message,
    }
}

#[cfg(test)]
mod tests {
    use markdown_contract_engine::SourcePos;

    use super::*;

    fn finding(pos: Option<SourcePos>) -> Finding {
        Finding {
            id: "structure/section-missing".into(),
            level: FindingLevel::Error,
            path: "docs/guide.md".into(),
            pos,
            message: "required section ‘Overview’ is missing".into(),
            fix: None,
        }
    }

    // Contract first: a positioned finding maps field-for-field, path verbatim
    // (vault-relative, POSIX — exactly as the runner/CLI report it).
    #[test]
    fn positioned_finding_maps_field_for_field() {
        let mapped = to_engine_finding(finding(Some(SourcePos::at(3, 7))));
        assert_eq!(mapped.finding_id, "structure/section-missing");
        assert_eq!(mapped.level, "error");
        assert_eq!(mapped.file_path, "docs/guide.md");
        assert_eq!((mapped.line, mapped.col), (Some(3), Some(7)));
        assert_eq!(mapped.message, "required section ‘Overview’ is missing");
    }

    #[test]
    fn absent_pos_maps_to_no_line_no_col() {
        let mapped = to_engine_finding(finding(None));
        assert_eq!((mapped.line, mapped.col), (None, None));
    }

    #[test]
    fn line_only_pos_keeps_col_none() {
        let mapped = to_engine_finding(finding(Some(SourcePos::line(12))));
        assert_eq!((mapped.line, mapped.col), (Some(12), None));
    }

    #[test]
    fn levels_map_to_the_persisted_vocabulary() {
        assert_eq!(level_str(FindingLevel::Error), "error");
        assert_eq!(level_str(FindingLevel::Warn), "warn");
        assert_eq!(level_str(FindingLevel::Report), "report");
    }
}
