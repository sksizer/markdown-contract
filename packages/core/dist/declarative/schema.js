/**
 * The schema-DSL → Zod compiler — the v1 "closed vocabulary" (D-0008 § Schema vocabulary).
 *
 * A field / table-cell / list-item schema is a YAML mapping; this compiles it into the
 * equivalent Zod schema the engine already runs, so a YAML-authored contract produces the
 * same `frontmatter/*` and `content/*` findings as the combinator-authored one. The vocabulary
 * is deliberately finite: `type` (string/number/boolean/array/object), `enum`, `const`, with
 * `min` / `max` / `pattern` / `format` / `int` constraints and `optional` / `default` /
 * `nullable` wrappers. Anything richer (`.refine()`, a custom function) is the deferred code
 * escape hatch — `$ref` — which is NOT part of v1 and throws here.
 */
import { z } from "zod";
import { DeclarativeError } from "./errors.js";
const describe = (v) => v === null ? "null" : Array.isArray(v) ? "a list" : typeof v;
/** A number-or-`undefined` reader for the optional `min` / `max` bound knobs. */
const num = (v) => (typeof v === "number" ? v : undefined);
/**
 * The closed `format` vocabulary (D-0008 § Schema vocabulary): the string formats Zod and
 * JSON Schema both expose out of the box, each mapped to its Zod constructor. Deliberately
 * broad so common shapes never fall back to a hand-written `pattern`; anything outside the
 * set is a `pattern` (or the deferred `$ref`).
 */
const STRING_FORMATS = {
    // web / identity
    email: () => z.email(),
    url: () => z.url(),
    uuid: () => z.uuid(),
    hostname: () => z.hostname(),
    // ISO-8601 temporals
    datetime: () => z.iso.datetime(),
    date: () => z.iso.date(),
    time: () => z.iso.time(),
    duration: () => z.iso.duration(),
    // network
    ipv4: () => z.ipv4(),
    ipv6: () => z.ipv6(),
    cidrv4: () => z.cidrv4(),
    cidrv6: () => z.cidrv6(),
    // id forms
    nanoid: () => z.nanoid(),
    cuid: () => z.cuid(),
    cuid2: () => z.cuid2(),
    ulid: () => z.ulid(),
    // misc
    base64: () => z.base64(),
    emoji: () => z.emoji(),
    e164: () => z.e164(),
};
/** Compile one schema node (the closed vocabulary) into a Zod schema. */
export function compileSchema(node, path = "schema") {
    if (node === null || typeof node !== "object" || Array.isArray(node)) {
        throw new DeclarativeError(`${path}: a schema must be a mapping (got ${describe(node)})`);
    }
    const n = node;
    if ("$ref" in n) {
        throw new DeclarativeError(`${path}: the code escape hatch ($ref) is deferred and not supported in v1 (see D-0008 § Out of scope)`);
    }
    let schema = base(n, path);
    // Wrappers, applied outermost-last so a field can be e.g. nullable + default + optional.
    if (n.nullable === true)
        schema = schema.nullable();
    if ("default" in n)
        schema = schema.default(n.default);
    if (n.optional === true)
        schema = schema.optional();
    return schema;
}
/** Compile an object shape `{ <key>: <schema> }` into a (strict) Zod object — used for `type: object` and frontmatter. */
export function compileObjectSchema(fields, strict, path = "schema") {
    if (fields === null || typeof fields !== "object" || Array.isArray(fields)) {
        throw new DeclarativeError(`${path}: fields must be a mapping of key → schema (got ${describe(fields)})`);
    }
    const shape = {};
    for (const [key, value] of Object.entries(fields)) {
        shape[key] = compileSchema(value, `${path}.${key}`);
    }
    return strict ? z.strictObject(shape) : z.object(shape);
}
/** The un-wrapped base schema — exactly one of enum / const / type. */
function base(n, path) {
    if ("enum" in n) {
        const values = n.enum;
        if (!Array.isArray(values) ||
            values.length === 0 ||
            !values.every((v) => typeof v === "string")) {
            throw new DeclarativeError(`${path}: enum must be a non-empty list of strings`);
        }
        return z.enum(values);
    }
    if ("const" in n) {
        return z.literal(n.const);
    }
    if ("type" in n) {
        return typed(n, path);
    }
    throw new DeclarativeError(`${path}: a schema needs one of type / enum / const`);
}
function typed(n, path) {
    switch (n.type) {
        case "string":
            return stringSchema(n, path);
        case "number":
            return numberSchema(n);
        case "boolean":
            return z.boolean();
        case "array":
            return arraySchema(n, path);
        case "object":
            return compileObjectSchema(n.fields, n.strict === true, path);
        default:
            throw new DeclarativeError(`${path}: unsupported type '${String(n.type)}' (string | number | boolean | array | object)`);
    }
}
/** `type: string` — a named `format`, else a plain string with optional `min` / `max` / `pattern`. */
function stringSchema(n, path) {
    if (typeof n.format === "string") {
        const make = STRING_FORMATS[n.format];
        if (!make) {
            throw new DeclarativeError(`${path}: unsupported string format '${n.format}' (expected one of: ${Object.keys(STRING_FORMATS).join(", ")})`);
        }
        return make();
    }
    let s = z.string();
    const min = num(n.min);
    const max = num(n.max);
    if (min !== undefined)
        s = s.min(min);
    if (max !== undefined)
        s = s.max(max);
    if (typeof n.pattern === "string")
        s = s.regex(new RegExp(n.pattern));
    return s;
}
/** `type: number` — an integer (`int: true`) or float, with optional `min` / `max`. */
function numberSchema(n) {
    let s = n.int === true ? z.int() : z.number();
    const min = num(n.min);
    const max = num(n.max);
    if (min !== undefined)
        s = s.min(min);
    if (max !== undefined)
        s = s.max(max);
    return s;
}
/** `type: array` — an `of` element schema, with optional `min` / `max` length bounds. */
function arraySchema(n, path) {
    if (!("of" in n))
        throw new DeclarativeError(`${path}: an array schema needs an 'of' element schema`);
    let s = z.array(compileSchema(n.of, `${path}[]`));
    const min = num(n.min);
    const max = num(n.max);
    if (min !== undefined)
        s = s.min(min);
    if (max !== undefined)
        s = s.max(max);
    return s;
}
//# sourceMappingURL=schema.js.map