/**
 * Parse a declarative YAML document and validate its envelope — the `mcVersion` version
 * gate and the `kind` discriminant (D-0008). This is the single entry where the format
 * version is checked, so a future `mcVersion: 2` dispatches here without touching the
 * compilers. The body of the document (`frontmatter` / `body` for a contract, `rules` /
 * `contracts` for a config) is handed off to the kind-specific compiler.
 */
import { parse as parseYaml } from "yaml";
import { DeclarativeError } from "./errors.js";
/** The supported format versions of the declarative DSL. v1 only, for now (D-0008 § versioning). */
const SUPPORTED_VERSIONS = new Set([1]);
/**
 * Parse YAML text into a validated declarative envelope. Throws `DeclarativeError` on invalid
 * YAML, a non-mapping document, an unsupported `mcVersion`, or a `kind` that is neither
 * `contract` nor `config`. Never best-effort parses an unknown version.
 */
export function parseDeclarativeDoc(yamlText) {
    let raw;
    try {
        raw = parseYaml(yamlText);
    }
    catch (err) {
        throw new DeclarativeError(`invalid YAML: ${err.message}`);
    }
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
        throw new DeclarativeError("a declarative document must be a YAML mapping with mcVersion and kind");
    }
    const obj = raw;
    const version = obj.mcVersion;
    if (typeof version !== "number" || !SUPPORTED_VERSIONS.has(version)) {
        throw new DeclarativeError(`unsupported mcVersion: ${JSON.stringify(version)} (this build supports ${[...SUPPORTED_VERSIONS].join(", ")})`);
    }
    if (obj.kind !== "contract" && obj.kind !== "config") {
        throw new DeclarativeError(`kind must be "contract" or "config" (got ${JSON.stringify(obj.kind)})`);
    }
    return { mcVersion: version, kind: obj.kind, raw: obj };
}
//# sourceMappingURL=parse.js.map