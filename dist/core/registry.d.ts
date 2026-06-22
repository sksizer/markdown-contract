/**
 * The finding-id → default `FindingLevel` registry plus the `Ctx` factory (`makeCtx`).
 *
 * `level` is **contract data**, not a call-site choice (D-0001): a finding id has one
 * default severity wherever it fires. This registry holds the structure- and content-plane
 * defaults; the rule (`rule/*` / `docRule`) defaults are added when that plane lands (T-3NC8).
 *
 * `makeCtx(path, registry)` returns the `Ctx` a rule body uses: its `finding(...)` stamps
 * the document `path` and fills `level` from the registry when the caller does not supply
 * one (A4). Engine-internal structure findings reuse the same registry through this Ctx so
 * a single source defines every default.
 */
import type { Ctx, FindingLevel } from "./types.js";
/** The default severity for every structure-plane finding id this plane emits (D-0003). */
export declare const STRUCTURE_LEVELS: Record<string, FindingLevel>;
/**
 * The default severity for every content- and frontmatter-plane finding id (D-0004 / D-0001).
 * Content checks default to `error` (a data-shape violation blocks the typed model); the
 * frontmatter Zod findings are likewise `error`.
 */
export declare const CONTENT_LEVELS: Record<string, FindingLevel>;
/**
 * Default severities for the rule plane (`rule/*` — and the contract-chosen namespaces a
 * `rule` / `docRule` may mint, e.g. `task/...`, `summary/...`). `level` is contract data
 * (D-0001 A4): a rule body names the problem and the engine fills the default level. A rule
 * that supplies its own `level` overrides this; an unregistered rule id still defaults to
 * `"error"` via {@link makeCtx}, so this table is the documented, not the load-bearing, source.
 */
export declare const RULE_LEVELS: Record<string, FindingLevel>;
/** The id → default-level registry. T-3NC8 extends it with rule ids. */
export type LevelRegistry = Record<string, FindingLevel>;
/** A fresh registry seeded with the structure-, content-, and rule-plane defaults. */
export declare function defaultRegistry(): LevelRegistry;
/**
 * Build the rule-author finding factory. `finding({id, message, level?, pos?})` stamps
 * the document `path`, fills `level` from the registry (defaulting to `"error"` for an
 * unregistered id), and carries `pos` only when supplied (omitted for absence findings).
 */
export declare function makeCtx(path: string, registry: LevelRegistry): Ctx;
//# sourceMappingURL=registry.d.ts.map