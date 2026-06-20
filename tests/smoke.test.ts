import { test, expect } from "vitest";

import { VERSION } from "../src/index.js";

test("library exposes a version string", () => {
  expect(typeof VERSION).toBe("string");
});
