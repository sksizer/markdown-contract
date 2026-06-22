/**
 * The contract combinators — `contract()` plus the body-grammar vocabulary
 * (`sections` / `section` / `optional` / `oneOf` / `gap`) and the named-rule
 * factories (`rule` / `docRule`). These declare a contract's two planes (C-0005).
 *
 * As of T-8RJ5 the combinators CONSTRUCT the grammar IR (inert tagged data from
 * `types.ts`) instead of throwing, `contract()` retains its def and wires `validate`
 * to the structure matcher, and a build-time camelCase key collision among declared
 * sibling names throws a `ContractBuildError` (`contract/key-collision`). The content
 * leaf and the cross-plane / docRule merge land in T-5LW7 / T-3NC8.
 */
import { toCamelKey } from "./camel.js";
import { read as readEntry, validate as validateEntry } from "./validate.js";
// Re-export the structure matcher so callers can `import { matchStructure } from "./grammar.js"`.
export { matchStructure } from "./structure.js";
/**
 * A build-time contract-authoring error — thrown by `contract(...)` / `sections(...)`, not
 * collected as a `Finding`. Carries the offending finding id (`contract/key-collision`) in
 * its message so the build-time guard is identifiable. Distinct from `ContractError`
 * (D-0001), which is the document-time strict-door failure carrying error-level findings.
 */
export class ContractBuildError extends Error {
    id;
    constructor(id, message) {
        super(message);
        this.name = "ContractBuildError";
        this.id = id;
    }
}
/**
 * Compile a `ContractDef` into a `Contract` — two doors onto one engine. Retains the def
 * (read by `validate()` / `read()`), and runs the build-time guards.
 */
export function contract(def) {
    const self = {
        validate(input, ctx) {
            return validateEntry(def, input, ctx);
        },
        read(source, ctx) {
            return readEntry(def, source, ctx);
        },
    };
    // Stash the def for entry points / introspection (typed loosely; the public shape is `Contract`).
    self.__def = def;
    return self;
}
/**
 * Bundle an ordered `Spec[]` (with level options) into a body grammar. Runs the build-time
 * `contract/key-collision` guard: two declared sibling names that collapse to the same
 * camelCase key are rejected at construction (D-0003 / proposed-shape §6).
 */
export function sections(opts, specs) {
    assertNoKeyCollision(specs);
    return { __brand: "SectionSeq", opts, specs };
}
/**
 * The build-time key-collision guard: among declared `section`/`oneOf` names at one level,
 * two distinct names collapsing to the same camelCase key throw `contract/key-collision`.
 * (Runs per level; nested `children` levels run their own guard when their `sections()` is
 * constructed.) Alias spellings within one `oneOf` / `section([...])` slot are *not* a
 * collision — they are one logical slot — so only the first spelling of each slot is keyed.
 */
function assertNoKeyCollision(specs) {
    const keyToName = new Map();
    for (const spec of specs) {
        const inner = unwrapInner(spec);
        let primaryName;
        if (inner.kind === "section")
            primaryName = inner.names[0];
        else if (inner.kind === "oneOf")
            primaryName = inner.names[0];
        if (primaryName === undefined)
            continue;
        const key = toCamelKey(primaryName);
        if (key === "")
            continue; // no generated alias → cannot collide on a key
        const prior = keyToName.get(key);
        if (prior !== undefined && prior !== primaryName) {
            throw new ContractBuildError("contract/key-collision", `section names ‘${prior}’ and ‘${primaryName}’ both generate the camelCase key ‘${key}’; generated OOM keys must be unique`);
        }
        keyToName.set(key, primaryName);
    }
}
/** Unwrap `optional(spec)` to its inner tagged spec. */
function unwrapInner(spec) {
    return spec.kind === "optional" ? unwrapInner(spec.spec) : spec;
}
/** Declare a required section by name, or by an alias set (`string[]`). */
export function section(name, opts) {
    const spec = {
        kind: "section",
        names: Array.isArray(name) ? name : [name],
        ...(opts ? { opts } : {}),
    };
    return spec;
}
/** Mark a `Spec` optional. */
export function optional(spec) {
    const out = { kind: "optional", spec };
    return out;
}
/** Declare a choice over interchangeable spellings at one position. */
export function oneOf(names, opts) {
    const spec = { kind: "oneOf", names, ...(opts ? { opts } : {}) };
    return spec;
}
/** Permit a window of unknown sections at this position, optionally bounded by `min`/`max`. */
export function gap(opts) {
    const spec = {
        kind: "gap",
        ...(opts?.min !== undefined ? { min: opts.min } : {}),
        ...(opts?.max !== undefined ? { max: opts.max } : {}),
    };
    return spec;
}
/** Register a per-node named rule (the matcher runs it on its bound section, T-8RJ5). */
export function rule(id, fn) {
    return { __brand: "Rule", id, run: fn };
}
/**
 * Register a cross-plane / cross-file named rule over the whole typed doc. Constructed
 * inertly here; the engine wires `docRule` into the cross-plane merge in T-3NC8.
 */
export function docRule(id, fn) {
    return { __brand: "DocRule", id, run: fn };
}
//# sourceMappingURL=grammar.js.map