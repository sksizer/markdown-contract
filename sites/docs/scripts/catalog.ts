/**
 * Catalog loader — reads the example use-case catalog (`docs/catalog/*.yaml` at the
 * repo root) into typed data. Single source of truth for both the page generator
 * (`generate.ts`) and the artifact regression check (`check-artifacts.ts`): neither
 * ever hand-copies catalog content.
 *
 * The category order is the appendix reading order; it drives the sidebar and the
 * landing page's example pointers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";

/** Repo root: this file lives at `<root>/sites/docs/scripts/`. */
export const REPO_ROOT = resolve(import.meta.dirname, "../../..");
/** The catalog data directory (owned by T-CTLG; never written here). */
export const CATALOG_DIR = resolve(REPO_ROOT, "docs/catalog");

/** The reading order: check a corpus, author contracts, read typed data, automate. */
export const CATEGORY_ORDER = ["validate", "author", "read", "automate"] as const;

export type CategoryKey = (typeof CATEGORY_ORDER)[number];

export type ArtifactKind = "cli" | "code" | "yaml" | "mixed";

export interface CatalogExample {
  id: string;
  name: string;
  demonstrates: string;
  rank: number;
  builds_on: string | null;
  artifact_kind: ArtifactKind;
  artifact: string;
  surfaces: string[];
  /** `planned` marks an example for an unshipped capability; absent otherwise. */
  status?: "planned";
}

export interface CatalogCategory {
  category: CategoryKey;
  title: string;
  examples: CatalogExample[];
}

/** Whether an example documents an unshipped (planned) capability. */
export const isPlanned = (e: CatalogExample): boolean => e.status === "planned";

function assertExample(raw: Record<string, unknown>, file: string): CatalogExample {
  for (const key of ["id", "name", "demonstrates", "rank", "artifact_kind", "artifact"]) {
    if (raw[key] === undefined || raw[key] === null) {
      throw new Error(`${file}: example ${JSON.stringify(raw.id ?? "?")} is missing '${key}'`);
    }
  }
  if (!Array.isArray(raw.surfaces)) {
    throw new Error(`${file}: example ${raw.id} has no surfaces[] list`);
  }
  if (raw.status !== undefined && raw.status !== "planned") {
    throw new Error(`${file}: example ${raw.id} has unknown status ${JSON.stringify(raw.status)}`);
  }
  return raw as unknown as CatalogExample;
}

/** Load every category file, validate the shape, and return them in spine order. */
export function loadCatalog(): CatalogCategory[] {
  return CATEGORY_ORDER.map((key) => {
    const file = resolve(CATALOG_DIR, `${key}.yaml`);
    const raw = parseYaml(readFileSync(file, "utf8")) as Record<string, unknown>;
    if (raw.category !== key) {
      throw new Error(`${file}: category is ${JSON.stringify(raw.category)}, expected '${key}'`);
    }
    if (typeof raw.title !== "string" || !Array.isArray(raw.examples)) {
      throw new Error(`${file}: expected 'title' (string) and 'examples' (list)`);
    }
    const examples = raw.examples
      .map((e) => assertExample(e as Record<string, unknown>, file))
      .sort((a, b) => a.rank - b.rank);
    return { category: key, title: raw.title, examples };
  });
}

/** Global example index: id → { example, category } (for `builds_on` resolution). */
export function indexExamples(
  catalog: CatalogCategory[],
): Map<string, { example: CatalogExample; category: CategoryKey }> {
  const index = new Map<string, { example: CatalogExample; category: CategoryKey }>();
  for (const cat of catalog) {
    for (const example of cat.examples) {
      if (index.has(example.id)) throw new Error(`duplicate example id ${example.id}`);
      index.set(example.id, { example, category: cat.category });
    }
  }
  return index;
}
