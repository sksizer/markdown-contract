/** The default severity for every structure-plane finding id this plane emits (D-0003). */
export const STRUCTURE_LEVELS = {
    "structure/section-missing": "error",
    "structure/section-order": "error",
    "structure/duplicate-section": "error",
    "structure/key-collision": "error",
    "structure/anchor-missing": "error",
    "structure/block-missing": "error",
    "structure/block-kind": "error",
    "structure/gap-count": "error",
    "structure/repeat-count": "error",
    "structure/heading-depth-jump": "warn",
};
/**
 * The default severity for every content- and frontmatter-plane finding id (D-0004 / D-0001).
 * Content checks default to `error` (a data-shape violation blocks the typed model); the
 * frontmatter Zod findings are likewise `error`.
 */
const CONTENT_LEVELS = {
    // table
    "content/table/column-missing": "error",
    "content/table/column-extra": "error",
    "content/table/min-rows": "error",
    "content/table/cell": "error",
    // list
    "content/list/item-kind": "error",
    "content/list/min-items": "error",
    // code
    "content/code/lang": "error",
    // paragraph
    "content/max-words": "error",
    // frontmatter (Zod over the YAML)
    "frontmatter/enum": "error",
    "frontmatter/unknown-key": "error",
    "frontmatter/type": "error",
    "frontmatter/required": "error",
    // a `.refine()` cross-field predicate surfaces as a Zod `custom` issue (D-0001 E1)
    "frontmatter/refine": "error",
};
/**
 * Default severities for the rule plane (`rule/*` — and the contract-chosen namespaces a
 * `rule` / `docRule` may mint, e.g. `task/...`, `summary/...`). `level` is contract data
 * (D-0001 A4): a rule body names the problem and the engine fills the default level. A rule
 * that supplies its own `level` overrides this; an unregistered rule id still defaults to
 * `"error"` via {@link makeCtx}, so this table is the documented, not the load-bearing, source.
 */
const RULE_LEVELS = {
    // cross-plane docRule ids the corpus contracts use
    "task/post-mortem-when-worked": "error",
    "task/completion-note-when-closed": "error",
    // node-local rule ids the corpus contracts use
    "summary/mentions-outcome": "error",
    "summary/names-contract": "warn",
};
/**
 * Default severities for the text plane (`text/*` — D-0011). Every declarative text constraint
 * emits through these three ids: `text/requires` (a required phrase is missing), `text/forbids`
 * (a forbidden phrase is present), and `text/count` (a `min` / `max` occurrence bound is
 * violated). All default to `error`, overridable per entry via the spec's `level`.
 */
const TEXT_LEVELS = {
    "text/requires": "error",
    "text/forbids": "error",
    "text/count": "error",
};
/** A fresh registry seeded with the structure-, content-, text-, and rule-plane defaults. */
export function defaultRegistry() {
    return { ...STRUCTURE_LEVELS, ...CONTENT_LEVELS, ...TEXT_LEVELS, ...RULE_LEVELS };
}
/**
 * Build the rule-author finding factory. `finding({id, message, level?, pos?})` stamps
 * the document `path`, fills `level` from the registry (defaulting to `"error"` for an
 * unregistered id), and carries `pos` only when supplied (omitted for absence findings).
 */
export function makeCtx(path, registry) {
    return {
        path,
        finding(f) {
            const level = f.level ?? registry[f.id] ?? "error";
            const out = { id: f.id, level, path, message: f.message };
            if (f.pos !== undefined)
                out.pos = f.pos;
            return out;
        },
    };
}
//# sourceMappingURL=registry.js.map