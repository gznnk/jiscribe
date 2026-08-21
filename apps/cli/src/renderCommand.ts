import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

import { validateDoc } from "@jiscribe/doc-tools";

import { renderDoc } from "./render/renderDoc";
import { resolveRenderOptions } from "./render/renderOptions";
import { formatDiagnosticLine } from "./reportLines";

const USAGE =
	"usage: jiscribe render <file> -o <out.png|out.svg> [--scale <n>] [--region content|viewbox] [--background <css color>] [--browser <channel|path>]\n";

/**
 * Draws a document to a PNG or an SVG.
 *
 * The document is validated first: a file the canvas would refuse to open is not
 * one to spend a browser launch on, and the diagnostics say more than a blank
 * image would.
 *
 * @param argv - Arguments after the sub-command name; the input file is the single positional, and the output extension chooses the format
 * @returns The process exit code: 0 on success, 1 when the document is invalid or the render fails, 2 for a malformed command line
 */
export const runRenderCommand = async (
	argv: readonly string[],
): Promise<number> => {
	const { values, positionals } = parseArgs({
		args: [...argv],
		options: {
			out: { type: "string", short: "o" },
			scale: { type: "string" },
			region: { type: "string" },
			background: { type: "string" },
			browser: { type: "string" },
		},
		allowPositionals: true,
	});

	const resolved = resolveRenderOptions({
		positionals,
		output: values.out,
		scale: values.scale,
		region: values.region,
		background: values.background,
		browser: values.browser,
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
			`${options.input} does not validate, so there is nothing to render\n`,
		);
		return 1;
	}

	try {
		const image = await renderDoc(validation.doc, options);
		mkdirSync(dirname(options.output), { recursive: true });
		writeFileSync(options.output, image.body);
		const size =
			image.pixelSize === null
				? "svg"
				: `${image.pixelSize.width}x${image.pixelSize.height}`;
		process.stdout.write(
			`rendered ${options.input} -> ${options.output} ${size} via ${image.browserDescription}\n`,
		);
		return 0;
	} catch (error) {
		process.stderr.write(
			`${error instanceof Error ? error.message : String(error)}\n`,
		);
		return 1;
	}
};
