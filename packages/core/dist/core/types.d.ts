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
/**
 * A single source point. Deliberately **not** named `Position`: unist/mdast already use
 * `Position` for a start–end range and `Point` for a single point, so a new name avoids
 * a clash with the ecosystem this package imports. Grows `end?` when LSP/SARIF lands.
 */
export interface SourcePos {
    line: number;
    col?: number;
}
/**
 * One inline-code run's source span (C1 / T-SCPP). `flattenInline` collapses an `inlineCode`
 * node to its bare `value` — the backtick delimiters and their byte range are lost — so a
 * position-precise consumer (e.g. `scan-placeholders`, which must skip a `<T>` written as inline
 * code) cannot tell inline code apart from prose in the flattened text. This overlay preserves it:
 * emitted alongside the flattened cell / paragraph string, one span per inline-code run.
 *
 * `start` / `end` are the mdast node's NATIVE `position` endpoints (threaded through, not
 * recomputed): `start` sits on the opening backtick; `end` is one column PAST the closing backtick
 * (unist's half-open, end-exclusive convention). `raw` is the verbatim source slice between those
 * offsets — the full backticked text, delimiters included — so multi-backtick spans round-trip exactly.
 */
export interface InlineSpan {
    start: SourcePos;
    end: SourcePos;
    raw: string;
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
export type BlockNode = {
    kind: "table";
    columns: string[];
    rows: string[][];
    /** C3/A3 — row index → source line */
    rowPos(i: number): SourcePos;
    /**
     * C1 (T-SCPP) — the per-cell source position with `col` SET (full precision, not just the
     * row line). `row` / `col` are 0-based body-row / column indices; `col` locates the cell's
     * content start (the first inline child's source column). Additive: rides on a closure,
     * never serializing onto the public `tree`.
     */
    cellPos(row: number, col: number): SourcePos;
    /**
     * C1 (T-SCPP) — the inline-code spans inside the cell at (`row`, `col`), in document order;
     * `[]` when the cell has none. Each span carries the byte/column range + raw backticked text,
     * so a consumer can recover what `flattenInline` collapsed away. Closure-backed, additive.
     */
    inlineSpans(row: number, col: number): InlineSpan[];
    /**
     * A1 — the sparse typed overlay beside the raw `rows`. Returns the cached `z.output` of a
     * declared `cells` schema for the cell at (`row`, column-name `col`), or `undefined` when no
     * transform cached a value there (the common case — a plain-string table caches nothing).
     * Populated by the content plane's EXISTING per-cell `safeParse` pass; it rides on a closure,
     * not an enumerable property, so it never serializes onto the public `tree`.
     */
    typed(row: number, col: string): unknown | undefined;
    /** Internal writer — the content plane caches a successful cell `safeParse`'s output here. */
    setTyped(row: number, col: string, value: unknown): void;
    anchor?: string;
    pos: SourcePos;
} | {
    kind: "list";
    ordered: boolean;
    items: ListItem[];
    /**
     * A1 — the sparse typed overlay beside the raw `items` (the list analogue of the table
     * `typed(row, col)` overlay). Returns the cached `z.output` of a declared `everyItem` schema
     * for the item at index `i`, or `undefined` when no transform cached a value there (the common
     * case — a plain list, or a `"checkbox"` gate, caches nothing). Populated by the content
     * plane's EXISTING per-item `safeParse` pass; it rides on a closure, not an enumerable
     * property, so it never serializes onto the public `tree`.
     */
    typedItem(i: number): unknown | undefined;
    /** Internal writer — the content plane caches a successful item `safeParse`'s output here. */
    setTypedItem(i: number, value: unknown): void;
    anchor?: string;
    pos: SourcePos;
} | {
    kind: "code";
    lang: string | null;
    value: string;
    anchor?: string;
    pos: SourcePos;
} | {
    kind: "paragraph";
    text: string;
    anchor?: string;
    pos: SourcePos;
    /**
     * C1 (T-SCPP) — the inline-code spans in this paragraph, in document order (`[]` when none).
     * The paragraph analogue of the table cell's `inlineSpans` — same closure-backed, additive overlay.
     */
    inlineSpans(): InlineSpan[];
};
/** Severity is **contract data**, not a call-site choice (the commitlint model). */
export type FindingLevel = "error" | "warn" | "report";
/**
 * A machine-applicable repair an external tool could apply. **Provisional / forward-looking**:
 * `Finding.fix` only *describes* a remedy — this engine never edits documents (applying is a
 * separate repair pass). Shape firmed up if/when a repair pass is built.
 */
export interface TextEdit {
    range: {
        start: SourcePos;
        end: SourcePos;
    };
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
    fix?: {
        description: string;
        edit?: TextEdit;
    };
}
export type BlockKind = "table" | "list" | "code" | "paragraph";
/**
 * A content leaf — a structural kind-gate (checked first) plus a content Zod schema over the node.
 *
 * `Row` and `Item` are phantoms (never present at runtime) carrying the leaf's typed read-back shape:
 *   - `Row` — for a `table(...)` leaf, the row a transforming `cells` map projects to (`z.output` per
 *     cell, e.g. a `Location` cell that `.transform()`s a string into `{ path, symbol? }`);
 *   - `Item` — for a `list(...)` leaf, the item a transforming `everyItem` schema projects to
 *     (`z.output<everyItem>`, e.g. an `AC-1: …` string parsed into `{ ref, text }` — T-SCLI).
 * `table()` / `list()` are generic over their schemas so their return type surfaces the read-back
 * shape here; `section()` → `sections()` → `Infer` thread it into `TableView<Row>` / `ListView<Item>`
 * (T-SCRB / T-SCLI). Both default to `unknown`, so a bare `LeafSpec` (and the untyped leaves) are
 * unchanged.
 */
export interface LeafSpec<Row = unknown, Item = unknown> {
    kind: BlockKind;
    schema: ZodType;
    /**
     * The raw leaf config (`table`/`list`/`code`/`maxWords` arguments), stashed inert so the
     * content plane (T-5LW7) can build the real `schema` later. The structure plane reads only
     * `kind`; this carries everything else through untouched.
     */
    config?: unknown;
    /** phantom — the typed row a transforming `cells` map reads back to; never present at runtime. */
    readonly _row?: Row;
    /** phantom — the typed item a transforming `everyItem` schema reads back to; never at runtime. */
    readonly _item?: Item;
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
    /**
     * Repeatable slot (T-1TA2). When `true`, the declared heading may recur as peers at one level:
     * the structure plane admits every occurrence (no `structure/duplicate-section` / `key-collision`),
     * and the consumption model binds the slot's dual-key key to an ARRAY of the per-occurrence value
     * (a `SectionView`, or a promoted `TableView<Row>`) in document order. Non-repeatable slots keep
     * today's per-level-uniqueness rule (D-0003); a bare `section("Name")` is unchanged.
     */
    repeatable?: boolean;
    /** Minimum occurrence count for a repeatable slot (below → `structure/repeat-count`). Requires `repeatable: true`. */
    min?: number;
    /** Maximum occurrence count for a repeatable slot (above → `structure/repeat-count`). Requires `repeatable: true`. */
    max?: number;
}
/**
 * One element of a level's ordered content model — the opaque output of
 * `section()` / `optional()` / `oneOf()` / `gap()`. Authors never construct it directly;
 * they pass an ordered `Spec[]` to `sections()`. Internally a tagged union of the four kinds.
 */
export type Spec = SectionSpec | OptionalSpec | OneOfSpec | GapSpec;
/**
 * A declared section slot. Generic (T-SCRB) over the typed value its dual-key key binds (`Value`)
 * and its declared heading name(s) (`Names`) so `sections()` can infer a typed body from the spec
 * array; both default to the untyped shape, so a bare `SectionSpec` is unchanged and every
 * existing call site keeps working. The phantom `_value` never exists at runtime.
 */
export interface SectionSpec<Value = unknown, Names extends readonly string[] = string[]> {
    readonly kind: "section";
    /** a single name, or an alias set */
    readonly names: Names;
    readonly opts?: SectionOpts;
    /** phantom — the typed value this section's key binds (a `TableView<Row>` or `SectionView`); never at runtime */
    readonly _value?: Value;
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
    finding(f: {
        id: string;
        message: string;
        level?: FindingLevel;
        pos?: SourcePos;
    }): Finding;
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
export interface TableView<Row = Record<string, string>> extends Iterable<Row> {
    kind: "table";
    columns: string[];
    rows: Row[];
    rowCount: number;
    pos: SourcePos;
    column<K extends keyof Row>(name: K): Row[K][];
    find(p: (row: Row, i: number) => boolean): Row | undefined;
    rowPos(i: number): SourcePos;
    /**
     * C1 (T-SCPP) — the per-cell source position with `col` set, located by a `row` OBJECT (from
     * `rows`) and a column `name`. Delegates to the projection's per-cell overlay; `{ line: 0 }`
     * when the row / column is not found.
     */
    cellPos(row: Row, name: string): SourcePos;
}
/**
 * A list block addressed through the model. `Item` defaults to the raw `ListItem` (each `.text` a
 * string); a `list({ everyItem })` whose schema `.transform()`s reads each item back as its typed
 * `z.output<everyItem>` (T-SCLI), the list analogue of `TableView<Row>`. The typed items flow only
 * through this model — the projected `tree` items stay raw. `Infer`'s `ListView<Item>` types them
 * statically for a declared transforming list; an undeclared / no-transform list stays `ListItem`.
 */
export interface ListView<Item = ListItem> extends Iterable<Item> {
    kind: "list";
    ordered: boolean;
    items: Item[];
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
    [key: string]: SectionView | TableView<Record<string, string>> | SectionView[] | TableView<Record<string, string>>[] | ((name: string) => SectionView | undefined) | undefined;
}
/**
 * A heading-delimited section — holds blocks and nested sections; **not** itself a `BlockView`.
 * A `content` record of `^anchor`-bound tables also surfaces each as a named `TableView` field
 * (`doc.body.decision.components`), hence the `TableView` arm of the index signature.
 *
 * `LI` (T-SCLI) is the typed list-item read-back shape: it defaults to the raw `ListItem`, but a
 * section whose sole `content` is a transforming `list({ everyItem })` refines to `SectionView<Item>`
 * so its `.lists` read back as `ListView<Item>` (the list analogue of the "heading is the table"
 * promotion — same runtime `SectionView`, refined type). Every other section keeps the default.
 */
export interface SectionView<LI = ListItem> {
    name: string;
    pos: SourcePos;
    anchors: string[];
    /** default "prose" (own paragraphs); "all" = the section's subtree */
    text(scope?: "prose" | "all"): string;
    /** the sole table, if exactly one (untyped) */
    table?: TableView<Record<string, string>>;
    tables: TableView<Record<string, string>>[];
    lists: ListView<LI>[];
    byAnchor(id: string): BlockView | undefined;
    /** same dual-key shape as `doc.body` */
    sections: SectionGroup;
    /** named-table fields from a `content` record (each `^anchor`-bound table), plus the members above */
    [key: string]: string | SourcePos | string[] | TableView<Record<string, string>> | TableView<Record<string, string>>[] | ListView<LI>[] | SectionGroup | ((scope?: "prose" | "all") => string) | ((id: string) => BlockView | undefined) | undefined;
}
/** The typed, navigable model — the same model `read()` returns and `validate().doc` hands back. */
export type Doc<F = unknown, B = unknown> = {
    frontmatter: F;
    body: B;
    byAnchor(id: string): BlockView | undefined;
    /**
     * C1 (T-SCPP) — the inline-code spans inside a table cell, located by a `row` OBJECT and a
     * column `name`, resolved against whichever table in the document holds that row. `[]` when the
     * cell has no inline code (or the row is not found). The doc-wide companion to
     * `TableView.cellPos`, so a masking consumer can reach spans without first holding the table view.
     */
    inlineSpans(row: Record<string, string>, col: string): InlineSpan[];
};
/** Collapse a union into an intersection — merges each section spec's body-key contribution. */
export type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
/**
 * The typed value a declared section's dual-key key binds (T-SCRB / T-SCLI). Two typed cases:
 *   - a section whose sole `content` is a transforming `table(...)` leaf PROMOTES to that table's
 *     typed `TableView<Row>` (the "heading is the table" case, §6 — `Row` being `RowOf<cols, cells>`);
 *   - a section whose sole `content` is a transforming `list({ everyItem })` leaf refines to
 *     `SectionView<Item>`, so its `.lists` read back as `ListView<Item>` (`Item = z.output<everyItem>`).
 * The list case keeps the runtime `SectionView` (lists do not promote — the model exposes them on
 * `.lists`); only the item type is refined. Every other section (prose, a non-typed leaf, a `content`
 * record, or no content) binds the plain `SectionView`. `Item` is checked before `Row` so a list leaf
 * (whose `_row` phantom is `unknown`) is not mistaken for a table.
 */
export type SectionValue<O> = O extends {
    repeatable: true;
} ? SectionValueBase<O>[] : SectionValueBase<O>;
/**
 * The per-occurrence typed value a section binds, before the repeatable wrap. This is the base
 * computation {@link SectionValue} keeps for a non-repeatable slot; a `repeatable: true` slot binds
 * an ARRAY of this (T-1TA2), so `section(name, { repeatable: true, content: table(...) })` reads back
 * `TableView<Row>[]` and a bare repeatable prose section reads back `SectionView[]`.
 */
export type SectionValueBase<O> = O extends {
    content: infer Ct;
} ? Ct extends LeafSpec<infer Row, infer Item> ? unknown extends Item ? unknown extends Row ? SectionView : TableView<Row> : SectionView<Item> : SectionView : SectionView;
/**
 * One section spec's contribution to the typed body: each of its declared heading name(s) keyed to
 * the value that name binds. A spec whose names are not literal (a dynamic `string` name) or a
 * non-`section` spec (`optional` / `oneOf` / `gap`) contributes nothing — those read back through
 * `.section(name)`, not a statically-typed key.
 */
export type BodyEntry<Sp> = Sp extends SectionSpec<infer Value, infer Names> ? string extends Names[number] ? Record<never, never> : {
    [K in Names[number]]: Value;
} : Record<never, never>;
/**
 * The typed body a `sections([...])` grammar infers (T-SCRB): each declared section's exact heading
 * name keyed to the value it binds (a promoted `TableView<Row>` or a `SectionView`), beside the
 * always-present dual-key members (`unknown`, `.section(name)`). This is the per-section / per-column
 * literal inference `Infer`'s docstring once deferred — a declared table's `cells` reach a typed
 * `Row` here. Undeclared / dynamic access still goes through `.section(name)`.
 */
export type BodyOf<S extends readonly Spec[]> = UnionToIntersection<BodyEntry<S[number]>> & {
    unknown: SectionView[];
    section(name: string): SectionView | undefined;
};
/** Normalize a `section()` name argument (a single name or an alias set) to a names tuple. */
export type NamesTupleOf<Names extends string | readonly string[]> = Names extends readonly string[] ? Names : [Names];
/**
 * The inference entry point — a contract's typed model. For a `Contract<F, B>`, `Infer<C>`
 * resolves to the runtime `Doc` shape: the frontmatter type `F` (from the frontmatter Zod), the
 * body grammar's inferred type `B`, and the doc-wide `byAnchor`.
 *
 * As of T-SCRB, `B` (built by `sections([...])` via {@link BodyOf}) carries the per-section /
 * per-column literal inference: each declared section's exact heading name keys to its typed value,
 * and a declared table's `cells` reach a typed `TableView<Row>` (`row.Location` reads back the
 * parsed object; an undeclared column stays `string`). So `Infer<C>["body"]` returns `B` directly
 * when it is a typed body group; a contract with a non-inferred / opaque `B` (`unknown`) falls back
 * to the navigable `SectionGroup` surface, as before.
 */
export type Infer<C> = C extends Contract<infer F, infer B> ? {
    frontmatter: F;
    body: unknown extends B ? SectionGroup : B;
    byAnchor(id: string): BlockView | undefined;
    inlineSpans(row: Record<string, string>, col: string): InlineSpan[];
} : never;
//# sourceMappingURL=types.d.ts.map