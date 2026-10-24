import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { toCanvasFilePath } from "@jiscribe/doc-tools/file";

import {
	applyOpBatch,
	parseBatchEntries,
	type OpFailure,
	type OpReport,
} from "./applyOpBatch";
import { parseCommandArgs } from "./parseCommandArgs";

const USAGE = `usage: jiscribe op <file> <tool> [--args <json | @path | ->] [--create] [--text]
       jiscribe op <file> --batch <@path | -> [--create] [--text]
`;

/**
 * Reads the value of `--args` or `--batch`: `-` is stdin, `@path` a file
 * (relative to cwd), anything else the JSON itself.
 */
const readJsonSource = async (source: string): Promise<string> => {
	if (source === "-") {
		const chunks: Buffer[] = [];
		for await (const chunk of process.stdin) {
			chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
		}
		return Buffer.concat(chunks).toString("utf8");
	}
	if (source.startsWith("@")) {
		return await readFile(resolve(source.slice(1)), "utf8");
	}
	return source;
};

/**
 * The JSON an option names, or the failure to report. Reading and parsing are
 * the input's fault, not the command line's, so they come back as a failure
 * (exit 1) rather than a usage error.
 */
const readJsonOption = async (
	optionName: string,
	source: string,
): Promise<{ ok: true; value: unknown } | { ok: false; message: string }> => {
	let text: string;
	try {
		text = await readJsonSource(source);
	} catch (error) {
		return {
			ok: false,
			message: `cannot read ${optionName}: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
	try {
		return { ok: true, value: JSON.parse(text) as unknown };
	} catch (error) {
		return {
			ok: false,
			message: `${optionName} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
};

/** Whether a parsed JSON value is an object, as opposed to an array or a scalar. */
const isJsonObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Writes every control character but newline and tab as `\uXXXX`, so text
 * taken from a document (an id, a label, a file name) cannot drive the terminal
 * it is printed to. Applied to the JSON report too, where it catches what
 * JSON.stringify leaves raw (DEL and the C1 range) and keeps it valid JSON.
 */
const escapeControlCharacters = (text: string): string =>
	text.replaceAll(
		/[^\P{Cc}\n\t]/gu,
		(character) =>
			`\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
	);

/** The report's failure as one line, naming the entry it was down to. */
const formatFailureLine = (failure: OpFailure): string => {
	const entry =
		failure.index === undefined
			? ""
			: `entry ${failure.index}${failure.tool === undefined ? "" : ` ${failure.tool}`}${failure.as === undefined ? "" : ` as ${failure.as}`}: `;
	return `error: ${entry}${failure.message}`;
};

/**
 * `--text`: one line per result (`<index> <tool>[ as <name>]: <text>`, a
 * multi-line text indented under it), the failure, then what became of the file.
 * Control characters come out escaped (see escapeControlCharacters).
 */
const formatTextReport = (report: OpReport): string => {
	const lines = report.results.map(
		(result, index) =>
			`${index} ${result.tool}${result.as === undefined ? "" : ` as ${result.as}`}: ${result.text.replaceAll("\n", "\n  ")}`,
	);
	if (report.error !== undefined) {
		lines.push(formatFailureLine(report.error));
	}
	lines.push(`${report.written ? "written" : "not written"} ${report.file}`);
	return `${escapeControlCharacters(lines.join("\n"))}\n`;
};

/**
 * Runs one tool, or a batch of them, against a canvas file, with the names,
 * arguments and replies jiscribe-mcp gives the same tools.
 *
 * @param argv - Arguments after the sub-command name: the file (relative to cwd, or absolute), then either a tool name with optional `--args`, or `--batch`; `--create` starts a missing file from an empty document, `--text` prints lines instead of the JSON report
 * @returns The process exit code: 0 when every entry succeeded, 1 when one failed or nothing could be written, 2 for a malformed command line
 */
export const runOpCommand = async (
	argv: readonly string[],
): Promise<number> => {
	const parsed = parseCommandArgs(USAGE, () =>
		parseArgs({
			args: [...argv],
			options: {
				args: { type: "string" },
				batch: { type: "string" },
				create: { type: "boolean", default: false },
				text: { type: "boolean", default: false },
			},
			allowPositionals: true,
		}),
	);
	if (parsed === null) {
		return 2;
	}
	const { values, positionals } = parsed;
	const [fileArg, toolName, ...extra] = positionals;

	const usageError = (message: string): number => {
		process.stderr.write(`error: ${message}\n${USAGE}`);
		return 2;
	};
	if (fileArg === undefined) {
		return usageError("name the file to edit");
	}
	if (extra.length > 0) {
		return usageError(`unexpected argument: ${extra[0]}`);
	}
	let request:
		| { kind: "tool"; toolName: string; argsSource: string | undefined }
		| { kind: "batch"; batchSource: string };
	if (toolName !== undefined) {
		if (values.batch !== undefined) {
			return usageError("give either a tool or --batch, not both");
		}
		request = { kind: "tool", toolName, argsSource: values.args };
	} else {
		if (values.batch === undefined) {
			return usageError("give a tool to run, or --batch");
		}
		if (values.args !== undefined) {
			return usageError("--args goes with a tool; a batch carries its own");
		}
		if (values.batch !== "-" && !values.batch.startsWith("@")) {
			return usageError("--batch takes @<path> or - (stdin)");
		}
		request = { kind: "batch", batchSource: values.batch };
	}

	const print = (report: OpReport): number => {
		process.stdout.write(
			values.text
				? formatTextReport(report)
				: `${escapeControlCharacters(JSON.stringify(report, null, 2))}\n`,
		);
		return report.ok ? 0 : 1;
	};
	const failWithoutRunning = (file: string, error: OpFailure): number =>
		print({ ok: false, written: false, file, results: [], error });

	const givenPath = resolve(fileArg);
	let filePath: string;
	try {
		filePath = await toCanvasFilePath(givenPath);
	} catch (error) {
		return failWithoutRunning(givenPath, {
			message: error instanceof Error ? error.message : String(error),
		});
	}

	if (request.kind === "tool") {
		const entryLabel = { index: 0, tool: request.toolName };
		let args: Record<string, unknown> = {};
		if (request.argsSource !== undefined) {
			const argsJson = await readJsonOption("--args", request.argsSource);
			if (!argsJson.ok) {
				return failWithoutRunning(filePath, {
					...entryLabel,
					message: argsJson.message,
				});
			}
			if (!isJsonObject(argsJson.value)) {
				return failWithoutRunning(filePath, {
					...entryLabel,
					message: "--args must be a JSON object",
				});
			}
			args = argsJson.value;
		}
		// A single tool's arguments are taken as given: `$` is only special
		// between the entries of a batch
		return print(
			await applyOpBatch(filePath, [{ tool: request.toolName, args }], {
				create: values.create,
				resolvesReferences: false,
			}),
		);
	}

	const batchJson = await readJsonOption("--batch", request.batchSource);
	if (!batchJson.ok) {
		return failWithoutRunning(filePath, { message: batchJson.message });
	}
	const batch = parseBatchEntries(batchJson.value);
	if (!batch.ok) {
		return failWithoutRunning(filePath, batch.error);
	}
	return print(
		await applyOpBatch(filePath, batch.entries, {
			create: values.create,
			resolvesReferences: true,
		}),
	);
};
