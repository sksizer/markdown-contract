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
 * `:style="{ color: token.color, background: token.bg }"`) rather than adding new
 * CSS custom properties — the structural surface/border/text styling still comes
 * from the shared `--mc-*` vars in `assets/css/main.css`. The hex values here are
 * harmonized with that `--mc-*` palette but stated concretely so this module is
 * fully self-contained and portable into a future `apps/web`.
 */
import type { Finding, FindingLevel } from "../types";

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
    color: "#1a7f37",
    bg: "#e8f5ec",
    icon: "✓",
  },
  findings: {
    key: "findings",
    label: "Findings",
    description: "Validation surfaced findings to review.",
    color: "#9a6700",
    bg: "#fff8e6",
    icon: "!",
  },
  drift: {
    key: "drift",
    label: "Drift",
    description: "Config or structure has drifted from the contract.",
    color: "#8250df",
    bg: "#f5f0ff",
    icon: "≠",
  },
  running: {
    key: "running",
    label: "Running",
    description: "A validation run is in progress.",
    color: "#0a66c2",
    bg: "#eaf3ff",
    icon: "◌",
  },
  error: {
    key: "error",
    label: "Error",
    description: "The run could not complete.",
    color: "#d1242f",
    bg: "#ffeef0",
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
    color: "#d1242f",
    bg: "#ffeef0",
    icon: "✕",
    rank: 3,
  },
  warn: {
    key: "warn",
    label: "Warn",
    color: "#9a6700",
    bg: "#fff8e6",
    icon: "▲",
    rank: 2,
  },
  report: {
    key: "report",
    label: "Report",
    color: "#0a66c2",
    bg: "#eaf3ff",
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
