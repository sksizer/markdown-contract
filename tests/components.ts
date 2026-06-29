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
 *
 * The declarative-text-constraints feature (D-0011 / C-0009) is a third pipeline: required /
 * forbidden phrase checks (`requires` / `forbids` / `textRule`) over a section's subtree or the
 * whole document. Its fixtures green in this order:
 *   text-api → text-yaml
 * `text-api` greens the TS predicate-builder surface (the `requires` / `forbids` / `textRule`
 * combinators over the text matcher); `text-yaml` greens the declarative front-end (the closed
 * `requires:` / `forbids:` match-spec vocabulary in `*.contract.yaml`, plus the `.contract.yaml`
 * parity peers). Both seed `false` here — T-TXSC lands the gated fixtures + stub; the matcher
 * (T-TXMC) and builders (T-TXAP) flip `text-api`; the loader (T-TXYL) flips `text-yaml`.
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
  | "infer-cli"
  | "text-api"
  | "text-yaml";

export const IMPLEMENTED: Record<Component, boolean> = {
  projection: false,
  structure: true,
  content: true,
  validate: true,
  consumption: true,
  cli: false,
  "infer-core": true,
  "infer-values": true,
  "infer-meta": true,
  "infer-cli": true,
  // Declarative text constraints (D-0011) — flip order: text-api → text-yaml.
  "text-api": true,
  "text-yaml": false,
};
