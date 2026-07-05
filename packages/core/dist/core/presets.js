/**
 * Contract-authoring ergonomics — the level-option presets and section shorthands that
 * recur across the schemas built on this library. Ten entity schemas repeat the same two
 * `LevelOpts` combos and the same `optional(section(...))` pattern; these named values and
 * thin wrappers converge that boilerplate.
 *
 * NOTE: one schema uses `{ order: "strict", allowUnknown: true }` — neither preset — and keeps
 * its own explicit `sections(...)`. That outlier deliberately gets no preset here.
 */
import { optional, section, sections } from "./grammar.js";
/** Lenient level options: unordered body, unknown sections allowed. */
export const LENIENT = { order: "none", allowUnknown: true };
/** Strict level options: strict order, no unknown sections. */
export const STRICT = { order: "strict", allowUnknown: false };
/** A lenient body grammar — `sections(LENIENT, specs)`. */
export function lenientBody(specs) {
    return sections(LENIENT, specs);
}
/** A strict body grammar — `sections(STRICT, specs)`. */
export function strictBody(specs) {
    return sections(STRICT, specs);
}
/**
 * An optional section — `optional(section(name, opts))`. Absorbs the `optional(section(...))`
 * convergence repeated across the schemas' optional trailing sections.
 */
export function optionalSection(name, opts) {
    return optional(section(name, opts));
}
//# sourceMappingURL=presets.js.map