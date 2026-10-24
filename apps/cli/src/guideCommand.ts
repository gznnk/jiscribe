import { parseArgs } from "node:util";

import {
	DRAWING_GUIDE_NAMES,
	DrawingGuideError,
	isDrawingGuideName,
	readDrawingGuide,
} from "@jiscribe/doc-tools/guides";

import { parseCommandArgs } from "./parseCommandArgs";

const USAGE = `usage: jiscribe guide <${DRAWING_GUIDE_NAMES.join(" | ")}>\n`;

/**
 * Prints one of the drawing guides, the markdown jiscribe-mcp's
 * read_drawing_guide hands back.
 *
 * @param argv - Arguments after the sub-command name: the guide's name as the single positional
 * @returns The process exit code: 0 on success, 1 when the guide is missing or empty (an incomplete installation), 2 for a malformed command line
 */
export const runGuideCommand = (argv: readonly string[]): number => {
	const parsed = parseCommandArgs(USAGE, () =>
		parseArgs({ args: [...argv], options: {}, allowPositionals: true }),
	);
	if (parsed === null) {
		return 2;
	}
	const { positionals } = parsed;
	const [guide] = positionals;
	if (
		positionals.length !== 1 ||
		guide === undefined ||
		!isDrawingGuideName(guide)
	) {
		process.stderr.write(USAGE);
		return 2;
	}

	let markdown: string;
	try {
		markdown = readDrawingGuide(guide);
	} catch (error) {
		if (error instanceof DrawingGuideError) {
			process.stderr.write(`error: ${error.message}\n`);
			return 1;
		}
		throw error;
	}
	process.stdout.write(markdown);
	return 0;
};
