import { z } from "zod";
import { contract, section, sections, table } from "../../../src/index.js";
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
  // Reconciliation note (T-6PV4): `Files to touch` declares a SOLE `content: table(...)`, so its
  // dual-key keys PROMOTE to the `TableView` (proposed-shape §6 "Naming a table as a field", first
  // row — "heading IS the table" → `doc.body.<section>` is the TableView, not a SectionView). The
  // provenance's original reads (`.name`, `.table`, and `dotted === section(...)`) assumed the key
  // was a SectionView, contradicting that normative promotion; reconciled here to test what §6
  // actually delivers: bracket and dotted are the SAME promoted TableView (the dual-key invariant),
  // while `.section(name)` hands back the underlying SectionView (name/pos), per §6's accessor.
  reads: [
    {
      label: "exact === dotted — same promoted TableView behind both keys, not a copy",
      get: (doc) => (doc.body as any)["Files to touch"] === (doc.body as any).filesToTouch,
      equals: true,
    },
    {
      label: "section() resolves the underlying SectionView, stable across calls",
      get: (doc) =>
        // biome-ignore lint/suspicious/noSelfCompare: intentional — asserts section() returns a stable SectionView across calls
        (doc.body as any).section("Files to touch") === (doc.body as any).section("Files to touch"),
      equals: true,
    },
    {
      label: "section('Files to touch').name — the underlying SectionView's exact heading",
      get: (doc) => (doc.body as any).section("Files to touch").name,
      equals: "Files to touch",
    },
    {
      label: "exact.kind === 'table' — the promoted key is the TableView (BlockView discriminant)",
      get: (doc) => (doc.body as any)["Files to touch"].kind,
      equals: "table",
    },
    {
      label: "section('Files to touch').pos — one SourcePos, one underlying node (heading line 6)",
      get: (doc) => (doc.body as any).section("Files to touch").pos,
      equals: { line: 6, col: 1 },
    },
    {
      label: "dotted.rowCount === 3 — the promoted TableView reads directly behind every key",
      get: (doc) => (doc.body as any).filesToTouch.rowCount,
      equals: 3,
    },
  ],
};

export default c03;
