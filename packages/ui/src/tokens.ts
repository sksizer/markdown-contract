/**
 * tokens.ts — the SINGLE SOURCE OF TRUTH for the status/severity visual language.
 *
 * This is pure TypeScript (no Vue import) so it can be consumed by components,
 * stories, and any future tooling alike. It defines:
 *
 *   - the five vault STATUS states (green / findings / drift / running / error),
 *     each with a label, description, icon, and an accent color + background; and
 *   - the finding SEVERITY scale (error / warn / report), each with an icon,
 *     color, background, and a rank for ordering / "highest severity" math.
 *
 * Components bind these accent colors INLINE (e.g.
 * `:style="{ color: token.color, background: token.bg }"`). Every `color`/`bg`
 * is a `var(--mc-status-…)` / `var(--mc-sev-…)` REFERENCE, not a literal — the
 * light and dark values live in `theme.css` (imported by each consuming app),
 * so the whole visual language follows `prefers-color-scheme` without any
 * component changes. No hex literal is ever bound from this module.
 */
import type { Finding, FindingLevel } from "./types";

// ── Status (vault-level state) ───────────────────────────────────────────────────

/** The five vault states the dashboard must distinguish at a glance. */
export type StatusKey = "green" | "findings" | "drift" | "running" | "error";

/** Visual + descriptive token for one vault status. */
export interface StatusToken {
  key: StatusKey;
  label: string;
  description: string;
  /** accent / foreground color (bind inline, e.g. text + icon) */
  color: string;
  /** tinted background to pair with `color` */
  bg: string;
  /** a single glyph that reads at badge size */
  icon: string;
}

/** Canonical display order for status legends, galleries, and summaries. */
export const STATUS_ORDER: readonly StatusKey[] = [
  "green",
  "findings",
  "drift",
  "running",
  "error",
];

/** The status visual language, keyed by `StatusKey`. */
export const statusTokens: Record<StatusKey, StatusToken> = {
  green: {
    key: "green",
    label: "Green",
    description: "Validates clean — no findings, in sync.",
    color: "var(--mc-status-green)",
    bg: "var(--mc-status-green-bg)",
    icon: "✓",
  },
  findings: {
    key: "findings",
    label: "Findings",
    description: "Validation surfaced findings to review.",
    color: "var(--mc-status-findings)",
    bg: "var(--mc-status-findings-bg)",
    icon: "!",
  },
  drift: {
    key: "drift",
    label: "Drift",
    description: "Config or structure has drifted from the contract.",
    color: "var(--mc-status-drift)",
    bg: "var(--mc-status-drift-bg)",
    icon: "≠",
  },
  running: {
    key: "running",
    label: "Running",
    description: "A validation run is in progress.",
    color: "var(--mc-status-running)",
    bg: "var(--mc-status-running-bg)",
    icon: "◌",
  },
  error: {
    key: "error",
    label: "Error",
    description: "The run could not complete.",
    color: "var(--mc-status-error)",
    bg: "var(--mc-status-error-bg)",
    icon: "✕",
  },
};

// ── Severity (finding-level scale) ───────────────────────────────────────────────

/** Severity mirrors the engine's `FindingLevel` — it is contract data, not a choice. */
export type SeverityKey = FindingLevel;

/** Visual token for one finding severity, with a `rank` for ordering math. */
export interface SeverityToken {
  key: SeverityKey;
  label: string;
  color: string;
  bg: string;
  icon: string;
  /** higher rank = more severe; used by `severityRank` / `highestSeverity` */
  rank: number;
}

/** Display order, most-severe first. */
export const SEVERITY_ORDER: readonly SeverityKey[] = ["error", "warn", "report"];

/** The severity visual language, keyed by `SeverityKey`. */
export const severityTokens: Record<SeverityKey, SeverityToken> = {
  error: {
    key: "error",
    label: "Error",
    color: "var(--mc-sev-error)",
    bg: "var(--mc-sev-error-bg)",
    icon: "✕",
    rank: 3,
  },
  warn: {
    key: "warn",
    label: "Warn",
    color: "var(--mc-sev-warn)",
    bg: "var(--mc-sev-warn-bg)",
    icon: "▲",
    rank: 2,
  },
  report: {
    key: "report",
    label: "Report",
    color: "var(--mc-sev-report)",
    bg: "var(--mc-sev-report-bg)",
    icon: "ⓘ",
    rank: 1,
  },
};

// ── Helpers (pure) ───────────────────────────────────────────────────────────────

/** The numeric rank of a severity level (higher = more severe). */
export function severityRank(level: SeverityKey): number {
  return severityTokens[level].rank;
}

/** The highest-rank severity present in `findings`, or `null` when empty. */
export function highestSeverity(findings: Finding[]): SeverityKey | null {
  let highest: SeverityKey | null = null;
  for (const f of findings) {
    if (highest === null || severityRank(f.level) > severityRank(highest)) {
      highest = f.level;
    }
  }
  return highest;
}
