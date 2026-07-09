/**
 * Pure finding helpers shared by pages and kit components (ported from the
 * prototype's `mocks/builders.ts` — the only mock-layer function the components
 * actually depended on).
 */
import type { Finding, FindingLevel } from "../types";

/** Tally findings per severity level (all three keys always present). */
export function countByLevel(findings: Finding[]): Record<FindingLevel, number> {
  const counts: Record<FindingLevel, number> = { error: 0, warn: 0, report: 0 };
  for (const f of findings) counts[f.level] += 1;
  return counts;
}
