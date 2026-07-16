/**
 * Parse a declarative YAML document and validate its envelope — the `mcVersion` version
 * gate and the `kind` discriminant (D-0008). This is the single entry where the format
 * version is checked: `mcVersion: 2` routes to the v2 declarative compilers (D-0020).
 * `mcVersion: 1` is retired — it gets a dedicated error naming the v1→v2 codemod. The
 * body of the document (`frontmatter` / `body` for a contract, `rules` / `contracts` for
 * a config) is handed off to the kind-specific compiler.
 */
import { parse as parseYaml } from "yaml";

import { DeclarativeError } from "./errors.js";

/** The supported format versions of the declarative DSL: v2 (D-0020). v1 is retired. */
const SUPPORTED_VERSIONS = new Set([2]);

export interface DeclarativeDoc {
  mcVersion: number;
  kind: "contract" | "config";
  /** the parsed YAML mapping, envelope validated */
  raw: Record<string, unknown>;
}

/**
 * Parse YAML text into a validated declarative envelope. Throws `DeclarativeError` on invalid
 * YAML, a non-mapping document, an unsupported `mcVersion`, or a `kind` that is neither
 * `contract` nor `config`. `mcVersion: 1` gets its dedicated retirement error (D-0020); an
 * unknown version is never best-effort parsed.
 */
export function parseDeclarativeDoc(yamlText: string): DeclarativeDoc {
  let raw: unknown;
  try {
    raw = parseYaml(yamlText);
  } catch (err) {
    throw new DeclarativeError(`invalid YAML: ${(err as Error).message}`);
  }
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new DeclarativeError(
      "a declarative document must be a YAML mapping with mcVersion and kind",
    );
  }
  const obj = raw as Record<string, unknown>;

  const version = obj.mcVersion;
  if (version === 1) {
    throw new DeclarativeError(
      "mcVersion 1 is retired; run `bun packages/core/scripts/migrate-v1-to-v2.ts --write <file>` to migrate (D-0020)",
    );
  }
  if (typeof version !== "number" || !SUPPORTED_VERSIONS.has(version)) {
    throw new DeclarativeError(
      `unsupported mcVersion: ${JSON.stringify(version)} (this build supports ${[...SUPPORTED_VERSIONS].join(", ")})`,
    );
  }
  if (obj.kind !== "contract" && obj.kind !== "config") {
    throw new DeclarativeError(
      `kind must be "contract" or "config" (got ${JSON.stringify(obj.kind)})`,
    );
  }

  return { mcVersion: version, kind: obj.kind, raw: obj };
}
