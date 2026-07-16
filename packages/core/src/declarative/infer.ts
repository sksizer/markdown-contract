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
 *  - **Sections** (D-0009 § Step 3): required = present in EVERY file; the rest emitted as
 *    counted slots (`minContains: 0` + `maxContains: 1`, D-0020); `additionalSections: false`
 *    when no unlisted section appeared; `order` is the strongest consistent with every file —
 *    `strict` only if every file is identical+gap-free, `recognized-relative` if files agree
 *    on relative order, else `none`.
 *  - **Frontmatter** (D-0009 § Step 3): a v2 object schema node — `required` lists the keys
 *    present in every file; `additionalProperties: false` only when the key set is closed;
 *    field value types from the value ladder.
 *  - **Value ladder** (D-0009 § Step 4): const (uniform) → number → boolean → array →
 *    format (date/datetime/email/url/uuid/…) → enum (distinct ≤ 12 AND < half the files) →
 *    else string. Every rung admits every observed value.
 *  - **`--relax`** (D-0009 § Step 3/4): loosen to a permissive floor — `order: none`,
 *    `additionalSections: true`, an open frontmatter object, everything-non-universal optional,
 *    no enums, loosest value types.
 *  - **Naming** (D-0009 § Open questions): a contract is named after its directory's full
 *    relative-path slug (`api`, `api-v1`, `web-v1`) — inherently unique, no de-collision step.
 *
 * The inferer is a producer of the declarative-YAML formats (C-0006 / C-0007) — emitting the
 * mcVersion 2 vocabulary (D-0020) — and a consumer of its own output (the self-check loads the
 * scaffold back and runs it); it adds no format and no engine surface (D-0009 § Consequences).
 *
 * This module implements the **single-contract core** (Phase 2) plus the full **value-type
 * ladder** (Phase 3) plus **meta-config mode** (Phase 4): discovery, the body grammar
 * (sections / order / unknown-admission), the tight-but-accepting frontmatter field schemas
 * (const / number / boolean / array / format / enum / string), the directory+depth cut with
 * full-path naming / root contracts / stranded-file warnings, and YAML emission. The
 * interfaces (`InferOptions`, `InferredContract`, `InferResult`, `inferConfig`) are fixed and
 * shared.
 */
import { readdirSync, readFileSync } from "node:fs";
import { basename, resolve, sep } from "node:path";

import picomatch from "picomatch";
import { stringify as stringifyYaml } from "yaml";
import { toCamelKey } from "../core/camel.js";
import { parse } from "../core/index.js";
import { DEFAULT_MAX_CONST_STRING_LENGTH, DEFAULT_MIN_CONST_EXAMPLES } from "./constants.js";
import { DeclarativeError } from "./errors.js";
import { compileSchema } from "./schema.js";

/** Options for `inferConfig` — mirrors the `init` CLI flags (D-0009 § The CLI surface). */
export interface InferOptions {
  meta?: boolean; // emit a meta-config across the tree (default: single contract)
  depth?: number; // directory cut for meta mode (default 1; 0 == single contract)
  relax?: boolean; // loosen generation toward a permissive floor
  inline?: boolean; // single self-contained config instead of per-dir contract files
  inferBounds?: boolean; // opt into pattern / min / max inference
  maxConstStringLength?: number; // strings longer than this never become const/enum (default DEFAULT_MAX_CONST_STRING_LENGTH)
  minConstExamples?: number; // a uniform scalar needs >= this many docs to become const (default DEFAULT_MIN_CONST_EXAMPLES)
  include?: string[]; // glob pre-filter (relative to root), as `validate`
  exclude?: string[];
}

/**
 * The resolved value-ladder knobs threaded into `inferFieldSchema` — one bag so the const
 * string-length cap and the min-examples floor ride the same plumbing as `relax`. Resolved once
 * at the `inferConfig` boundary from `InferOptions` (with defaults applied), then passed down
 * unchanged through `generalize` → `inferFrontmatter` → `inferFieldSchema`.
 */
interface FieldInferOptions {
  /** `--relax`: drop strict + categorical enums toward a permissive floor. */
  relax: boolean;
  /** Strings longer than this never become a `const` nor enter an `enum`. */
  maxConstStringLength: number;
  /** A uniform scalar needs at least this many observed docs to become a `const`. */
  minConstExamples: number;
}

/**
 * Diagnostics collected while generalizing a corpus into contracts (T-KCOL). A `warning` is
 * advisory — inference proceeds and the scaffold is still written (e.g. two case-variant headings
 * merged into one aliased section). An `error` is fatal — the corpus cannot yield a faithful,
 * accept-by-construction contract (e.g. two key-colliding headings appear together as peers in one
 * doc), so `inferConfig` aborts with all collected errors rather than emit a contract that would
 * fail its own self-check. A shared sink threads down `inferConfig → inferMeta → generalize →
 * inferBody` so diagnostics from every group surface together in one run.
 */
interface InferSink {
  warnings: string[];
  errors: string[];
}

/**
 * One inferred contract for a directory group, in declarative-YAML OBJECT form.
 * `def` is exactly a `compileContractObject(def, 2)` input — the v2 vocabulary (D-0020):
 *   { frontmatter?: { type: "object"; required?: string[]; additionalProperties?: boolean;
 *                     properties?: Record<string, unknown> },
 *     body?: { order?: "none"|"recognized-relative"|"strict"; additionalSections?: boolean;
 *              sections?: Array<{ section: string; minContains?: number; maxContains?: number }> } }
 */
export interface InferredContract {
  name: string; // directory full-relative-path slug
  include: string[]; // rule globs, relative to the run root
  def: Record<string, unknown>;
}

export interface InferredFile {
  path: string;
  content: string;
}

export interface InferResult {
  mode: "single" | "meta";
  contracts: InferredContract[];
  files: InferredFile[]; // serialized YAML to write (paths relative to the out dir)
  warnings: string[]; // e.g. files stranded above a depth>=2 cut
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

/** picomatch options — `dot` so dotfiles match like any other file (mirrors the runner). */
const PICOMATCH_OPTS = { dot: true } as const;

/** Deterministic directory-entry order: sort by name so an unchanged corpus walks identically. */
function byName(a: { name: string }, b: { name: string }): number {
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

/**
 * Recursively collect every `*.md` under `root`, returned as paths relative to `root`
 * (POSIX-separated), in a deterministic order: directory entries are sorted before
 * recursion, so re-running over an unchanged corpus walks the files identically
 * (D-0009 § Idempotence). Mirrors the runner's own `walkSync` so inference sees exactly
 * the file set the self-check will route.
 *
 * An optional `include` / `exclude` glob pre-filter (relative to `root`, matched with the same
 * `picomatch` and AND-narrowing semantics the runner uses — D-0009 § Step 1, "the same `--glob`
 * / `--include` / `--exclude` scoping as validate") narrows which files feed inference: a file is
 * kept only if it matches at least one `include` glob (when any are given) and no `exclude` glob.
 * The self-check applies the identical scope, so what inference saw is exactly what is routed.
 */
function discover(root: string, scope?: { include?: string[]; exclude?: string[] }): string[] {
  const include =
    scope?.include && scope.include.length > 0 ? picomatch(scope.include, PICOMATCH_OPTS) : null;
  const exclude =
    scope?.exclude && scope.exclude.length > 0 ? picomatch(scope.exclude, PICOMATCH_OPTS) : null;

  /** A `*.md` path survives the scope pre-filter (AND-narrowing, mirrors the runner). */
  const keep = (rel: string): boolean => {
    if (exclude && exclude(rel)) return false;
    if (include && !include(rel)) return false;
    return true;
  };

  const out: string[] = [];
  const recur = (absDir: string, relDir: string): void => {
    const entries = readdirSync(absDir, { withFileTypes: true });
    entries.sort(byName);
    for (const entry of entries) {
      const rel = relDir === "" ? entry.name : `${relDir}/${entry.name}`;
      if (entry.isDirectory()) {
        recur(resolve(absDir, entry.name), rel);
      } else if (entry.isFile() && entry.name.endsWith(".md") && keep(rel)) {
        out.push(rel);
      }
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
    // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic get-or-create memoization
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
      ka.every((k) =>
        deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
      )
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
 *  1. all values **identical** (a scalar), seen in **≥ `opts.minConstExamples`** docs, and — for
 *     strings — **≤ `opts.maxConstStringLength`** long → `{ const: <value> }`;
 *  2. else all **numbers** → `{ type: number }` (`type: integer` if all integers);
 *  3. else all **booleans** → `{ type: boolean }`;
 *  4. else all **arrays** → `{ type: array, items: <recursively inferred LOOSE element schema> }`;
 *  5. else all **strings matching one `format`** (most specific; `date` before `datetime`) →
 *     `{ type: string, format: <name> }`;
 *  6. else a **small closed categorical set** — ≤ 12 distinct values, fewer than half the files,
 *     and no value over the string-length cap — → `{ enum: [<observed values, first-appearance order>] }`;
 *  7. else → `{ type: string }`.
 *
 * `fileCount` is the group's file count (the rung-6 ratio gate). `opts` carries the ladder knobs:
 * `relax` skips rung 6 so a categorical field stays `{ type: string }` (D-0009 § Step 4 — `--relax`
 * drops enums); `maxConstStringLength` keeps a long free-text value off rungs 1 and 6;
 * `minConstExamples` keeps a uniform scalar off rung 1 until enough docs back it. Each guard only
 * ever loosens the rung, so accept-by-construction holds. `min` / `max` / `pattern` are never
 * inferred here (opt-in via `--infer-bounds`, a future phase).
 */
function inferFieldSchema(
  values: unknown[],
  fileCount: number,
  opts: FieldInferOptions,
): Record<string, unknown> {
  if (values.length === 0) return { type: "string" };

  // Null — handled before the rungs. No base rung admits `null` (string/number/boolean/array and
  // enum/const all reject it), so a field with a `null` observation would otherwise infer a schema
  // that rejects its own corpus (breaking accept-by-construction, D-0009 § Self-check). Infer over
  // the non-null values and pair the base type with "null" in a v2 type union (D-0020). The v2
  // subset has no nullable spelling for an enum/const base, so those rungs are disabled here —
  // strictly looser, so accept-by-construction still holds. An all-null field becomes a nullable
  // string placeholder (the author can tighten the base type by hand).
  if (values.some((v) => v === null)) {
    const nonNull = values.filter((v) => v !== null);
    const typedOpts: FieldInferOptions = {
      ...opts,
      relax: true, // rung 6 (enum) has no nullable v2 spelling
      minConstExamples: Number.MAX_SAFE_INTEGER, // rung 1 (const) has none either
    };
    const baseSchema =
      nonNull.length > 0 ? inferFieldSchema(nonNull, fileCount, typedOpts) : { type: "string" };
    const { type, ...rest } = baseSchema as { type: string } & Record<string, unknown>;
    return { type: [type, "null"], ...rest };
  }

  // Rung 1 — all identical (scalar) → const (with the length / min-examples guards).
  const constSchema = constRung(values, opts);
  if (constSchema) return constSchema;

  // Rung 2 — all numbers → number (`type: integer` when every value is an integer).
  if (values.every((v) => typeof v === "number")) {
    return (values as number[]).every((n) => Number.isInteger(n))
      ? { type: "integer" }
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
    return {
      type: "array",
      items: inferFieldSchema(items, items.length, { ...opts, relax: true }),
    };
  }

  // Rung 5 (format) + Rung 6 (enum) — all strings.
  if (values.every((v) => typeof v === "string")) {
    return stringRung(values as string[], fileCount, opts);
  }

  // Rung 7 — fallback: a plain string accepts every value.
  return { type: "string" };
}

/**
 * Rung 1 — all values identical (a scalar) → `{ const }`, or `null` to fall through. Two guards
 * keep a coincidentally-uniform field from being frozen on thin/unwieldy evidence: a string longer
 * than the cap is never a const, and any scalar needs at least `minConstExamples` observations.
 * Either miss falls to a looser rung — still accept-by-construction (D-0009 § Self-check).
 */
function constRung(values: unknown[], opts: FieldInferOptions): Record<string, unknown> | null {
  const first = values[0];
  if (!isScalar(first) || !values.every((v) => deepEqual(v, first))) return null;
  const overLength = typeof first === "string" && first.length > opts.maxConstStringLength;
  const tooFewExamples = values.length < opts.minConstExamples;
  return !overLength && !tooFewExamples ? { const: first } : null;
}

/**
 * Rung 5 + 6 for an all-string field: the most-specific matching `format` (validated via the
 * engine), else a small closed categorical `enum`, else a plain `{ type: string }`.
 */
function stringRung(
  strings: string[],
  fileCount: number,
  opts: FieldInferOptions,
): Record<string, unknown> {
  for (const format of FORMAT_CANDIDATES) {
    if (allMatchFormat(strings, format)) return { type: "string", format };
  }
  return enumRung(strings, fileCount, opts) ?? { type: "string" };
}

/**
 * Rung 6 — a small closed categorical set → `{ enum }`, or `null` to fall through (unless --relax,
 * which keeps it a string). The compiler's `enum` is strings-only; the ratio (< half the files)
 * keeps a coincidentally repetitive free-form field from enum'ing on thin evidence (D-0009 § Step 4,
 * rung 6). An enum must admit EVERY observed value, so a value over the const string-length cap
 * can't be dropped — if any value exceeds it, skip the rung and let the field fall to a string.
 */
function enumRung(
  strings: string[],
  fileCount: number,
  opts: FieldInferOptions,
): Record<string, unknown> | null {
  if (opts.relax || strings.some((s) => s.length > opts.maxConstStringLength)) return null;
  const distinct: string[] = [];
  const seen = new Set<string>();
  for (const s of strings) {
    if (!seen.has(s)) {
      seen.add(s);
      distinct.push(s);
    }
  }
  return distinct.length <= 12 && distinct.length * 2 < fileCount ? { enum: distinct } : null;
}

/**
 * Generalize the frontmatter plane (D-0009 § Step 3 — frontmatter), emitted as a v2 OBJECT
 * schema node (D-0020): keys in first-appearance order (deterministic); `required` lists the
 * keys present in EVERY doc (v2 is optional-by-default, so the rest simply stay off the list).
 * Field value types come from the value-type ladder (`inferFieldSchema`), the *tightest* schema
 * that still admits every observed value. `additionalProperties: false` is always safe here:
 * every key any doc carried is listed, so the key set is closed by construction; `--relax`
 * drops it (open object) and (via the ladder) drops categorical enums.
 */
function inferFrontmatter(
  docs: ParsedDoc[],
  opts: FieldInferOptions,
): Record<string, unknown> | undefined {
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
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const key of keys) {
    const present = docs.filter((d) => key in d.frontmatter).length;
    if (present === docs.length) required.push(key);
    properties[key] = inferFieldSchema(values.get(key)!, fileCount, opts);
  }

  // Canonical v2 node order (as the codemod emits): type, required, additionalProperties,
  // properties. The key set is closed by construction (every observed key is listed), so
  // `additionalProperties: false` is safe; `--relax` loosens to an open object (D-0009 § --relax).
  const node: Record<string, unknown> = { type: "object" };
  if (required.length > 0) node.required = required;
  if (!opts.relax) node.additionalProperties = false;
  node.properties = properties;
  return node;
}

// ── Body (D-0009 § Step 3 — sections / order / unknown) ────────────────────────────

/** Render a sample of `list` for a diagnostic, capping the tail so a big vault stays readable. */
function sampleList(list: string[], n = 5): string {
  return list.length <= n
    ? list.join(", ")
    : `${list.slice(0, n).join(", ")} (and ${list.length - n} more)`;
}

/** Drop repeats from a list, keeping the first occurrence of each value (order preserved). */
function dedupePreservingOrder(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

/**
 * Generalize the body plane (D-0009 § Step 3 — sections + order + unknown admission), emitted
 * in the v2 vocabulary (D-0020). Lists the group's complete observed section vocabulary in the
 * detected order; required = universal (a plain slot), the rest counted `minContains: 0` +
 * `maxContains: 1`; `additionalSections: false` (every observed section is listed, so the
 * unknown door is safe to close) — `--relax` opens it and drops order to `none`.
 *
 * Sections are keyed by their generated camelCase key (`core/camel.ts`), and two DISTINCT
 * spellings that collapse to the same key cannot be two sibling sections (the engine's build-time
 * `contract/key-collision` guard). So before emitting, observed spellings are grouped by key and
 * each clash collapses into ONE section: the first-seen spelling is the primary, the rest become
 * `aliases` (the engine accepts alias spellings for one slot) — a warning records the merge. The
 * one case that cannot be merged is two clashing spellings appearing TOGETHER as peers in a single
 * doc: the merged slot would then match twice (`structure/duplicate-section`), so that is a fatal
 * `sink.errors` entry naming the offending file(s) (T-KCOL). A heading that yields no key (no
 * alphanumerics) generates no alias and so can never collide — it is emitted unchanged.
 */
function inferBody(
  docs: ParsedDoc[],
  relax: boolean,
  sink: InferSink,
):
  | {
      order: Order;
      additionalSections: boolean;
      sections: Array<{
        section: string;
        aliases?: string[];
        minContains?: number;
        maxContains?: number;
      }>;
    }
  | undefined {
  const { order, sections: detected } = detectOrder(docs);
  // Dedupe the detected spine: a heading repeated as peers in one doc (a repeatable slot) appears
  // once in the contract. `detectOrder`'s `none` / `recognized-relative` paths already dedupe via
  // the union; the `strict` path echoes `docs[0]`'s sequence verbatim, so collapse it here (T-1TA2).
  const sections = dedupePreservingOrder(detected);
  if (sections.length === 0) return undefined;

  // A spelling that appears ≥2 times as peers within ANY single doc is a repeatable slot (T-1TA2):
  // its exact-duplicate peers must validate (not `structure/duplicate-section`), so the inferred
  // contract accepts its own corpus. (`ParsedDoc.sections` preserves per-doc duplicates.) Distinct
  // key-colliding spellings are handled below unchanged — repeatable is only for exact duplicates.
  const repeatedSpellings = new Set<string>();
  for (const doc of docs) {
    const counts = new Map<string, number>();
    for (const name of doc.sections) counts.set(name, (counts.get(name) ?? 0) + 1);
    for (const [name, n] of counts) if (n >= 2) repeatedSpellings.add(name);
  }

  const byKey = groupSpellingsByKey(sections);

  const entries: Array<{
    section: string;
    aliases?: string[];
    minContains?: number;
    maxContains?: number;
  }> = [];
  const emitted = new Set<string>(); // primary spellings already emitted
  for (const name of sections) {
    emitSectionEntry(name, byKey, emitted, repeatedSpellings, docs, sink, entries);
  }

  return relax
    ? { order: "none", additionalSections: true, sections: entries }
    : { order, additionalSections: false, sections: entries };
}

/** Group observed section spellings by their generated camelCase key, in first-appearance order. */
function groupSpellingsByKey(sections: string[]): Map<string, string[]> {
  const byKey = new Map<string, string[]>();
  for (const name of sections) {
    const key = toCamelKey(name);
    if (key === "") continue; // no alphanumerics ⇒ no generated alias ⇒ cannot collide
    let spellings = byKey.get(key);
    // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic get-or-create memoization
    if (!spellings) byKey.set(key, (spellings = []));
    spellings.push(name);
  }
  return byKey;
}

/**
 * Emit the section entry for `name` — but only once per merged slot, at its primary spelling. An
 * alias spelling (or an already-emitted primary) is skipped; the primary carries any `aliases`
 * and its v2 occurrence bounds (D-0020 § Occurrence), and records the merge. The occurrence
 * matrix mirrors the v1→v2 codemod exactly:
 *   - required, non-repeating   → a plain slot (no occurrence keys);
 *   - optional, non-repeating   → `minContains: 0` + `maxContains: 1`;
 *   - required, repeating       → `minContains: 1` (no upper bound);
 *   - optional, repeating       → `minContains: 0` (no upper bound).
 */
function emitSectionEntry(
  name: string,
  byKey: Map<string, string[]>,
  emitted: Set<string>,
  repeatedSpellings: Set<string>,
  docs: ParsedDoc[],
  sink: InferSink,
  entries: Array<{
    section: string;
    aliases?: string[];
    minContains?: number;
    maxContains?: number;
  }>,
): void {
  const key = toCamelKey(name);
  const spellings = key === "" ? [name] : byKey.get(key)!;
  const primary = spellings[0]!;
  if (name !== primary) return; // an alias spelling — its slot is emitted at the primary
  if (emitted.has(primary)) return;
  emitted.add(primary);

  const aliases = spellings.slice(1);
  // Required iff every doc carries at least ONE of the (merged) spellings.
  const required = docs.every((d) => spellings.some((s) => d.sections.includes(s)));
  // Repeatable when any of the slot's spellings recurs as peers within one doc (T-1TA2).
  const repeatable = spellings.some((s) => repeatedSpellings.has(s));
  const entry: {
    section: string;
    aliases?: string[];
    minContains?: number;
    maxContains?: number;
  } = { section: primary };
  if (aliases.length > 0) entry.aliases = aliases;
  if (repeatable) {
    entry.minContains = required ? 1 : 0; // repeatable — no upper bound
  } else if (!required) {
    entry.minContains = 0;
    entry.maxContains = 1;
  }
  entries.push(entry);

  if (aliases.length > 0) recordAliasMerge(spellings, key, primary, docs, sink);
}

/**
 * Record the diagnostic for a set of merged spellings sharing one `key`: a fatal `sink.errors`
 * entry when any single doc carries MORE THAN ONE of them as peers (the one slot would match twice
 * — genuine ambiguity, T-KCOL), else an advisory `sink.warnings` entry naming the merge.
 */
function recordAliasMerge(
  spellings: string[],
  key: string,
  primary: string,
  docs: ParsedDoc[],
  sink: InferSink,
): void {
  const filesWith = (spelling: string): string[] =>
    docs.filter((d) => d.sections.includes(spelling)).map((d) => d.rel);
  const quoted = spellings.map((s) => `‘${s}’`).join(" / ");
  const coDocs = docs
    .filter((d) => spellings.filter((s) => d.sections.includes(s)).length > 1)
    .map((d) => d.rel);
  if (coDocs.length > 0) {
    sink.errors.push(
      `sibling headings ${quoted} collapse to the same key ‘${key}’ and appear together as peers ` +
        `in ${sampleList(coDocs)}; they cannot be one section. Rename the headings so they differ ` +
        `(or split the file), then re-run.`,
    );
  } else {
    const examples = spellings.map((s) => `‘${s}’ in ${filesWith(s)[0]}`).join(", ");
    sink.warnings.push(
      `merged variant headings ${quoted} into one section ‘${primary}’ (shared key ‘${key}’); seen as ${examples}`,
    );
  }
}

// ── Naming & emission ──────────────────────────────────────────────────────────────

/**
 * Slugify one path segment into a name fragment (D-0009 § Naming): lower-case, runs of
 * non-alphanumerics collapse to a single `-`, leading/trailing `-` trimmed. A segment that
 * slugs to empty falls back to `contract` (so a degenerate basename still produces a name).
 */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "contract" : slug;
}

/**
 * Name a directory group from its FULL relative path (D-0009 § Naming): slugify every path
 * segment from the run root and join with `-` (`api/v1` → `api-v1`, `web/v1` → `web-v1`, a
 * top-level `api` → `api`). The relative path is inherently unique, so the joined slug is too —
 * no de-collision step. An empty relative path is the run root itself, named after its basename
 * (or `root` when even that slugs empty). The name is just a label the author can rename.
 */
function nameForDir(relDir: string, absRoot: string): string {
  if (relDir === "") {
    const base = slugify(basename(absRoot));
    return base === "contract" ? "root" : base;
  }
  return relDir.split("/").map(slugify).join("-");
}

/**
 * Generalize one group of docs into a contract `def` (D-0009 § Step 3 + Step 4) — the
 * frontmatter and body planes inferred to the tightest shape that still accepts every doc in
 * the group. Shared by single-contract mode (the whole subtree is one group) and meta mode
 * (one group per directory at the depth cut). Returns the bare `def` object an
 * `InferredContract` and `compileContractObject` both consume.
 */
function generalize(
  docs: ParsedDoc[],
  opts: FieldInferOptions,
  sink: InferSink,
): Record<string, unknown> {
  const def: Record<string, unknown> = {};
  const frontmatter = inferFrontmatter(docs, opts);
  if (frontmatter) def.frontmatter = frontmatter;
  const body = inferBody(docs, opts.relax, sink);
  if (body) def.body = body;
  return def;
}

/** The directory of a relative POSIX file path (`""` for a file directly in the run root). */
function dirOf(rel: string): string {
  const slash = rel.lastIndexOf("/");
  return slash === -1 ? "" : rel.slice(0, slash);
}

/** The depth of a relative directory: `""` is depth 0, `api` is depth 1, `api/v1` is depth 2. */
function depthOf(relDir: string): number {
  return relDir === "" ? 0 : relDir.split("/").length;
}

/** The ancestor directory of `relDir` at exactly `depth` (`api/v1/x` at depth 2 → `api/v1`). */
function ancestorAt(relDir: string, depth: number): string {
  return relDir.split("/").slice(0, depth).join("/");
}

/** Get (creating on first sight, recording walk order) the doc bucket for a group key. */
function bucketFor(groups: Map<string, ParsedDoc[]>, order: string[], key: string): ParsedDoc[] {
  let bucket = groups.get(key);
  if (!bucket) {
    // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic get-or-create memoization
    groups.set(key, (bucket = []));
    order.push(key);
  }
  return bucket;
}

/**
 * Build the meta-config result (D-0009 § Step 2 + Step 5): a uniform-depth cut at `depth`.
 *
 * Every file is routed by the ancestor directory at exactly `depth`:
 *  - a file whose directory is at depth ≥ `depth` belongs to its depth-`depth` ancestor → that
 *    directory gets ONE contract, recursive over its subtree (`<reldir>/**\/*.md`);
 *  - a file sitting directly in the run root (depth-0 directory) ALWAYS belongs to the ROOT
 *    contract, a DIRECT-ONLY `*.md` glob (never `**\/*.md`), so it can never overlap a subdir
 *    glob — independent of the depth knob;
 *  - a file in a directory strictly BETWEEN the root and the cut (depth ≥ 1 but `< depth`) is
 *    STRANDED: uniform depth refuses to wrap it in a nested parent contract, so it is named in
 *    a warning and routed nowhere (it matches no rule, so accept-by-construction still holds —
 *    the self-check simply skips it). Only depth ≥ 2 can strand; depth 1 never does.
 *
 * Because every contract sits at one uniform depth and is never an ancestor of another, the
 * globs never overlap and routing is order-independent. Contracts are named after the full
 * relative-path slug of their directory. Output order is deterministic: groups in
 * first-appearance (walk) order, with the root contract first when present.
 */
function inferMeta(
  absRoot: string,
  docs: ParsedDoc[],
  depth: number,
  opts: FieldInferOptions,
  inline: boolean,
  sink: InferSink,
): InferResult {
  // Route each doc to a group key (its depth-`depth` ancestor dir), tracking stranded files.
  const groups = new Map<string, ParsedDoc[]>(); // group dir → its docs (first-appearance order)
  const groupOrder: string[] = [];
  const stranded: string[] = [];
  let hasRoot = false;

  for (const doc of docs) {
    const fileDir = dirOf(doc.rel);
    const fileDepth = depthOf(fileDir);
    if (fileDepth === 0) {
      // Directly in the run root — always the root contract, regardless of the depth knob.
      hasRoot = true;
      bucketFor(groups, groupOrder, "").push(doc);
    } else if (fileDepth >= depth) {
      // Deep enough to be routed to its depth-`depth` ancestor directory's contract.
      bucketFor(groups, groupOrder, ancestorAt(fileDir, depth)).push(doc);
    } else {
      // In an intermediate directory between the root and a depth ≥ 2 cut — stranded
      // (uniform depth never nests it under a parent contract).
      stranded.push(doc.rel);
    }
  }

  // Emit the root group first (its direct-only glob), then the subdir groups in walk order.
  const orderedKeys = [...(hasRoot ? [""] : []), ...groupOrder.filter((k) => k !== "")];

  const contracts: InferredContract[] = orderedKeys.map((key) => ({
    name: nameForDir(key, absRoot),
    include: [key === "" ? "*.md" : `${key}/**/*.md`],
    def: generalize(groups.get(key)!, opts, sink),
  }));

  for (const rel of stranded) {
    sink.warnings.push(
      `stranded: ${rel} sits above the --depth ${depth} cut and is covered by no contract; ` +
        `use a shallower --depth to include it`,
    );
  }

  return {
    mode: "meta",
    contracts,
    files: emitMetaFiles(contracts, inline),
    warnings: sink.warnings,
  };
}

/**
 * Serialize the meta-config files (D-0009 § Step 5). With `--inline`, ONE self-contained
 * `markdown-contract.yaml` carries each contract's def inline on its rule. Otherwise the
 * offramp shape: a `markdown-contract.yaml` whose `contracts` registry maps each name to
 * `./contracts/<name>.contract.yaml`, with `rules` referencing the names, PLUS one
 * `contracts/<name>.contract.yaml` per group. Rules follow contract (walk) order; globs are
 * non-overlapping so order is purely for a clean diff.
 */
function emitMetaFiles(contracts: InferredContract[], inline: boolean): InferredFile[] {
  if (inline) {
    const config = {
      mcVersion: 2,
      kind: "config",
      rules: contracts.map((c) => ({ include: c.include, contract: c.def })),
    };
    return [{ path: "markdown-contract.yaml", content: stringifyYaml(config) }];
  }

  const registry: Record<string, string> = {};
  for (const c of contracts) registry[c.name] = `./contracts/${c.name}.contract.yaml`;
  const config = {
    mcVersion: 2,
    kind: "config",
    contracts: registry,
    rules: contracts.map((c) => ({ include: c.include, contract: c.name })),
  };

  const files: InferredFile[] = [
    { path: "markdown-contract.yaml", content: stringifyYaml(config) },
  ];
  for (const c of contracts) {
    files.push({
      path: `contracts/${c.name}.contract.yaml`,
      content: stringifyYaml({ mcVersion: 2, kind: "contract", ...c.def }),
    });
  }
  return files;
}

/**
 * Infer a config from the corpus under `root`. Pure: reads files, returns model + serialized
 * YAML; writes nothing. Two modes (D-0009 § Two modes):
 *  - **single-contract** (`opts.meta` falsy, the default) — one contract over the whole subtree,
 *    the tightest shape that accepts every `*.md` under it;
 *  - **meta-config** (`opts.meta` truthy) — a uniform-depth cut at `opts.depth ?? 1`: one
 *    contract per directory at exactly that depth (recursive over its subtree) plus a root
 *    contract for files directly in the run root, files stranded above a depth ≥ 2 cut warned.
 *
 * Both modes share the same generalization (`generalize`); meta is single-contract with the cut
 * moved off the root. `opts.depth` 0 (or single mode) collapses to one contract over `**\/*.md`.
 */
export function inferConfig(root: string, opts?: InferOptions): InferResult {
  const absRoot = resolve(root);
  // Resolve the value-ladder knobs once (defaults applied) and thread the one bag downward.
  const fieldOpts: FieldInferOptions = {
    relax: opts?.relax === true,
    maxConstStringLength: opts?.maxConstStringLength ?? DEFAULT_MAX_CONST_STRING_LENGTH,
    minConstExamples: opts?.minConstExamples ?? DEFAULT_MIN_CONST_EXAMPLES,
  };
  const docs = discover(absRoot, { include: opts?.include, exclude: opts?.exclude }).map((rel) =>
    parseDoc(absRoot, rel),
  );

  // Diagnostics from every group accumulate here; a fatal `error` aborts AFTER all are collected,
  // so one run names every heading clash to fix rather than failing on the first (T-KCOL).
  const sink: InferSink = { warnings: [], errors: [] };

  // Meta mode: cut the tree at the depth knob (default 1). Depth 0 is single-contract mode.
  const depth = opts?.depth ?? 1;
  let result: InferResult;
  if (opts?.meta === true && depth >= 1) {
    result = inferMeta(absRoot, docs, depth, fieldOpts, opts?.inline === true, sink);
  } else {
    // Single-contract mode: the whole subtree is one group, named after the run-root basename.
    const def = generalize(docs, fieldOpts, sink);
    const name = slugify(basename(absRoot));
    const contract: InferredContract = { name, include: ["**/*.md"], def };
    const content = stringifyYaml({ mcVersion: 2, kind: "contract", ...def });
    result = {
      mode: "single",
      contracts: [contract],
      files: [{ path: `${name}.contract.yaml`, content }],
      warnings: sink.warnings,
    };
  }

  // Accept-by-construction (D-0009): if the corpus can't yield a faithful contract, refuse to emit
  // one that would fail its own self-check — abort with every collected clash named.
  if (sink.errors.length > 0) {
    const lead =
      sink.errors.length === 1
        ? `cannot infer a contract — a heading key-collision needs fixing:`
        : `cannot infer a contract — ${sink.errors.length} heading key-collisions need fixing:`;
    throw new DeclarativeError(`${lead}\n${sink.errors.map((e) => `  - ${e}`).join("\n")}`);
  }
  return result;
}
