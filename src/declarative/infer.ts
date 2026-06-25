/**
 * `inferConfig` — scaffold a tight-but-accepting config from existing markdown (D-0009).
 *
 * `markdown-contract init <dir>…` infers a runnable config from the markdown already in a
 * target directory: the *tightest contract that still accepts every file in its subtree*
 * (single-contract mode), or a *meta-config across a tree* cut at a configurable `--depth`
 * (meta mode). This module is the pure pipeline behind that verb — it reads files, derives a
 * model, and serializes the would-be YAML; it never writes (the CLI owns IO) and never edits
 * the source docs (read-only on the corpus, per D-0007).
 *
 * The defining guarantee is **accept-by-construction** (D-0009 § The shape): running the
 * generated config over the corpus it was inferred from reports zero error-level findings.
 * Generalization tightens freely but never past the point where a *current* file would fail.
 *
 * The pipeline (D-0009 § The shape):
 *   discover (*.md) → parse (DocTree) → group (by dir & depth) → generalize (tightest
 *   contract that accepts all) → infer field schemas (value ladder) → emit (YAML) → self-check.
 *
 * Policy this module fixes (all from D-0009):
 *  - **Two modes.** Single contract (default; depth 0) vs meta-config (`--meta`, `--depth N`).
 *  - **Grouping** by directory at exactly depth `N`, each contract recursive over its subtree,
 *    plus an optional root contract for files directly in the run root. Contracts are
 *    uniform-depth and never nested, so globs never overlap (D-0009 § Step 2). Files stranded
 *    between the root and a depth ≥ 2 cut are *warned*, never wrapped in a nested contract.
 *  - **Sections** (D-0009 § Step 3): required = present in EVERY file; the rest emitted
 *    `optional: true`; `allowUnknown: false` when no unlisted section appeared; `order` is the
 *    strongest consistent with every file — `strict` only if every file is identical+gap-free,
 *    `recognized-relative` if files agree on relative order, else `none`.
 *  - **Frontmatter** (D-0009 § Step 3): required keys = present in every file; `strict: true`
 *    only when the key set is closed; field value types from the value ladder.
 *  - **Value ladder** (D-0009 § Step 4): const (uniform) → number → boolean → array →
 *    format (date/datetime/email/url/uuid/…) → enum (distinct ≤ 12 AND < half the files) →
 *    else string. Every rung admits every observed value.
 *  - **`--relax`** (D-0009 § Step 3/4): loosen to a permissive floor — `order: none`,
 *    `allowUnknown: true`, non-strict frontmatter, everything-non-universal optional, no enums,
 *    loosest value types.
 *  - **Naming** (D-0009 § Open questions): a contract is named after its directory's full
 *    relative-path slug (`api`, `api-v1`, `web-v1`) — inherently unique, no de-collision step.
 *
 * v1 is a producer of the C-0006 / C-0007 declarative-YAML formats and a consumer of its own
 * output (the self-check loads the scaffold back and runs it); it adds no format and no engine
 * surface (D-0009 § Consequences).
 *
 * This module implements the **single-contract core** (Phase 2) plus the full **value-type
 * ladder** (Phase 3): discovery, the body grammar (sections / order / unknown-admission), the
 * tight-but-accepting frontmatter field schemas (const / number / boolean / array / format /
 * enum / string), and YAML emission. The meta-mode directory cut lands in a following phase;
 * the interfaces (`InferOptions`, `InferredContract`, `InferResult`, `inferConfig`) are fixed
 * here and shared.
 */
import { readdirSync, readFileSync } from "node:fs";
import { basename, resolve, sep } from "node:path";

import { stringify as stringifyYaml } from "yaml";

import { parse } from "../core/index.js";
import { compileSchema } from "./schema.js";

/** Options for `inferConfig` — mirrors the `init` CLI flags (D-0009 § The CLI surface). */
export interface InferOptions {
  meta?: boolean;        // emit a meta-config across the tree (default: single contract)
  depth?: number;        // directory cut for meta mode (default 1; 0 == single contract)
  relax?: boolean;       // loosen generation toward a permissive floor
  inline?: boolean;      // single self-contained config instead of per-dir contract files
  inferBounds?: boolean; // opt into pattern / min / max inference
  include?: string[];    // glob pre-filter (relative to root), as `validate`
  exclude?: string[];
}

/**
 * One inferred contract for a directory group, in declarative-YAML OBJECT form.
 * `def` is exactly a `compileContractObject` input:
 *   { frontmatter?: { strict?: boolean; fields?: Record<string, unknown> },
 *     body?: { order?: "none"|"recognized-relative"|"strict"; allowUnknown?: boolean;
 *              sections?: Array<{ section: string; optional?: boolean }> } }
 */
export interface InferredContract {
  name: string;          // directory full-relative-path slug
  include: string[];     // rule globs, relative to the run root
  def: Record<string, unknown>;
}

export interface InferredFile { path: string; content: string; }

export interface InferResult {
  mode: "single" | "meta";
  contracts: InferredContract[];
  files: InferredFile[]; // serialized YAML to write (paths relative to the out dir)
  warnings: string[];    // e.g. files stranded above a depth>=2 cut
}

// ── Discovery & parse ────────────────────────────────────────────────────────────

/** One parsed corpus file: its path (relative, POSIX) and the two inference inputs. */
interface ParsedDoc {
  /** path relative to the run root, POSIX-separated (deterministic, sorted) */
  rel: string;
  /** top-level H2 section names, in document order */
  sections: string[];
  /** the parsed frontmatter map (an object), or `{}` when the file carries none */
  frontmatter: Record<string, unknown>;
}

/** Normalize a path to POSIX separators so globs and names read the same on every platform. */
function toPosix(p: string): string {
  return sep === "/" ? p : p.split(sep).join("/");
}

/**
 * Recursively collect every `*.md` under `root`, returned as paths relative to `root`
 * (POSIX-separated), in a deterministic order: directory entries are sorted before
 * recursion, so re-running over an unchanged corpus walks the files identically
 * (D-0009 § Idempotence). Mirrors the runner's own `walkSync` so inference sees exactly
 * the file set the self-check will route.
 */
function discover(root: string): string[] {
  const out: string[] = [];
  const recur = (absDir: string, relDir: string): void => {
    const entries = readdirSync(absDir, { withFileTypes: true });
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      const rel = relDir === "" ? entry.name : `${relDir}/${entry.name}`;
      if (entry.isDirectory()) recur(resolve(absDir, entry.name), rel);
      else if (entry.isFile() && entry.name.endsWith(".md")) out.push(rel);
    }
  };
  recur(root, "");
  return out;
}

/** Whether a parsed frontmatter value is a usable key→value map (the only inference-relevant shape). */
function asFrontmatterMap(data: unknown): Record<string, unknown> {
  return data !== null && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

/**
 * Parse one corpus file into a `ParsedDoc`. A file that fails to parse is reported by the
 * caller and skipped (it cannot constrain a contract that must accept it, D-0009 § Step 1).
 * Only the top-level H2 spine drives the contract in v1 (nested sections are recorded by the
 * projection but not consumed here, D-0009 § Out of scope).
 */
function parseDoc(root: string, rel: string): ParsedDoc {
  const tree = parse(readFileSync(resolve(root, rel), "utf8"));
  return {
    rel: toPosix(rel),
    sections: tree.root.sections.map((s) => s.name),
    frontmatter: asFrontmatterMap(tree.frontmatter?.data),
  };
}

// ── Section ordering (D-0009 § Step 3 — order) ─────────────────────────────────────

type Order = "none" | "recognized-relative" | "strict";

/**
 * The union of all observed section names, in **first-appearance order** across the docs
 * (the docs themselves are in deterministic walk order, so this is stable). This is the
 * fallback emission order for `order: none`, and the deterministic tie-break for the
 * topological sort that fixes the `recognized-relative` emission order.
 */
function sectionUnion(docs: ParsedDoc[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const doc of docs) {
    for (const name of doc.sections) {
      if (!seen.has(name)) {
        seen.add(name);
        out.push(name);
      }
    }
  }
  return out;
}

/** A section is required iff it appears in EVERY doc (D-0009 § Step 3 — sections). */
function isUniversal(name: string, docs: ParsedDoc[]): boolean {
  return docs.every((d) => d.sections.includes(name));
}

/**
 * `strict` iff every doc has the **identical, gap-free** section sequence — i.e. each doc's
 * ordered section list equals every other's (D-0009 § Step 3 — order). A doc with a
 * different subset or a different order breaks it.
 */
function allIdenticalSequences(docs: ParsedDoc[]): boolean {
  if (docs.length === 0) return false;
  const first = docs[0]!.sections;
  return docs.every(
    (d) => d.sections.length === first.length && d.sections.every((n, i) => n === first[i]),
  );
}

/**
 * Build the strict-precedence graph over section names: an edge `a → b` whenever some doc
 * places `a` immediately-or-eventually before `b`. `recognized-relative` holds iff this
 * relation is acyclic (no two docs disagree on the relative order of a shared pair); a cycle
 * is an order conflict → `order: none` (D-0009 § Step 3 — order).
 */
function precedence(docs: ParsedDoc[]): Map<string, Set<string>> {
  const edges = new Map<string, Set<string>>();
  const add = (a: string, b: string): void => {
    let set = edges.get(a);
    if (!set) edges.set(a, (set = new Set<string>()));
    set.add(b);
  };
  for (const doc of docs) {
    for (let i = 0; i < doc.sections.length; i++) {
      for (let j = i + 1; j < doc.sections.length; j++) {
        if (doc.sections[i]! !== doc.sections[j]!) add(doc.sections[i]!, doc.sections[j]!);
      }
    }
  }
  return edges;
}

/** Whether two distinct sections are ordered both ways anywhere in the corpus (an order conflict). */
function hasOrderConflict(edges: Map<string, Set<string>>): boolean {
  for (const [a, tos] of edges) {
    for (const b of tos) {
      if (edges.get(b)?.has(a)) return true;
    }
  }
  return false;
}

/**
 * Detect the strongest `order` consistent with every doc and the section list to emit in
 * that order (D-0009 § Step 3 — order). For `strict` the shared identical sequence is the
 * emission order; for `recognized-relative` a deterministic topological sort of the
 * precedence graph (ties broken by first-appearance order) gives an order that is a linear
 * extension of every doc — so the engine's recognized-relative check never fires (accept-by-
 * construction). For `none` the first-appearance union order is emitted.
 */
function detectOrder(docs: ParsedDoc[]): { order: Order; sections: string[] } {
  const union = sectionUnion(docs);

  if (allIdenticalSequences(docs)) {
    return { order: "strict", sections: docs[0]!.sections };
  }

  const edges = precedence(docs);
  if (!hasOrderConflict(edges)) {
    return { order: "recognized-relative", sections: topoSort(union, edges) };
  }

  return { order: "none", sections: union };
}

/**
 * Deterministic topological sort: emit names in first-appearance (`union`) order, but never
 * before a predecessor still unemitted. Each pass picks the earliest-by-union name whose
 * predecessors are all already emitted; the precedence graph is acyclic here (the caller
 * gates on `hasOrderConflict`), so every name is eventually emitted. The union order is the
 * tie-break, so the result is stable across runs.
 */
function topoSort(union: string[], edges: Map<string, Set<string>>): string[] {
  const out: string[] = [];
  const emitted = new Set<string>();
  const predsSatisfied = (name: string): boolean => {
    for (const [from, tos] of edges) {
      if (tos.has(name) && !emitted.has(from)) return false;
    }
    return true;
  };
  while (out.length < union.length) {
    const next = union.find((n) => !emitted.has(n) && predsSatisfied(n));
    // `next` is always defined while the graph is acyclic; guard keeps the loop total.
    if (next === undefined) {
      for (const n of union) if (!emitted.has(n)) out.push(n), emitted.add(n);
      break;
    }
    out.push(next);
    emitted.add(next);
  }
  return out;
}

// ── Frontmatter (D-0009 § Step 3 — frontmatter; Step 4 — the value-type ladder) ────

/**
 * The ordered `format` candidates the ladder auto-detects (a conservative subset of the
 * D-0008 `format` vocabulary). Each is **structurally distinctive** — a plain word or free-form
 * phrase can never accidentally match — so detecting one is a genuine signal, not a coincidence.
 * The loose D-0008 formats (`hostname`, `cuid2`, `base64`, `emoji`, …) are deliberately
 * EXCLUDED here: an ordinary token like `policy` validates as a `hostname`/`cuid2`, which would
 * mislabel a categorical or free-form field as a format. The order is most-specific-first so
 * `date` is preferred over `datetime` when both could match (D-0009 § Step 4, rung 5); a value
 * is validated through the very `compileSchema` the self-check uses, so a detected format is
 * accept-by-construction by definition.
 */
const FORMAT_CANDIDATES = [
  "date",
  "datetime",
  "time",
  "duration",
  "email",
  "url",
  "uuid",
  "ulid",
  "ipv4",
  "ipv6",
  "e164",
] as const;

/** Whether every observed string value validates against the given `format` (via the engine's own compiler). */
function allMatchFormat(values: string[], format: string): boolean {
  const schema = compileSchema({ type: "string", format });
  return values.every((v) => schema.safeParse(v).success);
}

/** A deep structural-equality check over JSON-shaped values, for the `const` (all-identical) rung. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  }
  if (a !== null && b !== null && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    return (
      ka.length === kb.length &&
      ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
    );
  }
  return false;
}

/** A schema for one rung is only valid if it admits every observed value, so YAML-typed scalars (`const`) stay JSON-shaped. */
function isScalar(v: unknown): v is string | number | boolean {
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

/**
 * Infer one field's schema from its observed values — the **tight-but-accepting value ladder**
 * (D-0009 § Step 4). For the observed values of a single frontmatter key, pick the *most
 * specific* schema that still admits *every* value, defaulting looser only when no tighter rung
 * fits — so the choice can never break accept-by-construction:
 *
 *  1. all values **identical** (a scalar) → `{ const: <value> }`;
 *  2. else all **numbers** → `{ type: number }` (`int: true` if all integers);
 *  3. else all **booleans** → `{ type: boolean }`;
 *  4. else all **arrays** → `{ type: array, of: <recursively inferred LOOSE element schema> }`;
 *  5. else all **strings matching one `format`** (most specific; `date` before `datetime`) →
 *     `{ type: string, format: <name> }`;
 *  6. else a **small closed categorical set** — ≤ 12 distinct values AND fewer than half the
 *     files — → `{ enum: [<observed values, first-appearance order>] }`;
 *  7. else → `{ type: string }`.
 *
 * `fileCount` is the group's file count (the rung-6 ratio gate). `relax` skips rung 6 so a
 * categorical field stays `{ type: string }` (D-0009 § Step 4 — `--relax` drops enums). `min` /
 * `max` / `pattern` are never inferred here (opt-in via `--infer-bounds`, a future phase), so
 * every rung stays at-or-below the accept-all bound.
 */
function inferFieldSchema(values: unknown[], fileCount: number, relax: boolean): Record<string, unknown> {
  if (values.length === 0) return { type: "string" };

  // Rung 1 — all identical (scalar) → const. Arrays/objects that happen to be identical fall
  // through to their own rung (the compiler's `const` is scalar-only), still accept-by-construction.
  const first = values[0];
  if (isScalar(first) && values.every((v) => deepEqual(v, first))) {
    return { const: first };
  }

  // Rung 2 — all numbers → number (int when every value is an integer).
  if (values.every((v) => typeof v === "number")) {
    return (values as number[]).every((n) => Number.isInteger(n))
      ? { type: "number", int: true }
      : { type: "number" };
  }

  // Rung 3 — all booleans → boolean.
  if (values.every((v) => typeof v === "boolean")) {
    return { type: "boolean" };
  }

  // Rung 4 — all arrays → array; the element schema is inferred LOOSELY over every element
  // flattened across the field (no enum — `relax`-style — and ratio'd against the element count),
  // so it admits each item the corpus actually carries.
  if (values.every((v) => Array.isArray(v))) {
    const items = (values as unknown[][]).flat();
    return { type: "array", of: inferFieldSchema(items, items.length, true) };
  }

  // Rung 5 — all strings matching one format (most specific first; validated via the engine).
  if (values.every((v) => typeof v === "string")) {
    const strings = values as string[];
    for (const format of FORMAT_CANDIDATES) {
      if (allMatchFormat(strings, format)) return { type: "string", format };
    }

    // Rung 6 — a small closed categorical set → enum (unless --relax, which keeps it a string).
    // The compiler's `enum` is strings-only; the ratio (< half the files) keeps a coincidentally
    // repetitive free-form field from enum'ing on thin evidence (D-0009 § Step 4, rung 6).
    if (!relax) {
      const distinct: string[] = [];
      const seen = new Set<string>();
      for (const s of strings) {
        if (!seen.has(s)) {
          seen.add(s);
          distinct.push(s);
        }
      }
      if (distinct.length <= 12 && distinct.length * 2 < fileCount) {
        return { enum: distinct };
      }
    }
  }

  // Rung 7 — fallback: a plain string accepts every value.
  return { type: "string" };
}

/**
 * Generalize the frontmatter plane (D-0009 § Step 3 — frontmatter). Keys in first-appearance
 * order (deterministic); required = present in EVERY doc, the rest `optional: true`. Field
 * value types come from the value-type ladder (`inferFieldSchema`), the *tightest* schema that
 * still admits every observed value. `strict: true` is always safe here: every key any doc
 * carried is listed, so the key set is closed by construction; `--relax` drops it to non-strict
 * and (via the ladder) drops categorical enums.
 */
function inferFrontmatter(docs: ParsedDoc[], relax: boolean): { strict?: boolean; fields: Record<string, unknown> } | undefined {
  const keys: string[] = [];
  const seen = new Set<string>();
  const values = new Map<string, unknown[]>();
  for (const doc of docs) {
    for (const [key, value] of Object.entries(doc.frontmatter)) {
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
        values.set(key, []);
      }
      values.get(key)!.push(value);
    }
  }
  if (keys.length === 0) return undefined;

  // The rung-6 ratio gates `enum` against the group's file count, not a field's present-count,
  // so a half-optional field doesn't enum on coincidence (D-0009 § Step 4, rung 6).
  const fileCount = docs.length;
  const fields: Record<string, unknown> = {};
  for (const key of keys) {
    const present = docs.filter((d) => key in d.frontmatter).length;
    const optional = present < docs.length;
    const schema = inferFieldSchema(values.get(key)!, fileCount, relax);
    fields[key] = optional ? { ...schema, optional: true } : schema;
  }

  // The key set is closed by construction (every observed key is listed), so strict is safe;
  // `--relax` loosens to non-strict (D-0009 § Step 3 — frontmatter; § --relax).
  return relax ? { fields } : { strict: true, fields };
}

// ── Body (D-0009 § Step 3 — sections / order / unknown) ────────────────────────────

/**
 * Generalize the body plane (D-0009 § Step 3 — sections + order + unknown admission). Lists
 * the group's complete observed section vocabulary in the detected order; required = universal,
 * the rest `optional: true`; `allowUnknown: false` (every observed section is listed, so the
 * unknown door is safe to close) — `--relax` opens it and drops order to `none`.
 */
function inferBody(docs: ParsedDoc[], relax: boolean):
  | { order: Order; allowUnknown: boolean; sections: Array<{ section: string; optional?: boolean }> }
  | undefined {
  const { order, sections } = detectOrder(docs);
  if (sections.length === 0) return undefined;

  const entries = sections.map((name) => {
    const required = isUniversal(name, docs);
    return required ? { section: name } : { section: name, optional: true };
  });

  return relax
    ? { order: "none", allowUnknown: true, sections: entries }
    : { order, allowUnknown: false, sections: entries };
}

// ── Naming & emission ──────────────────────────────────────────────────────────────

/**
 * Slugify a directory basename into a contract name (D-0009 § Naming): lower-case, runs of
 * non-alphanumerics collapse to a single `-`, leading/trailing `-` trimmed. The directory
 * path is inherently unique so there is no de-collision step; the name is just a label the
 * author can rename. A name that slugs to empty falls back to `contract`.
 */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "contract" : slug;
}

/**
 * Infer a config from the corpus under `root`. Pure: reads files, returns model + serialized
 * YAML; writes nothing. This phase implements **single-contract mode** (`opts.meta` falsy):
 * one contract over the whole subtree, the tightest shape that accepts every `*.md` under it.
 */
export function inferConfig(root: string, opts?: InferOptions): InferResult {
  const absRoot = resolve(root);
  const relax = opts?.relax === true;

  const docs = discover(absRoot).map((rel) => parseDoc(absRoot, rel));

  // Single-contract mode: the whole subtree is one group, named after the run-root basename.
  const def: Record<string, unknown> = {};
  const frontmatter = inferFrontmatter(docs, relax);
  if (frontmatter) def.frontmatter = frontmatter;
  const body = inferBody(docs, relax);
  if (body) def.body = body;

  const name = slugify(basename(absRoot));
  const contract: InferredContract = {
    name,
    include: ["**/*.md"],
    def,
  };

  const content = stringifyYaml({ mcVersion: 1, kind: "contract", ...def });
  const file: InferredFile = { path: `${name}.contract.yaml`, content };

  return {
    mode: "single",
    contracts: [contract],
    files: [file],
    warnings: [],
  };
}
