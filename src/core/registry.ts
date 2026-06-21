/**
 * The finding-id → default `FindingLevel` registry plus the `Ctx` factory (`makeCtx`).
 *
 * `level` is **contract data**, not a call-site choice (D-0001): a finding id has one
 * default severity wherever it fires. This registry holds the structure-plane defaults;
 * the content (`content/*`) and rule (`rule/*` / `docRule`) defaults are added when those
 * planes land (T-5LW7 / T-3NC8).
 *
 * `makeCtx(path, registry)` returns the `Ctx` a rule body uses: its `finding(...)` stamps
 * the document `path` and fills `level` from the registry when the caller does not supply
 * one (A4). Engine-internal structure findings reuse the same registry through this Ctx so
 * a single source defines every default.
 */
import type { Ctx, Finding, FindingLevel, SourcePos } from "./types.js";

/** The default severity for every structure-plane finding id this plane emits (D-0003). */
export const STRUCTURE_LEVELS: Record<string, FindingLevel> = {
  "structure/section-missing": "error",
  "structure/section-order": "error",
  "structure/duplicate-section": "error",
  "structure/key-collision": "error",
  "structure/anchor-missing": "error",
  "structure/block-missing": "error",
  "structure/block-kind": "error",
  "structure/gap-count": "error",
  "structure/heading-depth-jump": "warn",
};

/** The id → default-level registry. T-5LW7 / T-3NC8 extend it with content + rule ids. */
export type LevelRegistry = Record<string, FindingLevel>;

/** A fresh registry seeded with the structure-plane defaults. */
export function defaultRegistry(): LevelRegistry {
  return { ...STRUCTURE_LEVELS };
}

/**
 * Build the rule-author finding factory. `finding({id, message, level?, pos?})` stamps
 * the document `path`, fills `level` from the registry (defaulting to `"error"` for an
 * unregistered id), and carries `pos` only when supplied (omitted for absence findings).
 */
export function makeCtx(path: string, registry: LevelRegistry): Ctx {
  return {
    path,
    finding(f: { id: string; message: string; level?: FindingLevel; pos?: SourcePos }): Finding {
      const level: FindingLevel = f.level ?? registry[f.id] ?? "error";
      const out: Finding = { id: f.id, level, path, message: f.message };
      if (f.pos !== undefined) out.pos = f.pos;
      return out;
    },
  };
}
