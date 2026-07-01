/**
 * The body-grammar + content-leaf compiler — the v1 YAML body DSL → the engine combinators
 * (D-0008 § Body grammar / § Content leaves).
 *
 * A `body:` mapping becomes `sections(opts, specs)`; each node becomes `section` / `oneOf` /
 * `gap` (wrapped in `optional()` when flagged), with nested `children` recursing and a
 * `content` leaf (or a named-leaf record) compiled to `table` / `list` / `code` / `maxWords`.
 * Table `cells` and list `everyItem` schemas reuse the closed-vocabulary compiler. Cross-cutting
 * `rule` / `docRule`s are not expressible in v1 (deferred, D-0008 § Out of scope).
 */
import { gap, oneOf, optional, section, sections } from "../core/grammar.js";
import { code, list, maxWords, table } from "../core/leaves.js";
import type { LeafSpec, LevelOpts, SectionOpts, SectionSeq, Spec, ZodType } from "../core/types.js";
import { DeclarativeError } from "./errors.js";
import { compileSchema } from "./schema.js";
import { compileSectionTextRules, hasTextKeys } from "./text.js";

const LEAF_KEYS = new Set(["table", "list", "code", "maxWords"]);

const isMap = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);

/** Compile a `body:` mapping into a `sections(opts, specs)` body grammar. */
export function compileBody(node: unknown, path = "body"): SectionSeq {
  return compileLevel(node, path);
}

function compileLevel(node: unknown, path: string): SectionSeq {
  if (!isMap(node)) {
    throw new DeclarativeError(`${path}: must be a mapping with a 'sections' list`);
  }
  const opts: LevelOpts = {};
  if ("order" in node) {
    if (node.order !== "none" && node.order !== "recognized-relative" && node.order !== "strict") {
      throw new DeclarativeError(`${path}.order must be none | recognized-relative | strict (got ${JSON.stringify(node.order)})`);
    }
    opts.order = node.order;
  }
  if ("allowUnknown" in node) {
    if (typeof node.allowUnknown !== "boolean") {
      throw new DeclarativeError(`${path}.allowUnknown must be a boolean`);
    }
    opts.allowUnknown = node.allowUnknown;
  }
  if (!Array.isArray(node.sections)) {
    throw new DeclarativeError(`${path}.sections must be a list of nodes`);
  }
  const specs = node.sections.map((n, i) => compileNode(n, `${path}.sections[${i}]`));
  return sections(opts, specs);
}

function compileNode(node: unknown, path: string): Spec {
  if (!isMap(node)) {
    throw new DeclarativeError(`${path}: a body node must be a mapping (section / oneOf / gap)`);
  }
  const isOptional = node.optional === true;
  let spec: Spec;

  if ("oneOf" in node) {
    const names = node.oneOf;
    if (!Array.isArray(names) || names.length === 0 || !names.every((s) => typeof s === "string")) {
      throw new DeclarativeError(`${path}.oneOf must be a non-empty list of section names`);
    }
    spec = oneOf(names as string[], sectionOpts(node, path));
  } else if ("gap" in node) {
    const g = node.gap;
    spec = gap(isMap(g) ? { min: num(g.min), max: num(g.max) } : {});
  } else if ("section" in node) {
    const name = node.section;
    if (typeof name !== "string") {
      throw new DeclarativeError(`${path}.section must be a heading name (string)`);
    }
    const aliases = node.aliases;
    if (aliases !== undefined && (!Array.isArray(aliases) || !aliases.every((s) => typeof s === "string"))) {
      throw new DeclarativeError(`${path}.aliases must be a list of alias spellings`);
    }
    const names = Array.isArray(aliases) ? [name, ...(aliases as string[])] : name;
    spec = section(names, sectionOpts(node, path));
  } else {
    throw new DeclarativeError(`${path}: a body node needs one of section / oneOf / gap`);
  }

  return isOptional ? optional(spec) : spec;
}

function sectionOpts(node: Record<string, unknown>, path: string): SectionOpts | undefined {
  const opts: SectionOpts = {};
  let any = false;
  if ("anchor" in node) {
    opts.anchor = String(node.anchor);
    any = true;
  }
  if ("content" in node) {
    opts.content = compileContent(node.content, `${path}.content`);
    any = true;
  }
  if ("children" in node) {
    opts.children = compileLevel(node.children, `${path}.children`);
    any = true;
  }
  // `requires:` / `forbids:` on a section node → node-local rules over that section's subtree
  // (D-0011 § Match scope). Compiled (and consistency-checked) even when a list is empty.
  if (hasTextKeys(node)) {
    const label = typeof node.section === "string" ? node.section : path;
    const rules = compileSectionTextRules(node, path, label);
    if (rules.length > 0) {
      opts.rules = rules;
      any = true;
    }
  }
  return any ? opts : undefined;
}

function isLeafMap(v: unknown): v is Record<string, unknown> {
  return isMap(v) && Object.keys(v).length === 1 && LEAF_KEYS.has(Object.keys(v)[0]!);
}

function compileContent(content: unknown, path: string): LeafSpec | Record<string, LeafSpec> {
  if (!isMap(content)) {
    throw new DeclarativeError(`${path}: must be a leaf (table/list/code/maxWords) or a named-leaf map`);
  }
  if (isLeafMap(content)) return compileLeaf(content, path);
  // A record of `^anchor`-named leaves.
  const rec: Record<string, LeafSpec> = {};
  for (const [name, leaf] of Object.entries(content)) {
    rec[name] = compileLeaf(leaf, `${path}.${name}`);
  }
  return rec;
}

function compileLeaf(node: unknown, path: string): LeafSpec {
  if (!isMap(node) || Object.keys(node).length !== 1) {
    throw new DeclarativeError(`${path}: a leaf must be a single-key mapping (table | list | code | maxWords)`);
  }
  const key = Object.keys(node)[0]!;
  const cfg = node[key];
  switch (key) {
    case "maxWords": {
      if (typeof cfg !== "number") throw new DeclarativeError(`${path}.maxWords must be a number`);
      return maxWords(cfg);
    }
    case "code": {
      const lang = isMap(cfg) && typeof cfg.lang === "string" ? cfg.lang : undefined;
      return code(lang !== undefined ? { lang } : {});
    }
    case "table":
      return table(tableConfig(cfg, path));
    case "list":
      return list(listConfig(cfg, path));
    default:
      throw new DeclarativeError(`${path}: unknown leaf '${key}'`);
  }
}

function tableConfig(
  cfg: unknown,
  path: string,
): { columns: string[]; anchor?: string; minRows?: number; cells?: Record<string, ZodType>; extraColumns?: "ignore" | "error" } {
  if (!isMap(cfg)) throw new DeclarativeError(`${path}.table must be a mapping`);
  if (!Array.isArray(cfg.columns) || !cfg.columns.every((c) => typeof c === "string")) {
    throw new DeclarativeError(`${path}.table.columns must be a list of column names`);
  }
  const out: { columns: string[]; anchor?: string; minRows?: number; cells?: Record<string, ZodType>; extraColumns?: "ignore" | "error" } = {
    columns: cfg.columns as string[],
  };
  if ("anchor" in cfg) out.anchor = String(cfg.anchor);
  if (typeof cfg.minRows === "number") out.minRows = cfg.minRows;
  if (cfg.extraColumns === "ignore" || cfg.extraColumns === "error") out.extraColumns = cfg.extraColumns;
  if ("cells" in cfg) {
    if (!isMap(cfg.cells)) throw new DeclarativeError(`${path}.table.cells must be a mapping of column → schema`);
    const cells: Record<string, ZodType> = {};
    for (const [col, schema] of Object.entries(cfg.cells)) {
      cells[col] = compileSchema(schema, `${path}.table.cells.${col}`);
    }
    out.cells = cells;
  }
  return out;
}

function listConfig(
  cfg: unknown,
  path: string,
): { ordered?: boolean; everyItem?: "checkbox" | ZodType; minItems?: number } {
  if (!isMap(cfg)) throw new DeclarativeError(`${path}.list must be a mapping`);
  const out: { ordered?: boolean; everyItem?: "checkbox" | ZodType; minItems?: number } = {};
  if (typeof cfg.ordered === "boolean") out.ordered = cfg.ordered;
  if (typeof cfg.minItems === "number") out.minItems = cfg.minItems;
  if ("everyItem" in cfg) {
    out.everyItem = cfg.everyItem === "checkbox" ? "checkbox" : compileSchema(cfg.everyItem, `${path}.list.everyItem`);
  }
  return out;
}
