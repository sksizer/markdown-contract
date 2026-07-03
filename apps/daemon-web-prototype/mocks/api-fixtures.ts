/**
 * Concrete fixtures for the API seam (`../types/api`) — the canned payloads the
 * mock loader serves to Storybook and the app shell.
 *
 * These cover EVERY `VaultStatusState` (green / findings / drift / running /
 * error) plus the empty-registry case, the two drift shapes (drifted /
 * not-drifted), and a realistic SSE event sequence. Built from the builders so
 * every value is internally consistent and deterministic (fixed timestamps).
 *
 * Values only — this module never re-exports types (those live in `../types/api`,
 * re-exported through `./types`).
 */
import { makeFinding, makeResult, makeStats, makeVaultStatus } from "./builders";
import type { DriftResult, SseEvent, VaultListResponse, VaultStatus } from "./types";

// ── green: everything validates, no findings ────────────────────────────────────
export const greenVaultStatus: VaultStatus = makeVaultStatus({
  id: "vault-handbook",
  name: "Team Handbook",
  path: "~/vaults/team-handbook",
  state: "green",
  result: makeResult([], makeStats({ filesScanned: 42, filesMatched: 38, matchedByRule: [22, 16] })),
});

// ── findings: a mixed error/warn/report run, exitCode 1 ──────────────────────────
export const findingsVaultStatus: VaultStatus = makeVaultStatus({
  id: "vault-product-docs",
  name: "Product Docs",
  path: "~/vaults/product-docs",
  state: "findings",
  result: makeResult(
    [
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
        fix: { description: "Set status to one of the allowed values." },
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
        id: "links/wikilink-unresolved",
        level: "report",
        path: "docs/guide.md",
        pos: { line: 51, col: 18 },
        message: 'Wikilink "[[architecture-overview]]" does not resolve to a file in the vault.',
      }),
    ],
    makeStats({ filesScanned: 61, filesMatched: 53, matchedByRule: [31, 22] }),
  ),
});

// ── drift: a green-ish run PLUS the committed contract no longer matches ──────────
export const sampleDrift: DriftResult = {
  drifted: true,
  entries: [
    {
      kind: "field-added",
      target: "frontmatter.fields.owner",
      detail: 'New frontmatter key "owner" appears in every file but is absent from the contract.',
    },
    {
      kind: "field-changed",
      target: "frontmatter.fields.status",
      detail: 'Observed values now include "archived"; the contract enum lists only draft/review/published.',
    },
    {
      kind: "section-added",
      target: "body.sections.Changelog",
      detail: 'A "## Changelog" section now appears in 3 of 5 files; the contract does not list it.',
    },
  ],
  warnings: [
    "merged variant headings ‘Set-up’ / ‘Setup’ into one section ‘Set-up’ (shared key ‘setup’).",
  ],
};

/** The not-drifted case: the committed contract still matches the corpus. */
export const cleanDrift: DriftResult = {
  drifted: false,
  entries: [],
  warnings: [],
};

export const driftVaultStatus: VaultStatus = makeVaultStatus({
  id: "vault-knowledge-base",
  name: "Knowledge Base",
  path: "~/vaults/knowledge-base",
  state: "drift",
  result: makeResult([], makeStats({ filesScanned: 27, filesMatched: 27, matchedByRule: [27] })),
  drift: sampleDrift,
});

// ── running: a validation is in flight, no result yet ────────────────────────────
export const runningVaultStatus: VaultStatus = makeVaultStatus({
  id: "vault-design-notes",
  name: "Design Notes",
  path: "~/vaults/design-notes",
  state: "running",
});

// ── error: the run/check failed; no result ───────────────────────────────────────
export const errorVaultStatus: VaultStatus = makeVaultStatus({
  id: "vault-archive",
  name: "Archive",
  path: "~/vaults/archive",
  state: "error",
  error: { message: "Config not found: ~/vaults/archive/markdown-contract.yaml" },
});

/** All five vault statuses, in dashboard display order. */
export const mockVaultStatuses: VaultStatus[] = [
  greenVaultStatus,
  findingsVaultStatus,
  driftVaultStatus,
  runningVaultStatus,
  errorVaultStatus,
];

/** The empty registry — no vaults registered yet. */
export const emptyVaultList: VaultListResponse = { vaults: [] };

/**
 * A realistic live-status event sequence over GET /api/events: a vault starts a
 * run, finishes with findings, a drift check lands, then another vault errors.
 * Ids are monotonic for `Last-Event-ID` resumption.
 */
export const mockSseEvents: SseEvent[] = [
  {
    id: 1,
    at: "2026-06-30T12:00:01.000Z",
    vaultId: findingsVaultStatus.id,
    type: "status",
    state: "running",
  },
  {
    id: 2,
    at: "2026-06-30T12:00:03.000Z",
    vaultId: findingsVaultStatus.id,
    type: "validated",
    result: findingsVaultStatus.result!,
  },
  {
    id: 3,
    at: "2026-06-30T12:00:05.000Z",
    vaultId: driftVaultStatus.id,
    type: "drift",
    drift: sampleDrift,
  },
  {
    id: 4,
    at: "2026-06-30T12:00:07.000Z",
    vaultId: errorVaultStatus.id,
    type: "error",
    message: "Config not found: ~/vaults/archive/markdown-contract.yaml",
  },
];
