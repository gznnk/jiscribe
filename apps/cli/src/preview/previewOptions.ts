import { extname } from "node:path";

/** Everything a preview needs, once the command line has been read and checked. */
export type PreviewOptions = {
	/** Path of the `.jis.json` to put in the page. */
	input: string;
	/** Path to write the HTML file to. */
	output: string;
};

/** What the raw command line resolved to, or why it could not be. */
export type PreviewOptionsResult =
	{ ok: true; options: PreviewOptions } | { ok: false; message: string };

/** Values as `parseArgs` hands them over, before any of them are known to be usable. */
export type RawPreviewArgs = {
	positionals: readonly string[];
	output?: string;
};

/**
 * Checks a `preview` command line. Kept apart from the command itself so the
 * argument rules can be tested without reading or writing a file.
 *
 * One input at a time, like `render`: the output is a page about one document,
 * and a second document would need somewhere of its own to go.
 *
 * @param args - The parsed but unchecked values; `positionals` must hold exactly the input path
 * @returns The options, or the one message explaining what is wrong — never both
 */
export const resolvePreviewOptions = (
	args: RawPreviewArgs,
): PreviewOptionsResult => {
	if (args.positionals.length !== 1) {
		return {
			ok: false,
			message:
				args.positionals.length === 0
					? "preview needs one input file"
					: "preview takes one input file at a time",
		};
	}
	if (args.output === undefined) {
		return { ok: false, message: "-o / --out is required" };
	}
	if (extname(args.output).toLowerCase() !== ".html") {
		return {
			ok: false,
			message: `"${args.output}" is not an .html: preview writes one HTML file`,
		};
	}
	return {
		ok: true,
		options: { input: args.positionals[0], output: args.output },
	};
};
