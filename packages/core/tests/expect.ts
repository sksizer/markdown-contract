/**
 * Narrowing helpers for the dynamic dual-key model surface — the cast-once boundary the
 * consumption fixtures and `model.test.ts` share.
 *
 * The typed body a contract infers ({@link BodyOf}) keys each declared section by its EXACT heading
 * name (`doc.body["Files to touch"]`), fully typed. The lowerCamelCase alias (`doc.body.filesToTouch`)
 * and `.section(name)` accessor are DYNAMIC by design — a template-literal type cannot faithfully
 * mirror the Unicode-aware runtime camelization (`core/camel.ts`), see the T-JGCX / D-0015 out-of-scope
 * note — so alias reads resolve through {@link SectionGroup}'s index signature to a union that must be
 * narrowed at the leaf. These three helpers are that honest narrowing: `group` views a body as the
 * dynamic {@link SectionGroup}; `asSection` / `asTable` narrow one dual-key value (or a `byAnchor`
 * {@link BlockView}) to the concrete view. They are typed casts (never `any`), so a genuinely-wrong
 * cast is still a type error — only the by-design dynamic surface is opened.
 */
import type { SectionGroup, SectionView, TableView } from "../src/index.js";

/**
 * View a body group (`doc.body` or a `SectionView.sections`) as the dynamic dual-key
 * {@link SectionGroup} — the surface that resolves the lowerCamelCase alias keys and `.section(name)`.
 */
export function group(body: unknown): SectionGroup {
  return body as SectionGroup;
}

/** Narrow a dual-key value (an alias/`.section()` read) to its {@link SectionView}. */
export function asSection(value: unknown): SectionView {
  return value as SectionView;
}

/** Narrow a dual-key value or a `byAnchor` {@link BlockView} to its {@link TableView}. */
export function asTable(value: unknown): TableView {
  return value as TableView;
}
