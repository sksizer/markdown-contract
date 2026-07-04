import { defineConfig } from "vitest/config";

// Tests live in two places (see CLAUDE.md → Tests):
//  - `src/**/*.test.ts` — unit tests, as peer files next to the module they cover.
//  - `tests/**/*.test.ts` — the fixture-driven integration corpus (harness + e2e).
// Both are discovered here so `vitest run` covers the whole suite.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // `all: true` + an explicit include glob means untested source files
      // surface at 0% instead of being silently omitted — honest totals.
      all: true,
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/index.ts", "**/*.d.ts"],
      reporter: ["text-summary", "html", "json-summary", "lcov"],
      reportsDirectory: "coverage",
      // Floors track the node-template library-health baseline (90/85/90/90 for
      // statements/branches/functions/lines) with re-export-only barrels excluded from
      // the denominator (the `src/**/index.ts` glob above — the four `core`, `runner`,
      // `core/dialect`, and `declarative` barrels hold no logic per CLAUDE.md).
      // Measured 2026-07-04 (721 tests, post-exclusion): statements 93.50% (2045/2187),
      // branches 85.22% (1356/1591), functions 97.15% (478/492), lines 95.40% (1787/1873).
      // Floors sit at or under those numbers so the gate catches real regressions without
      // flaking on noise; branches reached the template's 85. Ratchet upward as coverage grows.
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
});
