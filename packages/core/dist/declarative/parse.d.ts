export interface DeclarativeDoc {
    mcVersion: number;
    kind: "contract" | "config";
    /** the parsed YAML mapping, envelope validated */
    raw: Record<string, unknown>;
}
/**
 * Parse YAML text into a validated declarative envelope. Throws `DeclarativeError` on invalid
 * YAML, a non-mapping document, an unsupported `mcVersion`, or a `kind` that is neither
 * `contract` nor `config`. Never best-effort parses an unknown version.
 */
export declare function parseDeclarativeDoc(yamlText: string): DeclarativeDoc;
//# sourceMappingURL=parse.d.ts.map