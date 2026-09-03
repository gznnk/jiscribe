import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { parseArgs } from "node:util";

import { validateDoc } from "@jiscribe/doc-tools";

import { parseCommandArgs } from "./parseCommandArgs";
import { readPreviewAssets } from "./preview/previewAssets";
import { resolvePreviewOptions } from "./preview/previewOptions";
import { buildPreviewPage } from "./preview/previewPage";
import { formatDiagnosticLine } from "./reportLines";

const USAGE = "usage: jiscribe preview <file> -o <out.html>\n";

/**
 * Writes a document into a single HTML file that draws it in a real canvas.
 *
 * The same document, shapes and text measurement as the editor, in a file that
 * asks nothing of the machine opening it — no server, no install, no checkout.
 * It is validated first, for the reason `render` validates first: a document the
 * canvas would refuse to open produces a blank page, and the diagnostics say more.
 *
 * @param argv - Arguments after the sub-command name; the input file is the single positional
 * @returns The process exit code: 0 on success, 1 when the document is invalid or the file cannot be written, 2 for a malformed command line
 */
export const runPreviewCommand = (argv: readonly string[]): number => {
	const parsed = parseCommandArgs(USAGE, () =>
		parseArgs({
			args: [...argv],
			options: { out: { type: "string", short: "o" } },
			allowPositionals: true,
		}),
	);
	if (parsed === null) {
		return 2;
	}

	const resolved = resolvePreviewOptions({
		positionals: parsed.positionals,
		output: parsed.values.out,
	});
	if (!resolved.ok) {
		process.stderr.write(`${resolved.message}\n${USAGE}`);
		return 2;
	}
	const options = resolved.options;

	let text: string;
	try {
		text = readFileSync(options.input, "utf8");
	} catch (error) {
		process.stderr.write(
			`cannot read ${options.input}: ${error instanceof Error ? error.message : String(error)}\n`,
		);
		return 1;
	}

	const validation = validateDoc(text);
	if (!validation.ok || validation.doc === undefined) {
		for (const diagnostic of validation.diagnostics) {
			process.stdout.write(
				`${formatDiagnosticLine(options.input, diagnostic)}\n`,
			);
		}
		process.stderr.write(
			`${options.input} does not validate, so there is nothing to preview\n`,
		);
		return 1;
	}

	try {
		const page = buildPreviewPage({
			...readPreviewAssets(),
			doc: validation.doc,
			title: basename(options.input),
		});
		mkdirSync(dirname(options.output), { recursive: true });
		writeFileSync(options.output, page);
		const kilobytes = Math.round(Buffer.byteLength(page) / 1024);
		process.stdout.write(
			`previewed ${options.input} -> ${options.output} ${kilobytes} KB\n`,
		);
		return 0;
	} catch (error) {
		process.stderr.write(
			`${error instanceof Error ? error.message : String(error)}\n`,
		);
		return 1;
	}
};
