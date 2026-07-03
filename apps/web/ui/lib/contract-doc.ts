/**
 * contract-doc — typed wrappers over the `yaml` Document API for the contract
 * editor's round-trip strategy.
 *
 * THE RULE: every form mutation goes through `Document` surgery
 * (`setIn` / `deleteIn` / `addIn` / in-place node edits) and back out via
 * `doc.toString()` — the file is NEVER rebuilt from a plain JS object, so
 * hand-written comments, key order, and constructs the form cannot represent
 * survive form edits untouched.
 *
 * Two layers live here:
 *   - READ:   pure view-model derivations over the plain-JS `doc.toJS()` root
 *             (views are derived state; the YAML buffer text stays the truth).
 *   - MUTATE: focused `(doc, …) => void` helpers, one per form gesture, that
 *             the page applies via reparse-mutate-serialize.
 */
import type { Document } from "yaml";
import { isMap, isScalar, isSeq, parseDocument } from "yaml";

import { type FieldKind, isRecord, type OrderMode } from "~/lib/contract-schema";

/** A path into the document, as `getIn`/`setIn` take it. */
export type DocPath = (string | number)[];

/** How the page hands mutation access to form components. */
export type ApplyFn = (mutate: (doc: Document) => void) => void;

/** Where a contract's frontmatter fields live. */
export const FRONTMATTER_FIELDS_PATH: DocPath = ["frontmatter", "fields"];
/** The body ROOT level (nested levels live at [...node, "children"]). */
export const BODY_PATH: DocPath = ["body"];
/** Where a config's rules live. */
export const RULES_PATH: DocPath = ["rules"];

// ── Open / serialize ─────────────────────────────────────────────────────────────

/** Parse a buffer into a Document (never throws; check `docErrorMessage`). */
export function openDoc(raw: string): Document {
  return parseDocument(raw);
}

/** The first syntax error in a parsed document, or null when it parses. */
export function docErrorMessage(doc: Document): string | null {
  return doc.errors.length > 0 ? doc.errors[0].message : null;
}

/** Serialize a (error-free) document back to the buffer text. */
export function serializeDoc(doc: Document): string {
  return doc.toString();
}

/** The plain-JS root of a document ({} for an empty or non-mapping document). */
export function rootOf(doc: Document): Record<string, unknown> {
  const js = doc.toJS();
  return isRecord(js) ? js : {};
}

/**
 * Ensure the immutable envelope exists (`mcVersion: 1` + the file's `kind`) —
 * run before form mutations so a freshly created file carries it first. Never
 * overwrites an existing value; the form never edits the envelope.
 */
export function ensureEnvelope(doc: Document, kind: "config" | "contract"): void {
  if (doc.getIn(["mcVersion"]) === undefined) doc.setIn(["mcVersion"], 1);
  if (doc.getIn(["kind"]) === undefined) doc.setIn(["kind"], kind);
}

// ── Generic mutations (shared by both forms) ─────────────────────────────────────

/** Delete a key if present (deleteIn on a missing parent would be an error). */
export function removeAt(doc: Document, path: DocPath): void {
  if (doc.hasIn(path)) doc.deleteIn(path);
}

/**
 * Replace a list of strings, keeping the existing sequence's flow/block layout.
 * New lists default to the compact flow style (e.g. a one-line glob list).
 */
export function setStringList(doc: Document, path: DocPath, values: string[]): void {
  const existing = doc.getIn(path, true);
  const node = doc.createNode(values);
  if (isSeq(node)) node.flow = !isSeq(existing) || existing.flow === true;
  doc.setIn(path, node);
}

/** A boolean toggle: on → `true`; off → the key is removed (absent = engine default). */
export function setFlag(doc: Document, path: DocPath, on: boolean): void {
  if (on) doc.setIn(path, true);
  else removeAt(doc, path);
}

/**
 * Rename one key of a mapping IN PLACE (the pair's value node — and any
 * comments hanging off it — moves untouched under the new key).
 */
export function renameMapKey(
  doc: Document,
  mapPath: DocPath,
  oldKey: string,
  newKey: string,
): void {
  if (oldKey === newKey || newKey === "") return;
  const map = doc.getIn(mapPath, true);
  if (!isMap(map)) return;
  if (map.items.some((p) => isScalar(p.key) && p.key.value === newKey)) return; // no clobber
  const pair = map.items.find((p) => isScalar(p.key) && p.key.value === oldKey);
  if (pair && isScalar(pair.key)) pair.key.value = newKey;
}

/** Move one item of a sequence (rules, a level's body sections) to a new index. */
export function moveSeqItem(doc: Document, seqPath: DocPath, from: number, to: number): void {
  const seq = doc.getIn(seqPath, true);
  if (!isSeq(seq)) return;
  if (from < 0 || from >= seq.items.length || to < 0 || to >= seq.items.length) return;
  if (from === to) return;
  const [item] = seq.items.splice(from, 1);
  seq.items.splice(to, 0, item);
}

/**
 * Move one item of a MAPPING (frontmatter fields, object sub-fields) to a new
 * index by splicing `map.items` IN PLACE: each pair's key/value nodes — and
 * the comments hanging off them — travel with the pair untouched. Indices are
 * the mapping's own item order (what `Object.entries(toJS())` yields for the
 * form's string keys).
 */
export function moveMapItem(doc: Document, mapPath: DocPath, from: number, to: number): void {
  const map = doc.getIn(mapPath, true);
  if (!isMap(map)) return;
  if (from < 0 || from >= map.items.length || to < 0 || to >= map.items.length) return;
  if (from === to) return;
  const [pair] = map.items.splice(from, 1);
  map.items.splice(to, 0, pair);
}

/** Append a node built from a plain JS value to a sequence, creating it if missing. */
function appendToSeq(doc: Document, seqPath: DocPath, value: unknown): void {
  if (!isSeq(doc.getIn(seqPath, true))) doc.setIn(seqPath, doc.createNode([]));
  doc.addIn(seqPath, doc.createNode(value));
}

// ── kind: config — READ ──────────────────────────────────────────────────────────

/** One row of the contracts registry (name → path). Non-string values lock. */
export interface ContractsEntryView {
  name: string;
  path: string;
  /** false when the value is not a plain string path (form leaves it untouched) */
  isString: boolean;
}

export function readContractsEntries(root: Record<string, unknown>): ContractsEntryView[] {
  const contracts = root.contracts;
  if (!isRecord(contracts)) return [];
  return Object.entries(contracts).map(([name, value]) => ({
    name,
    path: typeof value === "string" ? value : "",
    isString: typeof value === "string",
  }));
}

/** One routing rule as the form sees it. */
export interface RuleView {
  include: string[];
  exclude: string[];
  /** the string ref (registry name or path); null when inline/missing */
  contractRef: string | null;
  /** true when the contract is an inline mapping (form links to YAML) */
  inline: boolean;
}

export function readRules(root: Record<string, unknown>): RuleView[] {
  if (!Array.isArray(root.rules)) return [];
  return root.rules.map((rule) => {
    const r = isRecord(rule) ? rule : {};
    return {
      include: stringList(r.include),
      exclude: stringList(r.exclude),
      contractRef: typeof r.contract === "string" ? r.contract : null,
      inline: isRecord(r.contract),
    };
  });
}

function stringList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
}

// ── kind: config — MUTATE ────────────────────────────────────────────────────────

export function addContractsEntry(doc: Document, name: string, path: string): void {
  doc.setIn(["contracts", name], path);
}

export function setContractsEntryPath(doc: Document, name: string, path: string): void {
  doc.setIn(["contracts", name], path);
}

export function removeContractsEntry(doc: Document, name: string): void {
  removeAt(doc, ["contracts", name]);
}

export function addRule(doc: Document, include: string[], contractRef: string): void {
  appendToSeq(doc, RULES_PATH, { include, contract: contractRef });
}

export function removeRule(doc: Document, index: number): void {
  removeAt(doc, [...RULES_PATH, index]);
}

export function setRuleContract(doc: Document, index: number, ref: string): void {
  doc.setIn([...RULES_PATH, index, "contract"], ref);
}

/** Replace a rule's include/exclude globs; an emptied `exclude` is dropped entirely. */
export function setRuleGlobs(
  doc: Document,
  index: number,
  which: "include" | "exclude",
  globs: string[],
): void {
  const path = [...RULES_PATH, index, which];
  if (which === "exclude" && globs.length === 0) removeAt(doc, path);
  else setStringList(doc, path, globs);
}

// ── kind: contract — READ ────────────────────────────────────────────────────────

export function readStrict(root: Record<string, unknown>): boolean {
  return isRecord(root.frontmatter) && root.frontmatter.strict === true;
}

/** One frontmatter field: its key and its plain-JS schema node. */
export interface FieldView {
  key: string;
  schema: unknown;
}

export function readFields(root: Record<string, unknown>): FieldView[] {
  const fm = root.frontmatter;
  if (!isRecord(fm) || !isRecord(fm.fields)) return [];
  return Object.entries(fm.fields).map(([key, schema]) => ({ key, schema }));
}

/** body-root `requires:`/`forbids:` present — kept untouched, edit in YAML. */
export function readBodyRootRules(root: Record<string, unknown>): boolean {
  const body = root.body;
  return isRecord(body) && ("requires" in body || "forbids" in body);
}

/**
 * One nesting LEVEL of the body grammar as the form sees it — the body root
 * or a node's `children`. Levels recurse: every level carries the same knobs
 * and the same node vocabulary.
 */
export interface LevelView {
  order: OrderMode | null;
  allowUnknown: boolean;
  sections: BodyNodeView[];
}

/** One body node as the form sees it — a tagged view over section / oneOf / gap. */
export type BodyNodeView =
  | {
      type: "section";
      name: string;
      aliases: string[];
      optional: boolean;
      extras: string[];
      children: LevelView | null;
    }
  | {
      type: "oneOf";
      names: string[];
      optional: boolean;
      extras: string[];
      children: LevelView | null;
    }
  | {
      type: "gap";
      min: number | null;
      max: number | null;
      optional: boolean;
      extras: string[];
      children: null;
    }
  | { type: "unknown"; optional: boolean; extras: string[]; children: null };

/** The body ROOT level ({} for no body: empty sections, default knobs). */
export function readBodyLevel(root: Record<string, unknown>): LevelView {
  return readLevel(root.body);
}

function readLevel(value: unknown): LevelView {
  const level = isRecord(value) ? value : {};
  const order = level.order;
  return {
    order: order === "none" || order === "recognized-relative" || order === "strict" ? order : null,
    allowUnknown: level.allowUnknown === true,
    sections: Array.isArray(level.sections) ? level.sections.map((n) => readBodyNode(n)) : [],
  };
}

/**
 * A section/oneOf node's nested `children` level, or null when absent — or
 * malformed (no `sections` list), in which case it stays a passthrough chip.
 */
function readChildren(node: Record<string, unknown>): LevelView | null {
  const c = node.children;
  if (!isRecord(c) || !Array.isArray(c.sections)) return null;
  return readLevel(c);
}

function readBodyNode(node: unknown): BodyNodeView {
  if (!isRecord(node)) return { type: "unknown", optional: false, extras: [], children: null };
  const optional = node.optional === true;
  if ("section" in node) {
    const children = readChildren(node);
    return {
      type: "section",
      name: typeof node.section === "string" ? node.section : String(node.section),
      aliases: stringList(node.aliases),
      optional,
      extras: nodeExtras(node, children !== null),
      children,
    };
  }
  if ("oneOf" in node) {
    const children = readChildren(node);
    return {
      type: "oneOf",
      names: stringList(node.oneOf),
      optional,
      extras: nodeExtras(node, children !== null),
      children,
    };
  }
  if ("gap" in node) {
    const g = isRecord(node.gap) ? node.gap : {};
    return {
      type: "gap",
      min: typeof g.min === "number" ? g.min : null,
      max: typeof g.max === "number" ? g.max : null,
      optional,
      extras: nodeExtras(node, false),
      children: null,
    };
  }
  return { type: "unknown", optional, extras: nodeExtras(node, false), children: null };
}

/**
 * The untouched-passthrough keys a node carries, as chip labels linking to
 * YAML. `children` only chips when the form can't edit it (malformed, or on a
 * gap/unknown node) — an editable children level renders as a nested form.
 */
function nodeExtras(node: Record<string, unknown>, childrenEditable: boolean): string[] {
  const extras: string[] = [];
  if ("anchor" in node) extras.push("anchor");
  if ("content" in node) extras.push("content");
  if ("children" in node && !childrenEditable) extras.push("children");
  if ("requires" in node || "forbids" in node) extras.push("rules");
  return extras;
}

// ── kind: contract — MUTATE (frontmatter) ────────────────────────────────────────

export function setFrontmatterStrict(doc: Document, on: boolean): void {
  setFlag(doc, ["frontmatter", "strict"], on);
}

/** Add a field (or object sub-field) as a compact `{ type: string }` starter. */
export function addField(doc: Document, mapPath: DocPath, key: string): void {
  const node = doc.createNode({ type: "string" });
  if (isMap(node)) node.flow = true;
  doc.setIn([...mapPath, key], node);
}

/** Set/replace one schema-node property; `undefined` removes it. Lists keep layout. */
export function setSchemaProp(
  doc: Document,
  nodePath: DocPath,
  prop: string,
  value: string | number | boolean | string[] | undefined,
): void {
  const path = [...nodePath, prop];
  if (value === undefined) removeAt(doc, path);
  else if (Array.isArray(value)) setStringList(doc, path, value);
  else doc.setIn(path, value);
}

/** A schema-node boolean (optional / nullable / int / strict): true or absent. */
export function setSchemaFlag(doc: Document, nodePath: DocPath, prop: string, on: boolean): void {
  setFlag(doc, [...nodePath, prop], on);
}

/**
 * Switch a schema node's discriminant kind. Only the previous discriminant and
 * its now-meaningless companions are removed; wrappers (`optional`/`nullable`)
 * and unrelated keys are left alone.
 */
export function setSchemaKind(doc: Document, nodePath: DocPath, kind: FieldKind): void {
  if (!isMap(doc.getIn(nodePath, true))) doc.setIn(nodePath, doc.createNode({}));
  const del = (...keys: string[]): void => {
    for (const key of keys) removeAt(doc, [...nodePath, key]);
  };
  switch (kind) {
    case "string":
      del("enum", "const", "of", "fields", "strict", "int");
      doc.setIn([...nodePath, "type"], "string");
      break;
    case "number":
      del("enum", "const", "of", "fields", "strict", "format", "pattern");
      doc.setIn([...nodePath, "type"], "number");
      break;
    case "boolean":
      del("enum", "const", "of", "fields", "strict", "format", "pattern", "min", "max", "int");
      doc.setIn([...nodePath, "type"], "boolean");
      break;
    case "enum":
      del("type", "const", "of", "fields", "strict", "format", "pattern", "min", "max", "int");
      if (!isSeq(doc.getIn([...nodePath, "enum"], true)))
        setStringList(doc, [...nodePath, "enum"], []);
      break;
    case "const":
      del("type", "enum", "of", "fields", "strict", "format", "pattern", "min", "max", "int");
      if (doc.getIn([...nodePath, "const"]) === undefined) doc.setIn([...nodePath, "const"], "");
      break;
    case "array": {
      del("enum", "const", "fields", "strict", "format", "pattern", "int");
      doc.setIn([...nodePath, "type"], "array");
      if (!isMap(doc.getIn([...nodePath, "of"], true))) {
        const of = doc.createNode({ type: "string" });
        if (isMap(of)) of.flow = true;
        doc.setIn([...nodePath, "of"], of);
      }
      break;
    }
    case "object":
      del("enum", "const", "of", "format", "pattern", "min", "max", "int");
      doc.setIn([...nodePath, "type"], "object");
      if (!isMap(doc.getIn([...nodePath, "fields"], true)))
        doc.setIn([...nodePath, "fields"], doc.createNode({}));
      break;
  }
}

// ── kind: contract — MUTATE (body) ───────────────────────────────────────────────
//
// Every helper takes the LEVEL it operates on: `levelPath` is the level
// mapping (BODY_PATH at the root, [...nodePath, "children"] below);
// `sectionsPath` is that level's sections sequence ([...levelPath, "sections"]).

/** A level's `order` select: a mode sets it, null (engine default) removes the key. */
export function setLevelOrder(doc: Document, levelPath: DocPath, order: OrderMode | null): void {
  if (order === null) removeAt(doc, [...levelPath, "order"]);
  else doc.setIn([...levelPath, "order"], order);
}

export function setLevelAllowUnknown(doc: Document, levelPath: DocPath, on: boolean): void {
  setFlag(doc, [...levelPath, "allowUnknown"], on);
}

export function addBodySection(doc: Document, sectionsPath: DocPath, name: string): void {
  appendToSeq(doc, sectionsPath, { section: name });
}

export function addBodyOneOf(doc: Document, sectionsPath: DocPath): void {
  appendToSeq(doc, sectionsPath, { oneOf: [] });
}

export function removeBodyNode(doc: Document, sectionsPath: DocPath, index: number): void {
  removeAt(doc, [...sectionsPath, index]);
}

export function setSectionName(
  doc: Document,
  sectionsPath: DocPath,
  index: number,
  name: string,
): void {
  doc.setIn([...sectionsPath, index, "section"], name);
}

export function setSectionAliases(
  doc: Document,
  sectionsPath: DocPath,
  index: number,
  aliases: string[],
): void {
  const path = [...sectionsPath, index, "aliases"];
  if (aliases.length === 0) removeAt(doc, path);
  else setStringList(doc, path, aliases);
}

export function setOneOfNames(
  doc: Document,
  sectionsPath: DocPath,
  index: number,
  names: string[],
): void {
  setStringList(doc, [...sectionsPath, index, "oneOf"], names);
}

export function setNodeOptional(
  doc: Document,
  sectionsPath: DocPath,
  index: number,
  on: boolean,
): void {
  setFlag(doc, [...sectionsPath, index, "optional"], on);
}

/** Set/clear a gap bound; a bare `gap:` (null value) is upgraded to a mapping first. */
export function setGapBound(
  doc: Document,
  sectionsPath: DocPath,
  index: number,
  bound: "min" | "max",
  value: number | undefined,
): void {
  const gapPath = [...sectionsPath, index, "gap"];
  if (!isMap(doc.getIn(gapPath, true))) doc.setIn(gapPath, doc.createNode({}));
  const path = [...gapPath, bound];
  if (value === undefined) removeAt(doc, path);
  else doc.setIn(path, value);
}

/**
 * Grow a nested level under a section/oneOf node: `children: { sections: [] }`
 * — LAZILY (never overwrites an existing `children`, and writes no `order` /
 * `allowUnknown` keys until the user sets them).
 */
export function ensureChildren(doc: Document, nodePath: DocPath): void {
  const path = [...nodePath, "children"];
  if (doc.hasIn(path)) return;
  doc.setIn(path, doc.createNode({ sections: [] }));
}

// ── Starter template ─────────────────────────────────────────────────────────────

/**
 * The minimal router the "Start from a template" action loads into the buffer:
 * envelope + one catch-all rule with a small inline contract. Deliberately
 * carries comments — they must survive form edits (the round-trip guarantee).
 */
export const STARTER_CONFIG_YAML = `# markdown-contract router — maps files to contracts (kind: config).
mcVersion: 1
kind: config

# Named contracts (name → *.contract.yaml path). Fill this in as rules grow
# their own contract files.
contracts: {}

rules:
  # Every markdown file gets a small inline starter contract. Move it into a
  # *.contract.yaml file and reference it here when it grows.
  - include: ["**/*.md"]
    contract:
      frontmatter:
        fields:
          title: { type: string }
`;
