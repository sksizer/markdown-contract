export { matchContent } from "./content.js";
/**
 * The inert placeholder content schema. The real per-leaf Zod schema is built in T-5LW7
 * from `LeafSpec.config`; until then this stands in so a `LeafSpec` is well-typed and the
 * structural kind-gate (which reads only `LeafSpec.kind`) can run.
 */
const PLACEHOLDER_SCHEMA = {};
/** A typed-table leaf: columns, optional anchor, per-cell schemas, min rows. */
export function table(s) {
    return { kind: "table", schema: PLACEHOLDER_SCHEMA, config: s };
}
/** A list leaf: ordered/unordered, per-item schema or checkbox gate, min items. */
export function list(s) {
    return { kind: "list", schema: PLACEHOLDER_SCHEMA, config: s };
}
/** A fenced-code leaf, optionally pinned to a language. */
export function code(s) {
    return { kind: "code", schema: PLACEHOLDER_SCHEMA, config: s };
}
/** A paragraph leaf bounding word count. */
export function maxWords(n) {
    return { kind: "paragraph", schema: PLACEHOLDER_SCHEMA, config: { maxWords: n } };
}
//# sourceMappingURL=leaves.js.map