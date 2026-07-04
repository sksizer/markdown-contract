import { contract, section, sections, table } from "../../../src/index.js";
import { asTable } from "../../expect.js";
import { defineConsumptionFixture, loadSource } from "../../harness.js";

// Provenance: consumption/07-byanchor-declared-vs-dynamic.md
// byAnchor(id) → BlockView | undefined, at doc and section scope; declared anchors are typed fields,
// an undeclared anchor is reachable only dynamically. Reuses validation v15b's DecisionContract
// (two declared tables; an extra undeclared ^extra table) + its "## Decision" sample document.
const c07 = defineConsumptionFixture({
  id: "c07",
  title: "byAnchor — declared vs dynamic",
  component: "consumption",
  path: "docs/README.md",
  source: loadSource(import.meta.url, "./07-byanchor-declared-vs-dynamic.md"),
  build: () =>
    contract({
      body: sections({}, [
        section("Decision", {
          content: {
            components: table({ anchor: "components", columns: ["#", "Component", "Resolution"] }),
            risks: table({ anchor: "risks", columns: ["Risk", "Mitigation"] }),
          },
        }),
      ]),
    }),
  // `byAnchor` returns the discriminated `BlockView | undefined` (`.kind` reads typed); a table hit
  // is narrowed to its `TableView` with `asTable` to reach `columns` / `rows`.
  reads: [
    {
      label: "doc.byAnchor('extra')?.kind === 'table' — doc-wide search, BlockView discriminant",
      get: (doc) => doc.byAnchor("extra")?.kind,
      equals: "table",
    },
    {
      label: "byAnchor('extra') narrowed: b.columns === ['Option', 'Note']",
      get: (doc) => asTable(doc.byAnchor("extra")).columns,
      equals: ["Option", "Note"],
    },
    {
      label: "byAnchor('extra') narrowed: b.rows[1].Option === 'B' — typed string, no row typing",
      get: (doc) => asTable(doc.byAnchor("extra")).rows[1]?.Option,
      equals: "B",
    },
    {
      label:
        "doc.byAnchor('components')?.kind === 'table' — declared anchor reachable dynamically too",
      get: (doc) => doc.byAnchor("components")?.kind,
      equals: "table",
    },
    {
      label: "byAnchor('components') narrowed: c.rows[0]['#'] === '1' — Record<string,string> here",
      get: (doc) => asTable(doc.byAnchor("components")).rows[0]?.["#"],
      equals: "1",
    },
    {
      label: "doc.body.decision.byAnchor('extra')?.kind === 'table' — section-scoped search",
      get: (doc) => doc.body.Decision.byAnchor("extra")?.kind,
      equals: "table",
    },
    {
      label: "doc.body.decision.byAnchor('missing') === undefined — no such anchor in this section",
      get: (doc) => doc.body.Decision.byAnchor("missing"),
      equals: undefined,
    },
  ],
});

export default c07;
