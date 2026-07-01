/**
 * Shared assertion accessors for the inference fixtures. These read the declarative-YAML
 * OBJECT form an `InferredContract.def` carries (a `compileContractObject` input):
 *   { frontmatter?: { strict?: boolean; fields?: Record<string, unknown> },
 *     body?: { order?: "none"|"recognized-relative"|"strict"; allowUnknown?: boolean;
 *              sections?: Array<{ section: string; optional?: boolean }> } }
 * Kept here so each fixture asserts the inferred shape by name (order-independent) without
 * re-deriving the same casts (per `~/.claude/MEMORY.md` — no skill/fixture prose duplication).
 */

/** A `body.sections` entry, as emitted in `InferredContract.def`. */
export interface SectionEntry {
  section: string;
  optional?: boolean;
}

/** The body sub-object of an inferred `def`. */
export interface InferredBody {
  order?: "none" | "recognized-relative" | "strict";
  allowUnknown?: boolean;
  sections?: SectionEntry[];
}

/** The frontmatter sub-object of an inferred `def`. */
export interface InferredFrontmatter {
  strict?: boolean;
  fields?: Record<string, unknown>;
}

/** A typed view of an `InferredContract.def`. */
export interface InferredDef {
  frontmatter?: InferredFrontmatter;
  body?: InferredBody;
}

/** Cast a raw `def` to the typed view. */
export function asDef(def: Record<string, unknown>): InferredDef {
  return def as InferredDef;
}

/** Look up one section entry by name (order-independent). */
export function section(def: Record<string, unknown>, name: string): SectionEntry | undefined {
  return asDef(def).body?.sections?.find((s) => s.section === name);
}

/** Sorted section names of a `def`. */
export function sectionNames(def: Record<string, unknown>): string[] {
  return (asDef(def).body?.sections ?? []).map((s) => s.section).sort();
}

/** Whether a section is required (present and not `optional`). */
export function isRequired(def: Record<string, unknown>, name: string): boolean {
  const s = section(def, name);
  return s !== undefined && (s.optional ?? false) === false;
}

/** Whether a section is present and marked `optional: true`. */
export function isOptional(def: Record<string, unknown>, name: string): boolean {
  return section(def, name)?.optional === true;
}

/** Look up one frontmatter field's inferred schema by key. */
export function field(def: Record<string, unknown>, key: string): unknown {
  return asDef(def).frontmatter?.fields?.[key];
}
