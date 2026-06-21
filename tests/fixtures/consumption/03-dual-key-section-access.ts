import { contract, section, sections, table } from "../../../src/index.js";
import { z } from "zod";
import type { ConsumptionFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: consumption/03-dual-key-section-access.md
// One section, three keys (bracket / dotted camelCase / section() accessor) → the same SectionView.
// Reuses validation v18's FilesContract + its "## Files to touch" sample document.
const c03: ConsumptionFixture = {
  id: "c03",
  title: "Dual-key section access",
  component: "consumption",
  path: "docs/tasks/T-0042.md",
  source: loadSource(import.meta.url, "./03-dual-key-section-access.md"),
  build: () =>
    contract({
      frontmatter: z
        .object({
          id: z.string().regex(/^T-[0-9A-Z]{4}$/),
          status: z.enum(["open/ready", "in-progress/active", "closed/done"]),
        })
        .strict(),
      body: sections({ order: "recognized-relative", allowUnknown: true }, [
        section("Files to touch", {
          content: table({
            columns: ["Location", "Kind", "Change"],
            cells: { Kind: z.enum(["new", "modify", "delete"]) },
          }),
        }),
      ]),
    }),
  reads: [
    {
      label: "exact === dotted — same SectionView, not a copy",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any)["Files to touch"] === (doc.body as any).filesToTouch,
      equals: true,
    },
    {
      label: "dotted === accessed — section() accessor resolves to the same view",
      get: (doc) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (doc.body as any).filesToTouch === (doc.body as any).section("Files to touch"),
      equals: true,
    },
    {
      label: "exact.name — the exact heading, not the camelCase key",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any)["Files to touch"].name,
      equals: "Files to touch",
    },
    {
      label: "dotted.name — same exact heading through the dotted key",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).filesToTouch.name,
      equals: "Files to touch",
    },
    {
      label: "accessed.pos — one SourcePos, one underlying node",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).section("Files to touch").pos,
      equals: { line: 6 },
    },
    {
      label: "dotted.table?.rowCount — same TableView behind every key",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).filesToTouch.table?.rowCount,
      equals: 3,
    },
  ],
};

export default c03;
