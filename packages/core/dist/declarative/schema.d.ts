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
/** Compile one schema node (the closed vocabulary) into a Zod schema. */
export declare function compileSchema(node: unknown, path?: string): z.ZodType;
/** Compile an object shape `{ <key>: <schema> }` into a (strict) Zod object — used for `type: object` and frontmatter. */
export declare function compileObjectSchema(fields: unknown, strict: boolean, path?: string): z.ZodType;
//# sourceMappingURL=schema.d.ts.map