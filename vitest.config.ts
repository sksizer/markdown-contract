import { defineConfig } from "vitest/config";

// Tests live in two places (see CLAUDE.md → Tests):
//  - `src/**/*.test.ts` — unit tests, as peer files next to the module they cover.
//  - `tests/**/*.test.ts` — the fixture-driven integration corpus (harness + e2e).
// Both are discovered here so `vitest run` covers the whole suite.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
