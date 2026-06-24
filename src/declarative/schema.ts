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

const describe = (v: unknown): string =>
  v === null ? "null" : Array.isArray(v) ? "a list" : typeof v;

/** Compile one schema node (the closed vocabulary) into a Zod schema. */
export function compileSchema(node: unknown, path = "schema"): z.ZodType {
  if (node === null || typeof node !== "object" || Array.isArray(node)) {
    throw new DeclarativeError(`${path}: a schema must be a mapping (got ${describe(node)})`);
  }
  const n = node as Record<string, unknown>;

  if ("$ref" in n) {
    throw new DeclarativeError(
      `${path}: the code escape hatch ($ref) is deferred and not supported in v1 (see D-0008 § Out of scope)`,
    );
  }

  let schema: z.ZodType = base(n, path);

  // Wrappers, applied outermost-last so a field can be e.g. nullable + default + optional.
  if (n.nullable === true) schema = schema.nullable();
  if ("default" in n) schema = schema.default(n.default as never);
  if (n.optional === true) schema = schema.optional();

  return schema;
}

/** Compile an object shape `{ <key>: <schema> }` into a (strict) Zod object — used for `type: object` and frontmatter. */
export function compileObjectSchema(
  fields: unknown,
  strict: boolean,
  path = "schema",
): z.ZodType {
  if (fields === null || typeof fields !== "object" || Array.isArray(fields)) {
    throw new DeclarativeError(`${path}: fields must be a mapping of key → schema (got ${describe(fields)})`);
  }
  const shape: Record<string, z.ZodType> = {};
  for (const [key, value] of Object.entries(fields as Record<string, unknown>)) {
    shape[key] = compileSchema(value, `${path}.${key}`);
  }
  return strict ? z.strictObject(shape) : z.object(shape);
}

/** The un-wrapped base schema — exactly one of enum / const / type. */
function base(n: Record<string, unknown>, path: string): z.ZodType {
  if ("enum" in n) {
    const values = n.enum;
    if (!Array.isArray(values) || values.length === 0 || !values.every((v) => typeof v === "string")) {
      throw new DeclarativeError(`${path}: enum must be a non-empty list of strings`);
    }
    return z.enum(values as [string, ...string[]]);
  }
  if ("const" in n) {
    return z.literal(n.const as string | number | boolean);
  }
  if ("type" in n) {
    return typed(n, path);
  }
  throw new DeclarativeError(`${path}: a schema needs one of type / enum / const`);
}

function typed(n: Record<string, unknown>, path: string): z.ZodType {
  const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
  switch (n.type) {
    case "string": {
      if (typeof n.format === "string") {
        if (n.format === "email") return z.email();
        if (n.format === "url") return z.url();
        if (n.format === "uuid") return z.uuid();
        throw new DeclarativeError(`${path}: unsupported string format '${n.format}' (email | url | uuid)`);
      }
      let s = z.string();
      const min = num(n.min);
      const max = num(n.max);
      if (min !== undefined) s = s.min(min);
      if (max !== undefined) s = s.max(max);
      if (typeof n.pattern === "string") s = s.regex(new RegExp(n.pattern));
      return s;
    }
    case "number": {
      let s = n.int === true ? z.int() : z.number();
      const min = num(n.min);
      const max = num(n.max);
      if (min !== undefined) s = s.min(min);
      if (max !== undefined) s = s.max(max);
      return s;
    }
    case "boolean":
      return z.boolean();
    case "array": {
      if (!("of" in n)) throw new DeclarativeError(`${path}: an array schema needs an 'of' element schema`);
      let s = z.array(compileSchema(n.of, `${path}[]`));
      const min = num(n.min);
      const max = num(n.max);
      if (min !== undefined) s = s.min(min);
      if (max !== undefined) s = s.max(max);
      return s;
    }
    case "object":
      return compileObjectSchema(n.fields, n.strict === true, path);
    default:
      throw new DeclarativeError(
        `${path}: unsupported type '${String(n.type)}' (string | number | boolean | array | object)`,
      );
  }
}
