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
 *
 * The config-inference feature (D-0009) is a second, independent pipeline layered over the
 * declarative front-end. Its fixtures green in this order:
 *   infer-core → infer-values → infer-meta → infer-cli
 * `infer-core` greens section/order/grouping shape (single-contract); `infer-values` greens
 * the frontmatter value-type ladder; `infer-meta` greens directory+depth grouping, full-path
 * naming, root contracts and stranded-file warnings; `infer-cli` greens the `init` verb.
 */
export type Component =
  | "projection"
  | "structure"
  | "content"
  | "validate"
  | "consumption"
  | "cli"
  | "infer-core"
  | "infer-values"
  | "infer-meta"
  | "infer-cli";

export const IMPLEMENTED: Record<Component, boolean> = {
  projection: false,
  structure: true,
  content: true,
  validate: true,
  consumption: true,
  cli: false,
  "infer-core": true,
  "infer-values": true,
  "infer-meta": false,
  "infer-cli": false,
};
