/** The result of the pure CLI core — what the thin wrapper writes and exits on. */
export interface CliResult {
    code: number;
    stdout: string;
    stderr: string;
}
/**
 * The pure, testable CLI core. Parses `argv` (everything after `node bin`), loads the
 * config, runs the corpus, formats the findings, and returns the exit code plus the
 * captured stdout/stderr. NEVER calls `process.exit` and NEVER writes to real streams.
 *
 * Exit codes (AC-2): `0` clean, `1` error-level findings present, `2` usage/config
 * error (unknown command, bad/missing config, unsupported config extension, bad
 * `--format`). The `2` cases are raised here; `0`/`1` come straight from `runCorpus`.
 */
export declare function runCli(argv: string[], opts?: {
    cwd?: string;
}): Promise<CliResult>;
//# sourceMappingURL=run.d.ts.map