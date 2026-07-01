import { contract, maxWords, section, sections } from "../../../src/index.js";
import type { ConsumptionFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: consumption/04-sectionview-content.md
// SectionView content surface — name / pos / anchors / text() / table / tables / lists, plus an
// absent-optional read. Reuses validation v09's SummaryContract (anchor + maxWords) + its PASS doc.
const c04: ConsumptionFixture = {
  id: "c04",
  title: "SectionView content",
  component: "consumption",
  path: "docs/README.md",
  source: loadSource(import.meta.url, "./04-sectionview-content.md"),
  build: () =>
    contract({
      body: sections({}, [
        section("Summary", { anchor: "summary", content: maxWords(120) }),
      ]),
    }),
  reads: [
    {
      label: "s.name === 'Summary'",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).summary.name,
      equals: "Summary",
    },
    {
      // Reconciled: the projection (D-0002, tested) positions every node with line AND col; the
      // provenance's bare `{ line: 1 }` was shorthand. The model preserves positions verbatim.
      label: "s.pos === { line: 1, col: 1 } — the heading's SourcePos",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).summary.pos,
      equals: { line: 1, col: 1 },
    },
    {
      label: "s.anchors === ['summary'] — the section's ^block-ids",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).summary.anchors,
      equals: ["summary"],
    },
    {
      label: "s.text() — the abstract flattened to one string",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).summary.text(),
      equals:
        "This decision adopts a generic TypeScript contract library for validating the structure of our markdown documents. Frontmatter stays in Zod; section sequence and nesting move to a combinator grammar; content leaves reuse Zod. The engine is SDLC-agnostic and consumed as data per entity type.",
    },
    {
      label: "s.table === undefined — no table in the section",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).summary.table,
      equals: undefined,
    },
    {
      label: "s.tables === [] — TableView[]",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).summary.tables,
      equals: [],
    },
    {
      label: "s.lists === [] — ListView[]",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).summary.lists,
      equals: [],
    },
    {
      label: "doc.body.why === undefined — absent optional section",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).why,
      equals: undefined,
    },
    {
      label: "doc.body.why?.text() === undefined — optional chaining tell",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).why?.text(),
      equals: undefined,
    },
  ],
};

export default c04;
