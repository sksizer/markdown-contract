/**
 * Known artifact-check failures — the honest baseline. Every entry is a SHIPPED
 * catalog example whose artifact currently fails verification against the real
 * CLI / library build, with the reason and the owner of the fix. Snippet
 * corrections are applied IN THE DATA by T-CTLG (see the T-SITE task spec) — this
 * site task renders and checks, it never edits `docs/catalog/*.yaml`.
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

export const KNOWN_FAILURES: KnownFailure[] = [
	{
		id: "DIALECT-03",
		reason:
			"snippet imports `extractVaultRefs` from 'markdown-contract', but the package root does not re-export it (it stops at the internal core/dialect barrel) — fix the export surface or the snippet's import in the catalog data (T-CTLG)",
	},
	{
		id: "DIALECT-07",
		reason: "same as DIALECT-03: `extractVaultRefs` is not exported from the package root",
	},
	{
		id: "DIALECT-08",
		reason: "same as DIALECT-03: `extractVaultRefs` is not exported from the package root",
	},
	{
		id: "DIALECT-10",
		reason: "same as DIALECT-03: `extractVaultRefs` is not exported from the package root",
	},
	{
		id: "EMBED-AND-CI-01",
		reason:
			"snippet calls `sections()` with no arguments, but the real signature is `sections(opts, specs)` (both required) — snippet correction in the catalog data (T-CTLG)",
	},
];
