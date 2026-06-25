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
 */
import { notImplemented } from "../core/index.js";

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

/** Infer a config from the corpus under `root`. Pure: reads files, returns model + serialized YAML; writes nothing. */
export function inferConfig(root: string, opts?: InferOptions): InferResult {
  throw notImplemented("declarative/inferConfig");
}
