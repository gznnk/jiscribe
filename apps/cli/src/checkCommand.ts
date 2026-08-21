import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import type { Diagnostic } from "@jiscribe/doc-tools";
import { diagnoseDoc, validateDoc } from "@jiscribe/doc-tools";

import { formatDiagnosticLine, hasError } from "./reportLines";

/** What one file came to, in the shape `--json` prints. */
type FileReport = {
	file: string;
	ok: boolean;
	diagnostics: Diagnostic[];
};

const checkFile = (file: string, diagnose: boolean): FileReport => {
	let text: string;
	try {
		text = readFileSync(file, "utf8");
	} catch (error) {
		return {
			file,
			ok: false,
			diagnostics: [
				{
					severity: "error",
					message: `cannot read: ${error instanceof Error ? error.message : String(error)}`,
				},
			],
		};
	}

	const result = validateDoc(text);
	const diagnostics = [...result.diagnostics];
	// Diagnosis needs a document the parser accepted, and its findings would be
	// noise beside a structural error anyway — a shape whose width failed to
	// validate has no meaningful content box.
	if (diagnose && result.ok && result.doc !== undefined) {
		diagnostics.push(...diagnoseDoc(result.doc));
	}
	return { file, ok: !hasError(diagnostics), diagnostics };
};

/**
 * Runs `validate` or `diagnose` over the files named on the command line and
 * prints what they came to.
 *
 * @param argv - Arguments after the sub-command name; every positional is a file path (globs are the shell's job), and `--json` swaps the one-line-per-finding output for a single JSON object
 * @param diagnose - Whether to add the overflow diagnosis on top of validation, which is the whole difference between the two sub-commands
 * @returns The process exit code: 0 when every file passed, 1 when any produced an error
 */
export const runCheckCommand = (
	argv: readonly string[],
	diagnose: boolean,
): number => {
	const { values, positionals } = parseArgs({
		args: [...argv],
		options: { json: { type: "boolean", default: false } },
		allowPositionals: true,
	});

	if (positionals.length === 0) {
		process.stderr.write(
			`usage: jiscribe ${diagnose ? "diagnose" : "validate"} [--json] <files...>\n`,
		);
		return 2;
	}

	const reports = positionals.map((file) => checkFile(file, diagnose));

	if (values.json) {
		process.stdout.write(`${JSON.stringify({ files: reports }, null, 2)}\n`);
	} else {
		for (const report of reports) {
			for (const diagnostic of report.diagnostics) {
				process.stdout.write(
					`${formatDiagnosticLine(report.file, diagnostic)}\n`,
				);
			}
			if (report.ok) {
				process.stdout.write(`ok ${report.file}\n`);
			}
		}
	}

	return reports.every((report) => report.ok) ? 0 : 1;
};
