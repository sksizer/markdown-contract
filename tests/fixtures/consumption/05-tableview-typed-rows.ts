import { contract, section, sections, table } from "../../../src/index.js";
import { z } from "zod";
import type { ConsumptionFixture } from "../../harness.js";
import { loadSource } from "../../harness.js";

// Provenance: consumption/05-tableview-typed-rows.md
// TableView<Row> — iteration, column(), find(), rowPos(), rowCount, columns, pos. Reuses validation
// v11's FilesContract (Kind enum cell, Location pattern) + its "## Files" sample document.
const c05: ConsumptionFixture = {
  id: "c05",
  title: "TableView typed rows",
  component: "consumption",
  path: "docs/task.md",
  source: loadSource(import.meta.url, "./05-tableview-typed-rows.md"),
  build: () =>
    contract({
      body: sections({}, [
        section("Files", {
          content: table({
            columns: ["File", "Kind", "Location"],
            cells: {
              Kind: z.enum(["add", "modify", "delete"]),
              Location: z.string().regex(/^[A-Za-z0-9._/-]+\/$/),
            },
          }),
        }),
      ]),
    }),
  reads: [
    {
      label: "files.columns === ['File', 'Kind', 'Location']",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).files.columns,
      equals: ["File", "Kind", "Location"],
    },
    {
      label: "files.rowCount === 3",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).files.rowCount,
      equals: 3,
    },
    {
      label: "files.pos === { line: 1 } — the table block's SourcePos",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).files.pos,
      equals: { line: 1 },
    },
    {
      label: "files.column('Kind') — the enum union column",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).files.column("Kind"),
      equals: ["add", "modify", "delete"],
    },
    {
      label: "files.column('File') — string[] column",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).files.column("File"),
      equals: ["grammar.ts", "leaves.ts", "legacy.ts"],
    },
    {
      label: "files.find(r => r.Kind === 'delete')?.File === 'legacy.ts'",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).files.find((r: any) => r.Kind === "delete")?.File,
      equals: "legacy.ts",
    },
    {
      label: "files.find((r, i) => i === 0)?.File === 'grammar.ts'",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).files.find((_r: any, i: number) => i === 0)?.File,
      equals: "grammar.ts",
    },
    {
      label: "files.rowPos(2) === { line: 6 } — the legacy.ts row's source line",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (doc) => (doc.body as any).files.rowPos(2),
      equals: { line: 6 },
    },
  ],
};

export default c05;
