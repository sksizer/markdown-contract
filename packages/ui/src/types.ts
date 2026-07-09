/**
 * The kit's VIEW-MODEL vocabulary — the minimal shapes the components render.
 *
 * These deliberately MIRROR the daemon's wire seam (`apps/web/types/api.ts`,
 * itself a hand-owned mirror of the engine) rather than importing it: imports
 * flow app → ui package, never the reverse, so the wire contract can't grow a
 * dependency on a presentation kit and the kit stays consumable by apps with no
 * daemon at all (the desktop shell). Structural typing is the seam — the API's
 * `Finding` / `VaultStatusState` values are assignable to these as-is.
 */

/** Severity is contract data, not a call-site choice. Mirror of `FindingLevel`. */
export type FindingLevel = "error" | "warn" | "report";

/** A single source point. Mirror of `SourcePos`. */
export interface SourcePos {
  line: number;
  col?: number;
}

/**
 * One finding rendered by the kit (FindingRow, ContractGroup). Mirror of the
 * engine's `Finding`: file·line·severity·rule·message plus an optional
 * describe-only fix.
 */
export interface Finding {
  /** the rule — namespaced `area/.../name`, e.g. "structure/section-missing" */
  id: string;
  level: FindingLevel;
  /** the source document's file path, e.g. "docs/guide.md" */
  path: string;
  /** omitted for whole-document absence findings */
  pos?: SourcePos;
  message: string;
  /** describes only; this engine never edits documents */
  fix?: { description: string };
}
