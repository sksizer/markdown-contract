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
 *
 * Generic over the spec TUPLE (a `const` type parameter, T-SCRB) so it infers the typed body
 * {@link BodyOf} — each declared section's exact heading name keyed to its typed value (a promoted
 * `TableView<Row>` for a sole `content: table(...)` slot, else `SectionView`) — which threads
 * through `contract()` into `read()`'s `Doc.body` and `Infer`. Passing an ordinary `Spec[]` keeps
 * working; the typing is additive.
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
/**
 * The build-time repeatable-bounds guard (T-1TA2): `min` / `max` are meaningful only on a
 * `repeatable: true` slot, and `min` must not exceed `max`. A violation throws
 * `contract/repeat-bounds` at construction (mirroring the key-collision throw), so a malformed
 * repeatable declaration is caught at definition time rather than as a document finding.
 */
function assertRepeatBounds(opts, label) {
    if (!opts)
        return;
    const { repeatable, min, max } = opts;
    if (repeatable !== true) {
        if (min !== undefined || max !== undefined) {
            throw new ContractBuildError("contract/repeat-bounds", `section ‘${label}’ declares min/max without ‘repeatable: true’; occurrence bounds apply only to a repeatable slot`);
        }
        return;
    }
    if (min !== undefined && (!Number.isInteger(min) || min < 0)) {
        throw new ContractBuildError("contract/repeat-bounds", `section ‘${label}’ has a non-integer or negative min ${min}`);
    }
    if (max !== undefined && (!Number.isInteger(max) || max < 0)) {
        throw new ContractBuildError("contract/repeat-bounds", `section ‘${label}’ has a non-integer or negative max ${max}`);
    }
    if (min !== undefined && max !== undefined && min > max) {
        throw new ContractBuildError("contract/repeat-bounds", `section ‘${label}’ has min ${min} greater than max ${max}`);
    }
}
/**
 * Declare a required section by name, or by an alias set (`string[]`). Generic (T-SCRB) over the
 * name(s) and the `SectionOpts` so its result carries the typed value the section's dual-key key
 * binds — a promoted `TableView<Row>` when its sole `content` is a `table(...)` leaf (the `Row`
 * derived from that table's `columns` / `cells`), else `SectionView`. Defaults keep a bare
 * `section("Name")` unchanged and assignable wherever a `Spec` is expected.
 */
export function section(name, opts) {
    const names = Array.isArray(name) ? [...name] : [name];
    assertRepeatBounds(opts, names[0] ?? "");
    const spec = { kind: "section", names, ...(opts ? { opts } : {}) };
    return spec;
}
/** Mark a `Spec` optional. */
export function optional(spec) {
    const out = { kind: "optional", spec };
    return out;
}
/** Declare a choice over interchangeable spellings at one position. */
export function oneOf(names, opts) {
    assertRepeatBounds(opts, names[0] ?? "");
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