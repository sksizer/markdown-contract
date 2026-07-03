/**
 * CLI artifact verification — checks every `markdown-contract …` command line an
 * artifact cites against the REAL CLI's `--help` surface (subcommand + flags), by
 * actually running the built binary (`packages/core/dist/cli/index.js --help`).
 *
 * Level of verification (see check-artifacts.ts for the full policy): existence of
 * the cited subcommand and of every `--flag` in the real usage text. Output lines
 * embedded in artifacts are NOT executed or diffed — the catalog's command lines
 * reference fixture trees (./decisions, ./notes, …) that the artifacts do not embed.
 */
import { spawnSync } from "node:child_process";

export interface HelpSurface {
	subcommands: Set<string>;
	flags: Set<string>;
}

/** Run the real CLI with `--help` and parse its usage text into a surface. */
export function loadHelpSurface(cliPath: string): HelpSurface {
	const res = spawnSync(process.execPath, [cliPath, "--help"], { encoding: "utf8" });
	if (res.status !== 0 || !res.stdout) {
		throw new Error(
			`could not read --help from ${cliPath} (exit ${res.status}): ${res.stderr || res.error}`,
		);
	}
	const flags = new Set([...res.stdout.matchAll(/--[a-z][a-z-]*/g)].map((m) => m[0]));
	const subcommands = new Set(
		[...res.stdout.matchAll(/markdown-contract ([a-z]+)/g)].map((m) => m[1]),
	);
	if (subcommands.size === 0 || flags.size === 0) {
		throw new Error(`--help output from ${cliPath} yielded no subcommands/flags`);
	}
	return { subcommands, flags };
}

/**
 * Extract the tail (everything after the binary name) of each `markdown-contract`
 * invocation in an artifact. Joins `\`-continued lines; recognizes bare, `$ `-,
 * `npx`- and `bunx`-prefixed invocations; ignores comments and output lines.
 */
export function extractCommands(artifact: string): string[] {
	const joined = artifact.replace(/\\\n\s*/g, " ");
	const commands: string[] = [];
	for (const rawLine of joined.split("\n")) {
		const line = rawLine.trim().replace(/^\$\s+/, "");
		const m = line.match(/^(?:npx\s+|bunx\s+)?markdown-contract\s+(.+)$/);
		if (m?.[1]) commands.push(m[1]);
	}
	return commands;
}

/** Shell tokens after which arguments no longer belong to the CLI invocation. */
const STOP_TOKEN = /^(\||\|\||&&|;|>|>>|1>|2>|2>&1)$/;

/** Verify one command tail against the help surface; returns human-readable errors. */
export function checkCommand(commandTail: string, help: HelpSurface): string[] {
	const errors: string[] = [];
	const effective: string[] = [];
	for (const token of commandTail.split(/\s+/)) {
		if (STOP_TOKEN.test(token) || token.startsWith(">")) break;
		effective.push(token);
	}
	const subcommand = effective[0];
	if (!subcommand || subcommand.startsWith("--")) {
		errors.push(`no subcommand in 'markdown-contract ${commandTail}'`);
	} else if (!help.subcommands.has(subcommand)) {
		errors.push(`unknown subcommand '${subcommand}' (help offers: ${[...help.subcommands].join(", ")})`);
	}
	for (const token of effective.slice(1)) {
		const flag = token.match(/^(--[a-z][a-z-]*)/)?.[1];
		if (flag && !help.flags.has(flag)) {
			errors.push(`flag '${flag}' is not in the real --help surface`);
		}
	}
	return errors;
}

/** Check every embedded invocation; `requireOne` fails artifacts citing no command. */
export function checkCliArtifact(
	artifact: string,
	help: HelpSurface,
	requireOne: boolean,
): string[] {
	const commands = extractCommands(artifact);
	if (commands.length === 0) {
		return requireOne ? ["no `markdown-contract …` command line found to verify"] : [];
	}
	return commands.flatMap((c) => checkCommand(c, help));
}
