import { contract, section, sections, table } from "../../../src/index.js";
import { asTable } from "../../expect.js";
import { defineConsumptionFixture, loadSource } from "../../harness.js";

// Provenance: consumption/06-named-tables-content-record.md
// Two typed tables in one section via the content record, each named by ^anchor → its own
// TableView<Row>. Reuses validation v15's DecisionTablesContract + its "## Decision" sample doc.
const c06 = defineConsumptionFixture({
  id: "c06",
  title: "Named tables via the content record",
  component: "consumption",
  path: "docs/README.md",
  source: loadSource(import.meta.url, "./06-named-tables-content-record.md"),
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
  // A `content` RECORD keeps the section a SectionView; each ^anchor-bound table surfaces as a named
  // (dynamic) field, narrowed to its TableView through `asTable` — the honest cast-once boundary.
  reads: [
    {
      label: "decision.components.rowCount === 2",
      get: (doc) => asTable(doc.body.Decision.components).rowCount,
      equals: 2,
    },
    {
      label: "decision.risks.rowCount === 1",
      get: (doc) => asTable(doc.body.Decision.risks).rowCount,
      equals: 1,
    },
    {
      label: "decision.components.column('Component') === ['projection', 'grammar']",
      get: (doc) => asTable(doc.body.Decision.components).column("Component"),
      equals: ["projection", "grammar"],
    },
    {
      label: "decision.risks.find(r => r.Risk.includes('gfm'))?.Mitigation === 'pin in spike S6'",
      get: (doc) =>
        asTable(doc.body.Decision.risks).find((r) => (r.Risk ?? "").includes("gfm"))?.Mitigation,
      equals: "pin in spike S6",
    },
    {
      label: "decision.components.rowPos(0).line — source line of the first components row",
      get: (doc) => asTable(doc.body.Decision.components).rowPos(0).line,
      equals: 5,
    },
  ],
});

export default c06;
