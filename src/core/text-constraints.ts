/**
 * Declarative text-constraint builders — `requires` / `forbids` (section-scoped) and
 * `textRule` (document-scoped). They attach required / forbidden phrase checks to a contract,
 * compiling to the engine's existing node-local `rule` / cross-plane `docRule` machinery
 * (D-0011 / C-0009): "does this literal-or-regex appear (or not) in this scope, the right
 * number of times?". This is the TS-API surface the declarative `requires:` / `forbids:` YAML
 * keys compile to, so both authoring surfaces share one implementation and one set of findings.
 *
 * Each builder is a thin scope-resolver over the text-match core (`text-match.ts`):
 *
 *   - `requires(specs)` / `forbids(specs)` → a node-local `Rule`. The matcher runs over the
 *     bound section's *subtree text* (every block — prose, list items, table cells, code — of
 *     the section and its descendants, reconstructed line-faithfully from the projected
 *     `SectionNode` so a `forbids` hit reports its real source line). The `scopeKey` is the
 *     section's generated lowerCamelCase key; a `requires` miss / count violation pins at the
 *     section heading.
 *   - `textRule({ requires?, forbids? })` → a cross-plane `DocRule` over the WHOLE document.
 *     The `DocRule` sees only the typed `Doc`, whose `SectionView`s expose list / table
 *     positions but NOT per-paragraph source lines, so the whole-document text is reconstructed
 *     as line-faithfully as the typed model allows (see {@link placeSectionView}). The
 *     `scopeKey` is the literal `"doc"`; a `requires` miss is document-level (no position).
 *
 * Purity (D-0011): a `requires` entry whose bound expresses ABSENCE (`max: 0`, or `max < min`)
 * is a constructor-time error — the absence form is `forbids`. The check fires when `requires(...)`
 * (or the `requires` arm of `textRule(...)`) is *called*, not at validation time.
 */
import { toCamelKey } from "./camel.js";
import { ContractBuildError } from "./grammar.js";
import { buildTextFindings, matchText } from "./text-match.js";
import type { TextMatchSpec } from "./text-match.js";
import type {
  BlockNode,
  Ctx,
  Doc,
  DocRule,
  Finding,
  Rule,
  SectionGroup,
  SectionNode,
  SectionView,
} from "./types.js";

/**
 * One required / forbidden text-match entry — the closed match-spec vocabulary (D-0011 § The
 * match spec). This is the matcher's `TextMatchSpec` re-exported verbatim, so the authoring
 * surface and the matcher core never diverge: exactly one of `pattern` (a literal substring) or
 * `regex` (a regex source) supplies the needle; `normalize` / `ignoreCase` tune matching;
 * `min` / `max` bound the count; `id` pins identity; `note` / `level` shape the finding.
 */
export type { TextMatchSpec } from "./text-match.js";

/**
 * The document-scoped options for `textRule(...)` — `requires` / `forbids` lists, each a set of
 * independent whole-document checks (the body-root form of D-0011's `requires:` / `forbids:`).
 */
export interface TextRuleSpec {
  requires?: TextMatchSpec[];
  forbids?: TextMatchSpec[];
}

// ── Purity (D-0011): a `requires` entry may not express absence ────────────────────────

/** The needle as it reads in an error message — `"literal"` for a pattern, `/source/` for a regex. */
function specRepr(spec: TextMatchSpec): string {
  if (spec.regex !== undefined) return `/${spec.regex}/`;
  return `"${spec.pattern ?? ""}"`;
}

/**
 * Reject a `requires` entry whose count bound expresses ABSENCE — `max: 0`, or any `max` below
 * the entry's effective minimum (`min`, default 1). A "this scope must NOT contain X" check is
 * the `forbids` form, not a `requires` with `max: 0`. Thrown at construction (a contract-authoring
 * error), mirroring `grammar.ts`'s build-time `ContractBuildError` convention.
 */
function assertRequiresPurity(specs: TextMatchSpec[]): void {
  for (const spec of specs) {
    const floor = Math.max(spec.min ?? 1, 1);
    if (spec.max !== undefined && spec.max < floor) {
      throw new ContractBuildError(
        "contract/text-requires-purity",
        `requires(${specRepr(spec)}): a requires entry may not express absence ` +
          `(max ${spec.max} < ${floor}); use forbids(...) for an absence check`,
      );
    }
  }
}

// ── Line-faithful scope-text reconstruction ────────────────────────────────────────────

/**
 * Accumulates text fragments at their 1-based source lines and renders them into one string
 * whose newline structure mirrors the source — so the matcher's positions land on real source
 * lines. A fragment may itself be multi-line (a paragraph's soft-wrapped prose); each of its
 * lines is placed on a consecutive source line. Two fragments on one line are space-joined.
 */
class LineBuffer {
  private lines: string[] = [];

  place(line: number, text: string): void {
    if (text === "") return;
    const parts = text.split("\n");
    for (let i = 0; i < parts.length; i++) {
      const idx = line - 1 + i;
      if (idx < 0) continue;
      while (this.lines.length <= idx) this.lines.push("");
      const existing = this.lines[idx]!;
      this.lines[idx] = existing === "" ? parts[i]! : `${existing} ${parts[i]!}`;
    }
  }

  render(): string {
    return this.lines.join("\n");
  }
}

/** Place one projected block's text at its real source line(s). */
function placeBlock(buf: LineBuffer, block: BlockNode): void {
  switch (block.kind) {
    case "paragraph":
      buf.place(block.pos.line, block.text);
      break;
    case "list":
      for (const item of block.items) buf.place(item.pos.line, item.text);
      break;
    case "code":
      buf.place(block.pos.line, block.value);
      break;
    case "table":
      buf.place(block.pos.line, block.columns.join(" "));
      block.rows.forEach((row, i) => buf.place(block.rowPos(i).line, row.join(" ")));
      break;
  }
}

/**
 * The section's subtree text, reconstructed line-faithfully from the projected `SectionNode`:
 * every block (prose, list items, table cells, code) of this section and every descendant,
 * placed at its real source line. Built from the `SectionNode` (not the typed `SectionView`),
 * so per-block positions are exact and a `forbids` hit reports its true source line.
 */
function sectionScopeText(node: SectionNode): string {
  const buf = new LineBuffer();
  const walk = (n: SectionNode): void => {
    for (const block of n.blocks) placeBlock(buf, block);
    for (const child of n.sections) walk(child);
  };
  walk(node);
  return buf.render();
}

/** Is `v` a `SectionView` (vs a promoted `TableView`) — discriminated on `SectionView`'s `text` member. */
function isSectionView(v: unknown): v is SectionView {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Partial<SectionView>).text === "function" &&
    typeof (v as Partial<SectionView>).byAnchor === "function"
  );
}

/**
 * Every `SectionView` in a dual-key `SectionGroup`, de-duplicated. A group keys each declared
 * section under both its exact heading and its camel alias (and a "heading is the table" section
 * binds a `TableView` instead) — so views are gathered through the exact-name `.section()`
 * accessor and the non-enumerable `unknown` list, with a `Set` collapsing the aliases.
 */
function collectSectionViews(group: SectionGroup): SectionView[] {
  const seen = new Set<SectionView>();
  const out: SectionView[] = [];
  const add = (v: SectionView | undefined): void => {
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  };
  for (const v of group.unknown) add(v);
  for (const key of Object.keys(group)) {
    const viaExact = group.section(key);
    if (viaExact) {
      add(viaExact);
      continue;
    }
    const val = group[key];
    if (isSectionView(val)) add(val);
  }
  return out;
}

/**
 * Place one `SectionView`'s text into the whole-document buffer. Lists and tables carry exact
 * source positions and are placed faithfully; the typed model does NOT expose per-paragraph
 * source lines, so a section's prose is anchored just after its heading (`pos.line + 1`) — the
 * best the typed `Doc` allows. (LIMITATION: a paragraph separated from its heading by a blank
 * line therefore reports one line early; a fully line-exact whole-document scope would need the
 * `DocRule` to see the projected tree, not just the model.) Recurses into nested sections.
 */
function placeSectionView(buf: LineBuffer, view: SectionView): void {
  const prose = view.text("prose");
  if (prose !== "") buf.place(view.pos.line + 1, prose);
  for (const list of view.lists) {
    for (const item of list.items) buf.place(item.pos.line, item.text);
  }
  for (const table of view.tables) {
    buf.place(table.pos.line, table.columns.join(" "));
    table.rows.forEach((row, i) =>
      buf.place(table.rowPos(i).line, table.columns.map((c) => row[c] ?? "").join(" ")),
    );
  }
  for (const child of collectSectionViews(view.sections)) placeSectionView(buf, child);
}

/** The whole-document scope text, reconstructed as line-faithfully as the typed `Doc` allows. */
function docScopeText(doc: Doc): string {
  const buf = new LineBuffer();
  const body = doc.body as unknown as SectionGroup;
  for (const view of collectSectionViews(body)) placeSectionView(buf, view);
  return buf.render();
}

// ── The builders ───────────────────────────────────────────────────────────────────────

/**
 * Require each listed phrase to be PRESENT in the bound section's subtree text — a node-local
 * `Rule` for a section's `rules: [...]` slot (the section-scoped form of D-0011's `requires:`).
 * Each entry emits its own `text/requires` finding at the section heading when its phrase is
 * absent (or `text/count` when a `min` / `max` bound is violated). Rejects an absence-form
 * entry (`max: 0` / `max < min`) at construction (use {@link forbids}).
 */
export function requires(specs: TextMatchSpec[]): Rule {
  assertRequiresPurity(specs);
  return {
    __brand: "Rule",
    id: "text/requires",
    run(node: SectionNode, ctx: Ctx): Finding[] {
      const scopeKey = toCamelKey(node.name);
      const text = sectionScopeText(node);
      const out: Finding[] = [];
      for (const spec of specs) {
        out.push(
          ...buildTextFindings({
            kind: "requires",
            spec,
            match: matchText(text, spec),
            scopeKey,
            scope: node.name,
            scopePos: node.pos,
            ctx,
          }),
        );
      }
      return out;
    },
  };
}

/**
 * Forbid each listed phrase from appearing in the bound section's subtree text — a node-local
 * `Rule` for a section's `rules: [...]` slot (the section-scoped form of D-0011's `forbids:`).
 * Each entry emits a `text/forbids` finding at the offending line for every hit (or `text/count`
 * at the heading when a positive `max` cap is exceeded). `forbids` is the absence form, so there
 * is no purity restriction.
 */
export function forbids(specs: TextMatchSpec[]): Rule {
  return {
    __brand: "Rule",
    id: "text/forbids",
    run(node: SectionNode, ctx: Ctx): Finding[] {
      const scopeKey = toCamelKey(node.name);
      const text = sectionScopeText(node);
      const out: Finding[] = [];
      for (const spec of specs) {
        out.push(
          ...buildTextFindings({
            kind: "forbids",
            spec,
            match: matchText(text, spec),
            scopeKey,
            scope: node.name,
            scopePos: node.pos,
            ctx,
          }),
        );
      }
      return out;
    },
  };
}

/**
 * Attach required / forbidden phrase checks to the WHOLE document — a cross-plane `DocRule` for
 * a contract's `rules: [...]` slot (the body-root form of D-0011's `requires:` / `forbids:`).
 * Each `requires` entry emits a document-level `text/requires` (no position) when its phrase is
 * absent; each `forbids` entry emits a `text/forbids` at the offending line for every hit. The
 * `requires` arm enforces the same absence-form purity as {@link requires}.
 */
export function textRule(spec: TextRuleSpec): DocRule {
  const requiresSpecs = spec.requires ?? [];
  const forbidsSpecs = spec.forbids ?? [];
  assertRequiresPurity(requiresSpecs);
  return {
    __brand: "DocRule",
    id: "text/doc",
    run(doc: Doc, ctx: Ctx): Finding[] {
      const text = docScopeText(doc);
      const out: Finding[] = [];
      for (const s of requiresSpecs) {
        out.push(
          ...buildTextFindings({ kind: "requires", spec: s, match: matchText(text, s), scopeKey: "doc", ctx }),
        );
      }
      for (const s of forbidsSpecs) {
        out.push(
          ...buildTextFindings({ kind: "forbids", spec: s, match: matchText(text, s), scopeKey: "doc", ctx }),
        );
      }
      return out;
    },
  };
}
