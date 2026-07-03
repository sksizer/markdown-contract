/**
 * Concrete mock fixtures — the canned vaults the app shell and stories render.
 *
 * At minimum (per the task): a CLEAN vault (no findings, exitCode 0) and a
 * FAILING vault (mixed error/warn/report, exitCode 1). A third WARNING vault
 * (warns/reports only, still exitCode 0) is included so components have a
 * meaningful "passing but noisy" variant to show alongside the two extremes.
 */
import { makeFinding, makeResult, makeStats, makeVault } from "./builders";
import type { Finding, VaultSummary } from "./types";

// ── CLEAN: everything validates, nothing to report ──────────────────────────────
const cleanFindings: Finding[] = [];
const cleanResult = makeResult(
  cleanFindings,
  makeStats({ filesScanned: 42, filesMatched: 38, matchedByRule: [22, 16] }),
);

export const cleanVault: VaultSummary = makeVault(
  "vault-handbook",
  "Team Handbook",
  "~/vaults/team-handbook",
  cleanResult,
);

// ── WARNING: passes CI (exitCode 0) but has non-error findings to surface ────────
const warningFindings: Finding[] = [
  makeFinding({
    id: "structure/heading-depth-skip",
    level: "warn",
    path: "guides/onboarding.md",
    pos: { line: 12, col: 1 },
    message: "Heading jumps from H2 to H4; expected H3.",
    fix: { description: "Demote the H4 to H3 so the outline is contiguous." },
  }),
  makeFinding({
    id: "content/frontmatter-extra-key",
    level: "report",
    path: "guides/onboarding.md",
    pos: { line: 3 },
    message: 'Unrecognized frontmatter key "owner" (allowed by schema, reported for review).',
  }),
  makeFinding({
    id: "anchors/style-nonkebab",
    level: "warn",
    path: "reference/glossary.md",
    pos: { line: 88, col: 4 },
    message: 'Anchor "^Block_One" is not kebab-case.',
    fix: { description: 'Rename the anchor to "^block-one".' },
  }),
];
const warningResult = makeResult(
  warningFindings,
  makeStats({ filesScanned: 27, filesMatched: 27, matchedByRule: [27] }),
);

export const warningVault: VaultSummary = makeVault(
  "vault-knowledge-base",
  "Knowledge Base",
  "~/vaults/knowledge-base",
  warningResult,
);

// ── FAILING: at least one error-level finding → exitCode 1 ───────────────────────
const failingFindings: Finding[] = [
  makeFinding({
    id: "structure/section-missing",
    level: "error",
    path: "docs/guide.md",
    message: 'Required section "## Summary" is missing.',
    fix: { description: 'Add a "## Summary" section after the title.' },
  }),
  makeFinding({
    id: "content/frontmatter-invalid",
    level: "error",
    path: "docs/guide.md",
    pos: { line: 2, col: 9 },
    message: 'frontmatter.status: expected "draft" | "review" | "published", received "wip".',
    fix: { description: 'Set status to one of the allowed values.' },
  }),
  makeFinding({
    id: "anchors/duplicate",
    level: "error",
    path: "docs/api/reference.md",
    pos: { line: 140, col: 1 },
    message: 'Duplicate block anchor "^overview" (first defined at line 17).',
    fix: { description: "Rename one of the duplicate anchors so each id is unique." },
  }),
  makeFinding({
    id: "structure/order-unexpected",
    level: "warn",
    path: "docs/api/reference.md",
    pos: { line: 64 },
    message: 'Section "## Examples" appears before "## Parameters"; recognized order is reversed.',
    fix: { description: 'Move "## Examples" after "## Parameters".' },
  }),
  makeFinding({
    id: "content/table-shape",
    level: "warn",
    path: "data/owners.md",
    pos: { line: 9, col: 3 },
    message: 'Table row 4 has 2 cells; header declares 3 columns.',
  }),
  makeFinding({
    id: "links/wikilink-unresolved",
    level: "report",
    path: "docs/guide.md",
    pos: { line: 51, col: 18 },
    message: 'Wikilink "[[architecture-overview]]" does not resolve to a file in the vault.',
  }),
];
const failingResult = makeResult(
  failingFindings,
  makeStats({ filesScanned: 61, filesMatched: 53, matchedByRule: [31, 22] }),
);

export const failingVault: VaultSummary = makeVault(
  "vault-product-docs",
  "Product Docs",
  "~/vaults/product-docs",
  failingResult,
);

/** The full set of managed vaults the dashboard renders, in display order. */
export const mockVaults: VaultSummary[] = [cleanVault, warningVault, failingVault];
