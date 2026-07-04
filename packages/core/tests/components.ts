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
 *
 * The structured-cells feature (D-0015 / M-0011) is a fourth pipeline: table cells and list items
 * that TRANSFORM their source string into a typed value (`z.output<cell>`), plus the per-cell
 * source positions that survive the transform. Its fixtures green in this order:
 *   cell-typed → list-typed → cell-pos
 * `cell-typed` greens typed table-row read-back (a `cells` map whose values `.transform()` — e.g. a
 * `Location` cell parsed to `{ path, symbol? }` — read back as the typed row, after capture+read-back
 * lands in T-SCTC/T-SCRB); `list-typed` greens typed list items (a `list({ everyItem })` whose items
 * transform, after the list slice in T-SCLI); `cell-pos` greens position preservation (per-cell
 * `cellPos(...).col` + inline-code `inlineSpans(...)`, after T-SCPP). All three seed `false` here —
 * T-SCFX lands the gated fixtures + the typed-surface stub; each component task flips its own flag.
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
  | "text-yaml"
  | "cell-typed"
  | "list-typed"
  | "cell-pos";

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
  "text-yaml": true,
  // Structured cells (D-0015) — flip order: cell-typed → list-typed → cell-pos.
  "cell-typed": true,
  "list-typed": true,
  "cell-pos": true,
};
