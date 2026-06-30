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
      exclude: ["src/**/*.test.ts", "**/*.d.ts"],
      reporter: ["text-summary", "html", "json-summary", "lcov"],
      reportsDirectory: "coverage",
      // Floors sit a few points under the current baseline (statements 91.2,
      // branches 82.2, functions 94.9, lines 93.5) so the gate catches real
      // regressions without flaking on noise. Ratchet upward as coverage grows.
      thresholds: {
        statements: 88,
        branches: 78,
        functions: 90,
        lines: 90,
      },
    },
  },
});
