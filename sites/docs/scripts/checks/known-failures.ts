/**
 * Known artifact-check failures — the honest baseline. Every entry is a SHIPPED
 * catalog example whose artifact currently fails verification against the real
 * CLI / library build, with the reason and the owner of the fix.
 *
 * Semantics (enforced by check-artifacts.ts):
 *   - an example listed here that FAILS  → tolerated, reported as a known failure
 *   - an example listed here that PASSES → the check FAILS (stale entry: remove it)
 *   - a failing example NOT listed here  → the check FAILS
 */
export interface KnownFailure {
  /** catalog example id */
  id: string;
  /** why the artifact currently fails, and what would fix it */
  reason: string;
}

export const KNOWN_FAILURES: KnownFailure[] = [];
