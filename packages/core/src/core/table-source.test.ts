import { describe, expect, test } from "vitest";

import { first } from "../../tests/expect.js";
import { blocksOfKind } from "./navigate.js";
import { parse } from "./projection.js";
import { rawTableRow, rawTableRows } from "./table-source.js";

// table-source.ts re-splits table cells from the raw source so verbatim markup survives.
// Each case shows the projection FLATTENING a cell while the raw split preserves it.

const DOC = [
  "## Operations", // 1
  "", // 2
  "| Name | CLI | Description |", // 3  header
  "| ---- | --- | ----------- |", // 4  separator
  "| create | `sdlc x new` | Make a thing |", // 5
  "| list | `sdlc x ls` | List things |", // 6
].join("\n");

function opsTable(doc: string) {
  const { root } = parse(doc);
  return first(blocksOfKind(first(root.sections), "table"));
}

describe("rawTableRows — verbatim header + rows from source", () => {
  test("preserves backticks the projection's columns/rows flatten away", () => {
    const table = opsTable(DOC);
    // The projection drops the backticks:
    expect(table.rows[0]).toEqual(["create", "sdlc x new", "Make a thing"]);
    // The raw re-split keeps them:
    expect(rawTableRows(table, DOC)).toEqual({
      header: ["Name", "CLI", "Description"],
      rows: [
        ["create", "`sdlc x new`", "Make a thing"],
        ["list", "`sdlc x ls`", "List things"],
      ],
    });
  });

  test("accepts pre-split source lines too", () => {
    const table = opsTable(DOC);
    expect(rawTableRows(table, DOC.split("\n")).header).toEqual(["Name", "CLI", "Description"]);
  });

  test('pad: "header" pads short rows to the header cell count', () => {
    const doc = [
      "## T", // 1
      "", // 2
      "| A | B | C |", // 3
      "| - | - | - |", // 4
      "| x | y |", // 5  short row (2 cells)
    ].join("\n");
    const table = opsTable(doc);
    expect(rawTableRows(table, doc, { pad: "header" }).rows).toEqual([["x", "y", ""]]);
  });
});

describe("rawTableRow — the literal, unpadded cell array for one row", () => {
  test("returns exactly the cells the source line carries (for arity checks)", () => {
    const doc = [
      "## T", // 1
      "", // 2
      "| A | B | C |", // 3
      "| - | - | - |", // 4
      "| x | y |", // 5  only 2 cells
    ].join("\n");
    const table = opsTable(doc);
    // Unpadded — the caller sees the 2-vs-3 mismatch against the header.
    expect(rawTableRow(table, doc, 0)).toEqual(["x", "y"]);
  });
});
