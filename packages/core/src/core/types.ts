/**
 * The public type surface — every interface the engine, runner, and CLI share.
 *
 * This module is **logic-free**: interfaces and type aliases only. The functions
 * (`parse`, `contract`, `validate`, `read`, `runCorpus`, the combinators) and the
 * `ContractError` class are stubbed later in `T-4QM9-framework-skeleton`.
 *
 * Transcribed field-for-field from the capability API sections (`C-0001`..`C-0005`)
 * and the ADRs (`D-0001` finding model, `D-0002` projection, `D-0005` OOM), which in
 * turn derive from `provenance/d0014/proposed-shape.md` §2 (projection), §3 (contract),
 * §4 (findings), §6 (typed model).
 *
 * External types we do not yet depend on are stubbed with TODO-marked placeholders so
 * this surface type-checks before the runtime deps land:
 *   - `ZodType`            → `import type { ZodType } from "zod"`   (T-4QM9 / T-5LW7)
 *   - `Mdast`              → `import type { Root } from "mdast"`    (T-2HF6)
 *   - `MicromarkExtension` → the real micromark extension type      (T-2HF6)
 */

// ── External-type placeholders (replaced when the runtime deps land) ────────────

/**
 * Minimal structural stand-in for zod's `ZodType`, used only to type the content-plane
 * schema slots (frontmatter schema, leaf schemas). The phantom `_output` is what
 * `Infer` reads. Replaced by `import type { ZodType } from "zod"` when zod lands.
 */
export interface ZodType<Output = unknown> {
  /** phantom — the validated output type; never present at runtime */
  readonly _output?: Output;
}

import type { Root } from "mdast";

/** The raw layer-0 unified/remark tree (T-2HF6: `import type { Root } from "mdast"`). */
export type Mdast = Root;

/** A micromark syntax extension. Becomes the real micromark extension type in T-2HF6. */
export type MicromarkExtension = unknown;

// ── Projection (C-0004 / D-0002 / proposed-shape §2) ────────────────────────────

/**
 * A single source point. Deliberately **not** named `Position`: unist/mdast already use
 * `Position` for a start–end range and `Point` for a single point, so a new name avoids
 * a clash with the ecosystem this package imports. Grows `end?` when LSP/SARIF lands.
 */
export interface SourcePos {
  line: number;
  col?: number;
}

/** Options for `parse()` — additive dialects layered on top of the base (GFM + anchors + Obsidian). */
export interface ParseOptions {
  /** Layers *further* dialects on top of the bundled base set; it does not switch the defaults on. */
  extensions?: MicromarkExtension[];
}

export interface DocTree {
  frontmatter: {
    raw: string;
    data: unknown;
    pos: SourcePos;
    /** E2 — maps a Zod issue path to its key's source line. */
    lineForPath(path: (string | number)[]): number | undefined;
  } | null;
  /** verbatim source body after the frontmatter block (the whole doc when none) — pairs with `splitFrontmatter`, set from the same split */
  body: string;
  /** synthetic; `root.sections` are the top-level H2s */
  root: SectionNode;
  /** F1 — the raw layer-0 tree, exposed for analysis (not hidden) */
  mdast: Mdast;
}

export interface SectionNode {
  /** heading text, trimmed (exact, case-sensitive) */
  name: string;
  /** 1..6 */
  depth: number;
  /** source position of the heading */
  pos: SourcePos;
  /** nested subsections, by heading depth */
  sections: SectionNode[];
  /** non-heading content directly in this section (heading-direct only; no hoisting) */
  blocks: BlockNode[];
  /** section-level `^block-id`s (block-bound ids live on `BlockNode.anchor`) */
  anchors: string[];
}

export interface ListItem {
  text: string;
  checked?: boolean;
  pos: SourcePos;
}

export type BlockNode =
  | {
      kind: "table";
      columns: string[];
      rows: string[][];
      /** C3/A3 — row index → source line */
      rowPos(i: number): SourcePos;
      anchor?: string;
      pos: SourcePos;
    }
  | { kind: "list"; ordered: boolean; items: ListItem[]; anchor?: string; pos: SourcePos }
  | { kind: "code"; lang: string | null; value: string; anchor?: string; pos: SourcePos }
  | { kind: "paragraph"; text: string; anchor?: string; pos: SourcePos };

// ── Finding (C-0001 / D-0001 / proposed-shape §4) ───────────────────────────────

/** Severity is **contract data**, not a call-site choice (the commitlint model). */
export type FindingLevel = "error" | "warn" | "report";

/**
 * A machine-applicable repair an external tool could apply. **Provisional / forward-looking**:
 * `Finding.fix` only *describes* a remedy — this engine never edits documents (applying is a
 * separate repair pass). Shape firmed up if/when a repair pass is built.
 */
export interface TextEdit {
  range: { start: SourcePos; end: SourcePos };
  newText: string;
}

export interface Finding {
  /** namespaced `area/.../name`, e.g. "structure/section-missing" */
  id: string;
  level: FindingLevel;
  /** the source document's file path (`ctx.path`), for `<path>:<line>` — not a structural path */
  path: string;
  /** omitted for whole-document absence findings */
  pos?: SourcePos;
  message: string;
  /** describes only; applying is a separate repair pass */
  fix?: { description: string; edit?: TextEdit };
}

// ── Contract & grammar (C-0005 / proposed-shape §3) ─────────────────────────────

export type BlockKind = "table" | "list" | "code" | "paragraph";

/** A content leaf — a structural kind-gate (checked first) plus a content Zod schema over the node. */
export interface LeafSpec {
  kind: BlockKind;
  schema: ZodType;
  /**
   * The raw leaf config (`table`/`list`/`code`/`maxWords` arguments), stashed inert so the
   * content plane (T-5LW7) can build the real `schema` later. The structure plane reads only
   * `kind`; this carries everything else through untouched.
   */
  config?: unknown;
}

/** `order` and `allowUnknown` are independent knobs over a level's content model. */
export interface LevelOpts {
  order?: "none" | "recognized-relative" | "strict";
  allowUnknown?: boolean;
}

export interface SectionOpts {
  optional?: boolean;
  /** a single leaf, or named leaves bound by `^anchor` */
  content?: LeafSpec | Record<string, LeafSpec>;
  /** nested subsequence (recursion) */
  children?: SectionSeq;
  /** node-local named rules */
  rules?: Rule[];
  /** require a `^block-id`, e.g. "summary" */
  anchor?: string;
}

/**
 * One element of a level's ordered content model — the opaque output of
 * `section()` / `optional()` / `oneOf()` / `gap()`. Authors never construct it directly;
 * they pass an ordered `Spec[]` to `sections()`. Internally a tagged union of the four kinds.
 */
export type Spec = SectionSpec | OptionalSpec | OneOfSpec | GapSpec;

export interface SectionSpec {
  readonly kind: "section";
  /** a single name, or an alias set */
  readonly names: string[];
  readonly opts?: SectionOpts;
}
export interface OptionalSpec {
  readonly kind: "optional";
  readonly spec: Spec;
}
export interface OneOfSpec {
  readonly kind: "oneOf";
  readonly names: string[];
  readonly opts?: SectionOpts;
}
export interface GapSpec {
  readonly kind: "gap";
  readonly min?: number;
  readonly max?: number;
}

/** The opaque body grammar — the output of `sections(opts, specs)`, carrying the inferred body type `B`. */
export interface SectionSeq<B = unknown> {
  readonly __brand: "SectionSeq";
  readonly opts: LevelOpts;
  readonly specs: readonly Spec[];
  /** phantom — carries the inferred body type `B`; never present at runtime */
  readonly _body?: B;
}

/** The rule author's finding factory — the engine fills `path` / `level` / `pos` and the id's default level. */
export interface Ctx {
  path: string;
  finding(f: { id: string; message: string; level?: FindingLevel; pos?: SourcePos }): Finding;
}

/** A per-node named rule — the opaque output of `rule(id, fn)`. */
export interface Rule {
  readonly __brand: "Rule";
  readonly id: string;
  run(node: SectionNode, ctx: Ctx): Finding[];
}

/**
 * A cross-plane / cross-file named rule — the opaque output of `docRule(id, fn)`. Sees the whole
 * typed doc, and also receives the projected `DocTree` so a whole-document scope can pin a finding
 * at the exact offending source line (the typed model alone does not expose per-paragraph lines).
 */
export interface DocRule {
  readonly __brand: "DocRule";
  readonly id: string;
  run(doc: Doc, ctx: Ctx, tree: DocTree): Finding[];
}

/** The unit an author passes to `contract()` — frontmatter schema, body grammar, cross-plane rules. */
export interface ContractDef<F = unknown, B = unknown> {
  /** per-type Zod (reuse a schema, or inline) */
  frontmatter?: ZodType<F>;
  /** the body grammar — `sections(...)` */
  body?: SectionSeq<B>;
  /** cross-plane rules: see both frontmatter and body */
  rules?: DocRule[];
}

/** The validation context — the source document's file path, used only to stamp `<path>:<line>`. */
export interface ValidateCtx {
  path: string;
}

/**
 * A compiled contract for one markdown class — two doors onto one engine, mirroring
 * Zod's `safeParse` / `parse`. The output of `contract(def)`.
 */
export interface Contract<F = unknown, B = unknown> {
  /** "show me everything" — never throws; findings as data. Parses with the bundled dialect-aware projection. */
  validate(source: string, ctx: ValidateCtx): ValidationResult<F, B>;
  /** reuse a pre-parsed tree — parse once, validate several contracts (or feed a custom projection). */
  validate(tree: DocTree, ctx: ValidateCtx): ValidationResult<F, B>;
  /** "give me the data or fail" — returns the typed model, or throws `ContractError` on an error-level finding. */
  read(source: string, ctx: ValidateCtx): Doc<F, B>;
}

/** One `ValidationResult` from one pass — findings from every plane, the projection always, the model iff valid. */
export interface ValidationResult<F = unknown, B = unknown> {
  /** frontmatter + structure + content + rule, merged, deterministically sorted */
  findings: Finding[];
  /** the typed model — present iff no error-level finding */
  doc?: Doc<F, B>;
  /** the raw projection (`tree.mdast`, `lineForPath`) — always returned */
  tree: DocTree;
}

// ── Consumption / typed model (C-0002 / D-0005 / proposed-shape §6) ──────────────

export interface TableView<Row = Record<string, string>> extends Iterable<Row> {
  kind: "table";
  columns: string[];
  rows: Row[];
  rowCount: number;
  pos: SourcePos;
  column<K extends keyof Row>(name: K): Row[K][];
  find(p: (row: Row, i: number) => boolean): Row | undefined;
  rowPos(i: number): SourcePos;
}

export interface ListView extends Iterable<ListItem> {
  kind: "list";
  ordered: boolean;
  items: ListItem[];
  length: number;
  pos: SourcePos;
}

export interface CodeView {
  kind: "code";
  lang: string | null;
  value: string;
  pos: SourcePos;
}

export interface ParagraphView {
  kind: "paragraph";
  text: string;
  pos: SourcePos;
}

/** A content block addressed through the model — discriminated on `.kind`. */
export type BlockView = TableView | ListView | CodeView | ParagraphView;

/**
 * The dual-key section access object (`doc.body` and `SectionView.sections`): exact heading text,
 * generated lowerCamelCase alias, and a `.section()` accessor resolve to one section. A declared
 * section keys to its `SectionView`, EXCEPT the "heading is the table" case — a section whose sole
 * `content` is a single `table(...)` leaf promotes its key to that `TableView` directly
 * (proposed-shape §6); `.section(name)` always returns the underlying `SectionView`. `unknown` is
 * always present (`[]` when none), holding gap-admitted / `allowUnknown` sections in document order.
 * `unknown` and `section` are NON-ENUMERABLE, so a group with no declared section deep-equals `{}`.
 */
export interface SectionGroup {
  /** gap-admitted / allowUnknown sections; always present (`[]` when none), document order */
  unknown: SectionView[];
  /** explicit accessor for dynamic / edge heading names — always the underlying `SectionView` */
  section(name: string): SectionView | undefined;
  [key: string]:
    | SectionView
    | TableView<Record<string, string>>
    | SectionView[]
    | ((name: string) => SectionView | undefined)
    | undefined;
}

/**
 * A heading-delimited section — holds blocks and nested sections; **not** itself a `BlockView`.
 * A `content` record of `^anchor`-bound tables also surfaces each as a named `TableView` field
 * (`doc.body.decision.components`), hence the `TableView` arm of the index signature.
 */
export interface SectionView {
  name: string;
  pos: SourcePos;
  anchors: string[];
  /** default "prose" (own paragraphs); "all" = the section's subtree */
  text(scope?: "prose" | "all"): string;
  /** the sole table, if exactly one (untyped) */
  table?: TableView<Record<string, string>>;
  tables: TableView<Record<string, string>>[];
  lists: ListView[];
  byAnchor(id: string): BlockView | undefined;
  /** same dual-key shape as `doc.body` */
  sections: SectionGroup;
  /** named-table fields from a `content` record (each `^anchor`-bound table), plus the members above */
  [key: string]:
    | string
    | SourcePos
    | string[]
    | TableView<Record<string, string>>
    | TableView<Record<string, string>>[]
    | ListView[]
    | SectionGroup
    | ((scope?: "prose" | "all") => string)
    | ((id: string) => BlockView | undefined)
    | undefined;
}

/** The typed, navigable model — the same model `read()` returns and `validate().doc` hands back. */
export type Doc<F = unknown, B = unknown> = {
  frontmatter: F;
  body: B;
  byAnchor(id: string): BlockView | undefined;
};

/**
 * The inference entry point — a contract's typed model. For a `Contract<F, B>`, `Infer<C>`
 * resolves to the runtime `Doc` shape: the frontmatter type `F` (from the frontmatter Zod),
 * the body grammar's inferred type `B` intersected with the dual-key `SectionGroup` surface
 * (so a consumer always has exact-bracket / `.section()` / `unknown` access alongside whatever
 * typed keys `B` carries), and the doc-wide `byAnchor`.
 *
 * SCOPE (deliberate, pragmatic). `Infer` is sound and useful at the TOP level — it gives
 * consumers `frontmatter`, dual-key `body` access, and `byAnchor`. It does NOT yet perform
 * per-section / per-column LITERAL inference: mapping each declared section name to its own
 * typed `SectionView` key, or each declared table's `cells` to a typed `Row`, would require
 * reworking the `sections` / `section` / `table` combinators to carry literal types through
 * their generics — a large, separate effort out of proportion to this surface, and one the
 * consumption fixtures (which navigate via `(doc.body as any)`) do not depend on. That literal
 * refinement is left as deliberate future work; `B & SectionGroup` keeps `Infer` correct and
 * navigable in the meantime.
 */
export type Infer<C> =
  C extends Contract<infer F, infer B>
    ? {
        frontmatter: F;
        body: B & SectionGroup;
        byAnchor(id: string): BlockView | undefined;
      }
    : never;
