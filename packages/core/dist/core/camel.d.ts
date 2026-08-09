/**
 * Unicode-aware camelCase key derivation (D-0005 / proposed-shape §6).
 *
 * A section's exact heading text gets a generated `lowerCamelCase` key alongside it
 * (`doc.body.filesToTouch`). The rule must be locale-independent and Unicode-aware so
 * most scripts work: split on runs of non-alphanumeric characters (`/[^\p{L}\p{N}]+/u`),
 * drop empties, and lowerCamel-join — lowercasing the first word, capitalizing the first
 * letter of each subsequent word and lowercasing its remainder.
 *
 * Used here for collision detection (`structure/key-collision`, `contract/key-collision`)
 * and by the dual-key consumption model later (T-6PV4).
 *
 * A heading that yields no alphanumeric run (e.g. `"---"`, or a caseless script with no
 * `\p{L}`/`\p{N}` content) produces an empty key (`""`); callers treat an empty key as
 * "no generated alias" (exact-bracket + `.section()` still reach it).
 */
/**
 * Derive the lowerCamelCase key for a heading. Returns `""` when the heading carries no
 * alphanumeric content (no generated alias).
 *
 * Examples:
 *   "Files to touch"        → "filesToTouch"
 *   "Goal / Problem statement" → "goalProblemStatement"
 *   "Files To Touch"        → "filesToTouch"  (collides with "Files to touch")
 */
export declare function toCamelKey(name: string): string;
//# sourceMappingURL=camel.d.ts.map