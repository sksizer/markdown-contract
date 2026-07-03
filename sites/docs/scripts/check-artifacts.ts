/**
 * Artifact regression check (T-SITE AC-4) — verifies every SHIPPED catalog example's
 * `artifact` (docs/catalog/*.yaml) against the real CLI / library build so the
 * published snippets stay honest. Run via `bun run check-artifacts` or
 * `moon run docs:check-artifacts` (which builds packages/core first). Exits non-zero
 * on any unexpected failure or stale known-failure entry.
 *
 * ── Exact verification level per artifact_kind (read this before trusting a pass) ──
 *
 * cli    Every `markdown-contract …` command line in the artifact is verified against
 *        the REAL built CLI's `--help` output: the subcommand must exist and every
 *        `--flag` must be in the usage surface. The commands are NOT executed and
 *        their transcribed output is NOT diffed — the catalog's invocations reference
 *        fixture trees (./decisions, ./notes, …) that the artifacts do not embed, so
 *        there is nothing self-contained to run. An artifact citing no command fails.
 *
 * yaml   Parsed, then compiled through the REAL declarative front-end
 *        (`markdown-contract/declarative` from the packages/core build):
 *        `kind: contract` docs via loadContract; `kind: config` docs (and bare
 *        `rules:` fragments) via loadConfig with stub files written for referenced
 *        `*.contract.yaml` paths (the referenced files live outside the artifact, so
 *        only the config itself is verified); `frontmatter:`/`body:`/section-list
 *        fragments via compileContractObject. GitHub-Actions step lists are
 *        parse-validated and any `markdown-contract` line in `run:` gets the cli
 *        check. Semantic validation is real; nothing is executed against a corpus.
 *
 * code   Typechecked (strict, module NodeNext) against the real package's dist
 *        types, so removed exports, wrong arities, and bad argument shapes fail.
 *        Narrative snippets reuse identifiers from earlier rungs, so free names,
 *        non-`markdown-contract` module specifiers, and `unknown`-typed `doc.body`
 *        navigation are tolerated — see scripts/checks/code.ts for the precise
 *        diagnostic list and the consequence: snippets are compile-verified, not
 *        executed, and expressions rooted in free identifiers are only syntax-checked.
 *
 * mixed  Only the embedded `markdown-contract …` command lines (if any) are verified,
 *        exactly as for `cli`. The markdown/TS/YAML portions of a mixed artifact are
 *        NOT machine-verified; an artifact with no command line is reported as
 *        "skipped" and counts as neither pass nor failure.
 *
 * Examples with `status: planned` (unshipped capabilities) are EXCLUDED and reported
 * as skipped. Failures expected until the data is corrected upstream live in
 * scripts/checks/known-failures.ts with reasons; a listed example that starts
 * passing fails the run (stale baseline), so tolerance can only shrink.
 */
import { rmSync } from "node:fs";
import { resolve } from "node:path";

import { REPO_ROOT, isPlanned, loadCatalog } from "./catalog.js";
import { checkCliArtifact, loadHelpSurface } from "./checks/cli.js";
import { checkCodeArtifacts } from "./checks/code.js";
import { KNOWN_FAILURES } from "./checks/known-failures.js";
import { checkYamlArtifact } from "./checks/yaml.js";

const CLI_PATH = resolve(REPO_ROOT, "packages/core/dist/cli/index.js");
const SCRATCH_DIR = resolve(import.meta.dirname, "../.artifact-check");

interface Result {
	id: string;
	kind: string;
	status: "pass" | "fail" | "skip";
	notes: string[];
}

function main(): number {
	rmSync(SCRATCH_DIR, { recursive: true, force: true });
	const catalog = loadCatalog();
	const help = loadHelpSurface(CLI_PATH);

	const results: Result[] = [];
	const codeBatch: { id: string; artifact: string }[] = [];

	for (const category of catalog) {
		for (const example of category.examples) {
			const { id, artifact, artifact_kind: kind } = example;
			if (isPlanned(example)) {
				results.push({ id, kind, status: "skip", notes: ["planned — capability not shipped"] });
				continue;
			}
			switch (kind) {
				case "cli": {
					const errors = checkCliArtifact(artifact, help, true);
					results.push({ id, kind, status: errors.length ? "fail" : "pass", notes: errors });
					break;
				}
				case "yaml": {
					const errors = checkYamlArtifact(artifact, resolve(SCRATCH_DIR, id.toLowerCase()), help);
					results.push({ id, kind, status: errors.length ? "fail" : "pass", notes: errors });
					break;
				}
				case "code":
					codeBatch.push({ id, artifact });
					break;
				case "mixed": {
					const commands = checkCliArtifact(artifact, help, false);
					const hasCommand = /(^|\n)\s*(\$\s+)?(npx\s+|bunx\s+)?markdown-contract\s/.test(artifact);
					results.push(
						hasCommand
							? { id, kind, status: commands.length ? "fail" : "pass", notes: commands }
							: { id, kind, status: "skip", notes: ["mixed artifact with no command line — not machine-verified"] },
					);
					break;
				}
			}
		}
	}

	// One TS program for all code snippets (fast, and diagnostics stay per-file).
	const codeFailures = checkCodeArtifacts(codeBatch, resolve(SCRATCH_DIR, "code"));
	for (const { id } of codeBatch) {
		const errors = codeFailures.get(id) ?? [];
		results.push({ id, kind: "code", status: errors.length ? "fail" : "pass", notes: errors });
	}

	// Reconcile against the known-failures baseline.
	const known = new Map(KNOWN_FAILURES.map((k) => [k.id, k.reason]));
	const unexpected: Result[] = [];
	const tolerated: Result[] = [];
	const stale: string[] = [];
	for (const r of results) {
		if (r.status !== "fail") {
			if (known.has(r.id)) stale.push(r.id);
			continue;
		}
		(known.has(r.id) ? tolerated : unexpected).push(r);
	}

	const counts = {
		pass: results.filter((r) => r.status === "pass").length,
		skip: results.filter((r) => r.status === "skip").length,
	};
	console.log(
		`check-artifacts: ${results.length} artifact(s) — ${counts.pass} passed, ` +
			`${tolerated.length} known failure(s), ${unexpected.length} unexpected failure(s), ${counts.skip} skipped`,
	);
	for (const r of results.filter((x) => x.status === "skip")) {
		console.log(`  SKIP ${r.id} [${r.kind}] — ${r.notes.join("; ")}`);
	}
	for (const r of tolerated) {
		console.log(`  KNOWN-FAIL ${r.id} [${r.kind}] — ${known.get(r.id)}`);
		for (const n of r.notes) console.log(`    ${n}`);
	}
	for (const r of unexpected) {
		console.error(`  FAIL ${r.id} [${r.kind}]`);
		for (const n of r.notes) console.error(`    ${n}`);
	}
	for (const id of stale) {
		console.error(`  STALE known-failure entry: ${id} now passes — remove it from known-failures.ts`);
	}

	rmSync(SCRATCH_DIR, { recursive: true, force: true });
	return unexpected.length > 0 || stale.length > 0 ? 1 : 0;
}

process.exit(main());
