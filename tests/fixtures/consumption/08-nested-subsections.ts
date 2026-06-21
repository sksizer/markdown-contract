import { contract, optional, section, sections } from "../../../src/index.js";
import type { ConsumptionFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: consumption/08-nested-subsections.md
// SectionView.sections — the typed view of nested H3 subsections. Reuses validation v14's
// children: sections(...) mechanism; the consumed contract is the Task Post-mortem section (§5.2)
// with three strict H3s, over the standalone "## Post-mortem" sample document.
const c08: ConsumptionFixture = {
  id: "c08",
  title: "Nested subsections",
  component: "consumption",
  path: "docs/tasks/T-AB12.md",
  source: loadSource(import.meta.url, "./08-nested-subsections.md"),
  build: () =>
    contract({
      body: sections({ order: "recognized-relative", allowUnknown: true }, [
        optional(
          section("Post-mortem", {
            children: sections({ order: "strict", allowUnknown: false }, [
              section("Acceptance criteria coverage"),
              section("What worked"),
              section("Friction and automation gaps"),
            ]),
          }),
        ),
      ]),
    }),
  reads: [
    {
      label: "pm.name === 'Post-mortem'",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).postMortem.name,
      equals: "Post-mortem",
    },
    {
      label: "pm.sections.acceptanceCriteriaCoverage.text() — camelCase key",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).postMortem.sections.acceptanceCriteriaCoverage.text(),
      equals: "All five ACs landed; the checkbox-count rule caught one stray.",
    },
    {
      label: "pm.sections['What worked'].text() — exact-heading key",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).postMortem.sections["What worked"].text(),
      equals: "The contract split kept the engine fixture-testable.",
    },
    {
      label: "pm.sections.section('Friction and automation gaps').text() — .section() accessor",
      get: (doc) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (doc.body as any).postMortem.sections
          .section?.("Friction and automation gaps")
          .text(),
      equals: "The lease heartbeat needed a manual nudge once.",
    },
    {
      label: "pm.sections.whatWorked.name === 'What worked'",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).postMortem.sections.whatWorked.name,
      equals: "What worked",
    },
    {
      label: "pm.sections.whatWorked.pos === { line: 9 } (as asserted in the provenance)",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).postMortem.sections.whatWorked.pos,
      equals: { line: 9 },
    },
    {
      label: "pm.sections.whatWorked.sections === {} — empty record; no H4s",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).postMortem.sections.whatWorked.sections,
      equals: {},
    },
  ],
};

export default c08;
