/**
 * contract-schema — the engine's closed declarative vocabularies, MIRRORED as data.
 *
 * The SPA never imports the core engine; these finite, stable vocabularies are
 * hand-mirrored from the source of truth in
 * `packages/core/src/declarative/{schema,body,text,config}.ts` (D-0008 / D-0011).
 * Alongside the vocabularies live the tiny pure helpers the form editor needs:
 * classifying a plain-JS schema node as form-representable (vs "complex — edit
 * in YAML"), a compact human summary for locked rows, and scalar coercion for
 * `const` values typed into a text input.
 */

// ── Closed vocabularies (mirror, do not import core) ────────────────────────────

/** The closed string `format` vocabulary (declarative/schema.ts STRING_FORMATS). */
export const STRING_FORMATS = [
  // web / identity
  "email",
  "url",
  "uuid",
  "hostname",
  // ISO-8601 temporals
  "datetime",
  "date",
  "time",
  "duration",
  // network
  "ipv4",
  "ipv6",
  "cidrv4",
  "cidrv6",
  // id forms
  "nanoid",
  "cuid",
  "cuid2",
  "ulid",
  // misc
  "base64",
  "emoji",
  "e164",
] as const;
export type StringFormat = (typeof STRING_FORMATS)[number];

/** The `type` discriminant values a schema node may carry. */
export const SCHEMA_TYPES = ["string", "number", "boolean", "array", "object"] as const;
export type SchemaType = (typeof SCHEMA_TYPES)[number];

/** The body-level `order` modes (declarative/body.ts). */
export const ORDER_MODES = ["none", "recognized-relative", "strict"] as const;
export type OrderMode = (typeof ORDER_MODES)[number];

/**
 * The form's field-kind axis: the schema node's discriminant, exactly one of
 * `type` (5 values) / `enum` / `const` — flattened into one select.
 */
export const FIELD_KINDS = [
  "string",
  "number",
  "boolean",
  "enum",
  "const",
  "array",
  "object",
] as const;
export type FieldKind = (typeof FIELD_KINDS)[number];

/** The kinds a nested position (array `of`, object sub-field) may hold in the form. */
export const SCALAR_FIELD_KINDS: readonly FieldKind[] = [
  "string",
  "number",
  "boolean",
  "enum",
  "const",
];

// ── Tiny pure helpers ────────────────────────────────────────────────────────────

/** Plain-object guard (a YAML mapping after `toJS()`). */
export function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** The discriminant kind of a plain-JS schema node, or null when unrecognizable. */
export function schemaKindOf(node: unknown): FieldKind | null {
  if (!isRecord(node)) return null;
  if ("enum" in node) return "enum";
  if ("const" in node) return "const";
  const t = node.type;
  if (t === "string" || t === "number" || t === "boolean" || t === "array" || t === "object") {
    return t;
  }
  return null;
}

/** Whether a kind is scalar enough for a nested position (array `of` / object sub-field). */
export function isScalarKind(kind: FieldKind | null): boolean {
  return kind !== null && SCALAR_FIELD_KINDS.includes(kind);
}

/**
 * The verdict on one schema node: can the form fully represent it, or must it
 * render as a locked "complex — edit in YAML" row whose data is never touched?
 */
export interface SchemaClassification {
  kind: FieldKind | null;
  representable: boolean;
  /** why not, when `representable` is false ("" otherwise) */
  reason: string;
  /** compact human summary for locked rows, e.g. "array of object" */
  summary: string;
}

/**
 * Classify a plain-JS schema node for the form. NOT representable: `$ref`,
 * `default`, malformed nodes, array-of-collection, and object fields nested
 * deeper than one level — those rows lock and pass through untouched.
 */
export function classifySchema(node: unknown): SchemaClassification {
  const inner = classifyAt(node, 0);
  return { ...inner, summary: summarizeSchema(node) };
}

function classifyAt(
  node: unknown,
  depth: number,
): { kind: FieldKind | null; representable: boolean; reason: string } {
  if (!isRecord(node)) {
    return { kind: null, representable: false, reason: "not a schema mapping" };
  }
  if ("$ref" in node) {
    return { kind: schemaKindOf(node), representable: false, reason: "uses the $ref escape hatch" };
  }
  if ("default" in node) {
    return { kind: schemaKindOf(node), representable: false, reason: "carries a default value" };
  }
  const kind = schemaKindOf(node);
  switch (kind) {
    case null:
      return { kind, representable: false, reason: "no type / enum / const discriminant" };
    case "enum": {
      const ok = Array.isArray(node.enum) && node.enum.every((v) => typeof v === "string");
      return { kind, representable: ok, reason: ok ? "" : "malformed enum values" };
    }
    case "const": {
      const t = typeof node.const;
      const ok = t === "string" || t === "number" || t === "boolean";
      return { kind, representable: ok, reason: ok ? "" : "non-scalar const value" };
    }
    case "array":
      return classifyArray(node, kind, depth);
    case "object":
      return classifyObject(node, kind, depth);
    default:
      // string / number / boolean — always representable
      return { kind, representable: true, reason: "" };
  }
}

function classifyArray(
  node: Record<string, unknown>,
  kind: FieldKind,
  depth: number,
): { kind: FieldKind; representable: boolean; reason: string } {
  if (depth > 0) return { kind, representable: false, reason: "array nested too deeply" };
  if (!("of" in node))
    return { kind, representable: false, reason: "array without an 'of' schema" };
  const sub = classifyAt(node.of, depth + 1);
  if (!sub.representable || !isScalarKind(sub.kind)) {
    return { kind, representable: false, reason: `array of ${sub.kind ?? "unknown"}` };
  }
  return { kind, representable: true, reason: "" };
}

function classifyObject(
  node: Record<string, unknown>,
  kind: FieldKind,
  depth: number,
): { kind: FieldKind; representable: boolean; reason: string } {
  if (depth > 0) return { kind, representable: false, reason: "nested object fields" };
  const fields = node.fields ?? {};
  if (!isRecord(fields)) return { kind, representable: false, reason: "malformed fields map" };
  for (const value of Object.values(fields)) {
    const sub = classifyAt(value, depth + 1);
    if (!sub.representable || !isScalarKind(sub.kind)) {
      return { kind, representable: false, reason: "nested object fields" };
    }
  }
  return { kind, representable: true, reason: "" };
}

/** A compact, human summary of a schema node ("string · email", "array of enum", …). */
export function summarizeSchema(node: unknown): string {
  if (!isRecord(node)) return "invalid schema";
  if ("$ref" in node) return "$ref";
  switch (schemaKindOf(node)) {
    case "enum": {
      const values = Array.isArray(node.enum) ? node.enum.map(String) : [];
      const head = values.slice(0, 3).join(" | ");
      return `enum [${head}${values.length > 3 ? " | …" : ""}]`;
    }
    case "const":
      return `const ${JSON.stringify(node.const)}`;
    case "string":
      return typeof node.format === "string" ? `string · ${node.format}` : "string";
    case "number":
      return node.int === true ? "int" : "number";
    case "boolean":
      return "boolean";
    case "array":
      return `array of ${summarizeSchema(node.of)}`;
    case "object": {
      const count = isRecord(node.fields) ? Object.keys(node.fields).length : 0;
      return `object · ${count} field${count === 1 ? "" : "s"}`;
    }
    default:
      return "unknown";
  }
}

/**
 * Coerce a text-input value to the YAML scalar a `const` should hold:
 * "true"/"false" → boolean, numeric text → number, anything else → string.
 */
export function coerceScalar(text: string): string | number | boolean {
  const t = text.trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if (t !== "" && !Number.isNaN(Number(t))) return Number(t);
  return text;
}

/** In v1 a string contract ref must be a .yaml/.yml file (declarative/config.ts). */
export function isYamlContractRef(ref: string): boolean {
  return /\.ya?ml$/i.test(ref);
}
