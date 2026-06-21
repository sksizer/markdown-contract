/**
 * The incremental-greening switch.
 *
 * Every fixture is tagged with the pipeline component that *gates* it — the last
 * component it needs implemented to pass (earlier components land first, in task
 * order). A fixture runs only when `IMPLEMENTED[component]` is `true`; otherwise the
 * harness skips it (green, not failing).
 *
 * An implementation task greens its slice by flipping ITS flag to `true` in the same
 * PR that lands the component. Pipeline order (and the order the flags flip):
 *   projection → structure → content → validate → consumption → cli
 */
export type Component =
  | "projection"
  | "structure"
  | "content"
  | "validate"
  | "consumption"
  | "cli";

export const IMPLEMENTED: Record<Component, boolean> = {
  projection: false,
  structure: true,
  content: true,
  validate: false,
  consumption: false,
  cli: false,
};
