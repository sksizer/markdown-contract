/**
 * v1 → v2 declarative-YAML codemod (D-0020).
 *
 * Transpiles mcVersion 1 contract/config documents to the mcVersion 2 JSON-Schema-idiom
 * vocabulary, preserving comments and key order via the yaml Document API. Mechanical by
 * design; the two hazard classes are handled explicitly:
 *   - required inversion: v1 implicit-required + `optional:` → v2 `required: [...]` lists;
 *   - v1 `format` short-circuit: `min`/`max`/`pattern` beside a `format` were INERT in v1
 *     but would be live in v2 — they are dropped with a warning, keeping findings identical.
 *
 * Usage: bun migrate-v1-to-v2.ts <file.yaml> [...] [--write]
 *   (prints transformed YAML to stdout per file unless --write, which edits in place)
 */
import { readFileSync, writeFileSync } from "node:fs";

import { type Document, Pair, parseDocument, Scalar, YAMLMap, YAMLSeq } from "yaml";

const LEAF_KEYS = new Set(["table", "list", "code", "maxWords"]);

interface Cx {
  doc: Document;
  file: string;
  warnings: string[];
}

const isMap = (v: unknown): v is YAMLMap => v instanceof YAMLMap;
const isSeq = (v: unknown): v is YAMLSeq => v instanceof YAMLSeq;

const keyOf = (p: Pair): string => String((p.key as Scalar).value);

function getPair(map: YAMLMap, key: string): Pair | undefined {
  return map.items.find((p) => keyOf(p) === key);
}
function has(map: YAMLMap, key: string): boolean {
  return getPair(map, key) !== undefined;
}
function scalarOf(map: YAMLMap, key: string): unknown {
  const p = getPair(map, key);
  return p && p.value instanceof Scalar ? (p.value as Scalar).value : undefined;
}
function renameKey(map: YAMLMap, from: string, to: string): void {
  const p = getPair(map, from);
  if (p) (p.key as Scalar).value = to;
}
function deleteKey(map: YAMLMap, key: string): void {
  const i = map.items.findIndex((p) => keyOf(p) === key);
  if (i >= 0) map.items.splice(i, 1);
}
/** Insert a key: value pair at a position (default: end), returning the new pair. */
function insertPair(cx: Cx, map: YAMLMap, key: string, value: unknown, at?: number): Pair {
  const pair = new Pair(new Scalar(key), cx.doc.createNode(value));
  map.items.splice(at ?? map.items.length, 0, pair);
  return pair;
}
function flowSeq(cx: Cx, values: unknown[]): YAMLSeq {
  const node = cx.doc.createNode(values) as YAMLSeq;
  node.flow = true;
  return node;
}

// ── schema nodes (frontmatter fields, table cells, list items) ──────────────────────

/** Transform one v1 schema node in place into its v2 spelling. */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one flat dispatch over the v1 schema-node type — splitting the per-type arms would obscure the 1:1 v1→v2 spelling table
function transformSchemaNode(cx: Cx, node: unknown, path: string): void {
  if (!isMap(node)) return; // malformed — leave for the compiler to reject
  const type = scalarOf(node, "type");

  if (has(node, "nullable")) {
    if (typeof type === "string") {
      // nullable: true → type: [T, "null"]
      deleteKey(node, "nullable");
      const tp = getPair(node, "type");
      if (tp) tp.value = flowSeq(cx, [type, "null"]);
    } else {
      cx.warnings.push(
        `${cx.file}: ${path}: 'nullable' on an enum/const base has no v2 spelling — migrate by hand`,
      );
    }
  }

  switch (type) {
    case "string": {
      if (has(node, "format")) {
        // v1 short-circuit: bounds/pattern beside a format were inert — drop, don't activate.
        for (const inert of ["min", "max", "pattern"]) {
          if (has(node, inert)) {
            deleteKey(node, inert);
            cx.warnings.push(
              `${cx.file}: ${path}: dropped '${inert}' (inert beside 'format' in v1; would become live in v2)`,
            );
          }
        }
      } else {
        renameKey(node, "min", "minLength");
        renameKey(node, "max", "maxLength");
      }
      break;
    }
    case "number": {
      if (scalarOf(node, "int") === true) {
        deleteKey(node, "int");
        const tp = getPair(node, "type");
        if (tp) tp.value = new Scalar("integer");
      }
      renameKey(node, "min", "minimum");
      renameKey(node, "max", "maximum");
      break;
    }
    case "array": {
      renameKey(node, "min", "minItems");
      renameKey(node, "max", "maxItems");
      renameKey(node, "of", "items");
      transformSchemaNode(cx, getPair(node, "items")?.value, `${path}.items`);
      break;
    }
    case "object":
      transformObjectSchema(cx, node, path);
      break;
    default:
      break; // enum / const / boolean bases: wrappers only
  }
}

/**
 * Transform a v1 object schema (`fields` + `strict`, implicit-required) in place into the
 * v2 spelling (`properties` + `required` list + `additionalProperties`). Also used for the
 * frontmatter root, which additionally gains its explicit `type: object`.
 */
function transformObjectSchema(cx: Cx, node: YAMLMap, path: string): void {
  const fieldsPair = getPair(node, "fields");
  const required: string[] = [];

  if (fieldsPair && isMap(fieldsPair.value)) {
    const fields = fieldsPair.value as YAMLMap;
    for (const p of fields.items) {
      const name = keyOf(p);
      const child = p.value;
      if (isMap(child) && scalarOf(child, "optional") === true) {
        deleteKey(child, "optional");
      } else {
        required.push(name);
      }
      transformSchemaNode(cx, child, `${path}.${name}`);
    }
    (fieldsPair.key as Scalar).value = "properties";
  }

  const strict = scalarOf(node, "strict") === true;
  deleteKey(node, "strict");

  // Assemble in canonical order: type, required, additionalProperties, properties.
  const typeAt = node.items.findIndex((p) => keyOf(p) === "type");
  let at = typeAt + 1;
  if (typeAt < 0) {
    insertPair(cx, node, "type", "object", 0);
    at = 1;
  }
  if (required.length > 0) {
    const p = insertPair(cx, node, "required", null, at++);
    p.value = flowSeq(cx, required);
  }
  if (strict) insertPair(cx, node, "additionalProperties", false, at);
}

// ── body grammar ─────────────────────────────────────────────────────────────────────

function transformBodyLevel(cx: Cx, level: unknown, path: string): void {
  if (!isMap(level)) return;
  renameKey(level, "allowUnknown", "additionalSections");
  const sectionsPair = getPair(level, "sections");
  if (sectionsPair && isSeq(sectionsPair.value)) {
    (sectionsPair.value as YAMLSeq).items.forEach((n, i) => {
      transformBodyNode(cx, n, `${path}.sections[${i}]`);
    });
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: the whole D-0020 occurrence matrix (optional × repeatable × min × max) reads best as one flat block beside its spec table
function transformBodyNode(cx: Cx, node: unknown, path: string): void {
  if (!isMap(node)) return;

  // Occurrence: optional / repeatable / min / max → minContains / maxContains (D-0020 matrix).
  const wasOptional = scalarOf(node, "optional") === true;
  const wasRepeatable = scalarOf(node, "repeatable") === true;
  const min = scalarOf(node, "min");
  const max = scalarOf(node, "max");
  if (wasOptional || wasRepeatable) {
    deleteKey(node, "optional");
    deleteKey(node, "repeatable");
    deleteKey(node, "min");
    deleteKey(node, "max");
    if (wasOptional && !wasRepeatable) {
      insertPair(cx, node, "minContains", 0, 1);
      insertPair(cx, node, "maxContains", 1, 2);
    } else {
      const lo = wasOptional ? 0 : typeof min === "number" ? min : 1;
      if (wasOptional && typeof min === "number" && min > 0) {
        cx.warnings.push(
          `${cx.file}: ${path}: optional+repeatable with min ${min} — v2 counted slots cannot express "absent or ≥${min}"; emitted minContains: 0`,
        );
      }
      insertPair(cx, node, "minContains", lo, 1);
      if (typeof max === "number") insertPair(cx, node, "maxContains", max, 2);
    }
  }

  // children: { … } → hoisted sections / order / additionalSections on the node itself.
  const childrenPair = getPair(node, "children");
  if (childrenPair && isMap(childrenPair.value)) {
    const children = childrenPair.value as YAMLMap;
    transformBodyLevel(cx, children, `${path}.children`);
    deleteKey(node, "children");
    for (const p of children.items) node.items.push(p);
  }

  // content leaves: list.everyItem → items; table.cells.* are schema nodes.
  const contentPair = getPair(node, "content");
  if (contentPair && isMap(contentPair.value)) {
    const content = contentPair.value as YAMLMap;
    const keys = content.items.map(keyOf);
    const leaves =
      keys.length === 1 && LEAF_KEYS.has(keys[0]!)
        ? [content] // single leaf
        : content.items.map((p) => p.value).filter(isMap); // named-leaf map
    for (const leaf of leaves) transformLeaf(cx, leaf as YAMLMap, `${path}.content`);
  }
}

function transformLeaf(cx: Cx, leaf: YAMLMap, path: string): void {
  const listPair = getPair(leaf, "list");
  if (listPair && isMap(listPair.value)) {
    const list = listPair.value as YAMLMap;
    renameKey(list, "everyItem", "items");
    const items = getPair(list, "items");
    if (items && isMap(items.value)) transformSchemaNode(cx, items.value, `${path}.list.items`);
  }
  const tablePair = getPair(leaf, "table");
  if (tablePair && isMap(tablePair.value)) {
    const cells = getPair(tablePair.value as YAMLMap, "cells");
    if (cells && isMap(cells.value)) {
      for (const p of (cells.value as YAMLMap).items) {
        transformSchemaNode(cx, p.value, `${path}.table.cells.${keyOf(p)}`);
      }
    }
  }
}

// ── documents ────────────────────────────────────────────────────────────────────────

function transformContractObject(cx: Cx, raw: YAMLMap, path: string): void {
  const fm = getPair(raw, "frontmatter");
  if (fm && isMap(fm.value)) transformObjectSchema(cx, fm.value as YAMLMap, `${path}.frontmatter`);
  const body = getPair(raw, "body");
  if (body && isMap(body.value)) transformBodyLevel(cx, body.value, `${path}.body`);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: the envelope gate + kind dispatch is one linear guard chain; extracting arms would only scatter the error messages
export function migrateText(text: string, file: string): { out: string; warnings: string[] } {
  const doc = parseDocument(text);
  const cx: Cx = { doc, file, warnings: [] };
  const root = doc.contents;
  if (!isMap(root)) throw new Error(`${file}: not a YAML mapping`);

  if (scalarOf(root, "mcVersion") !== 1) throw new Error(`${file}: not an mcVersion 1 document`);
  const vp = getPair(root, "mcVersion");
  if (vp) vp.value = new Scalar(2);

  const kind = scalarOf(root, "kind");
  if (kind === "contract") {
    transformContractObject(cx, root, "contract");
  } else if (kind === "config") {
    const rules = getPair(root, "rules");
    if (rules && isSeq(rules.value)) {
      for (const r of (rules.value as YAMLSeq).items) {
        if (!isMap(r)) continue;
        const c = getPair(r as YAMLMap, "contract");
        if (c && isMap(c.value)) transformContractObject(cx, c.value as YAMLMap, "config.rule");
      }
    }
  } else {
    throw new Error(`${file}: unknown kind ${JSON.stringify(kind)}`);
  }

  return { out: doc.toString({ lineWidth: 0 }), warnings: cx.warnings };
}

// ── CLI ──────────────────────────────────────────────────────────────────────────────

if (import.meta.main) {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const files = args.filter((a) => a !== "--write");
  for (const file of files) {
    const { out, warnings } = migrateText(readFileSync(file, "utf8"), file);
    for (const w of warnings) console.error(`warn: ${w}`);
    if (write) {
      writeFileSync(file, out);
      console.error(`migrated: ${file}`);
    } else {
      process.stdout.write(out);
    }
  }
}
