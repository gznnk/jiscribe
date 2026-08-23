import { extname } from "node:path";

/** Region a render covers, in the two forms the command line offers. */
export type RenderRegion = "content" | "viewbox";

/** Everything a render needs, once the command line has been read and checked. */
export type RenderOptions = {
	/** Path of the `.jis.json` to draw. */
	input: string;
	/** Path to write; its extension decided {@link format}. */
	output: string;
	/** Which image to produce, taken from the output extension. */
	format: "png" | "svg";
	/** Output pixels per logical px. Always 1 for SVG, which has no raster. */
	scale: number;
	/** What the image covers. */
	region: RenderRegion;
	/**
	 * CSS colour to paint behind the drawing, `"transparent"` to paint nothing,
	 * or null to leave the document's own `background` in force.
	 */
	background: string | null;
	/** Channel name or executable path to launch, or null to search for one. */
	browser: string | null;
};

/**
 * Margin in world px kept around the drawing by `--region content`, for
 * documents that declare no `view.padding` of their own.
 *
 * Wider than the canvas's own export default (16), because a rendered file is
 * looked at on its own rather than inside an editor: the drawing needs room to
 * sit in, and the margin is also what keeps a stroke or an arrowhead reaching
 * past its shape's bounds from being cropped.
 */
export const RENDER_CONTENT_MARGIN = 40;

/** The values `--region` takes, for the error message to list. */
const REGIONS: readonly RenderRegion[] = ["content", "viewbox"];

const isRenderRegion = (value: string): value is RenderRegion =>
	(REGIONS as readonly string[]).includes(value);

/** What the raw command line resolved to, or why it could not be. */
export type RenderOptionsResult =
	{ ok: true; options: RenderOptions } | { ok: false; message: string };

/** Values as `parseArgs` hands them over, before any of them are known to be usable. */
export type RawRenderArgs = {
	positionals: readonly string[];
	output?: string;
	scale?: string;
	region?: string;
	background?: string;
	browser?: string;
};

/**
 * Checks a `render` command line and fills in what it left out. Kept apart from
 * the command itself, and from playwright, so the argument rules can be tested
 * without a browser anywhere near them.
 *
 * @param args - The parsed but unchecked values; `positionals` must hold exactly the input path
 * @returns The options, or the one message explaining what is wrong — never both
 */
export const resolveRenderOptions = (
	args: RawRenderArgs,
): RenderOptionsResult => {
	if (args.positionals.length !== 1) {
		return {
			ok: false,
			message:
				args.positionals.length === 0
					? "render needs one input file"
					: "render takes one input file at a time",
		};
	}
	if (args.output === undefined) {
		return { ok: false, message: "-o / --out is required" };
	}

	const extension = extname(args.output).toLowerCase();
	if (extension !== ".png" && extension !== ".svg") {
		return {
			ok: false,
			message: `cannot tell the format from "${args.output}": the output must end in .png or .svg`,
		};
	}
	const format = extension === ".png" ? "png" : "svg";

	const region = args.region ?? "content";
	if (!isRenderRegion(region)) {
		return {
			ok: false,
			message: `unknown --region "${region}": expected ${REGIONS.join(" or ")}`,
		};
	}

	let scale = 1;
	if (args.scale !== undefined) {
		scale = Number(args.scale);
		if (!Number.isFinite(scale) || scale <= 0) {
			return {
				ok: false,
				message: `--scale must be a positive number, got "${args.scale}"`,
			};
		}
		if (format === "svg") {
			return {
				ok: false,
				message:
					"--scale has no meaning for an SVG, which carries no pixels; drop it or render a .png",
			};
		}
	}

	return {
		ok: true,
		options: {
			input: args.positionals[0],
			output: args.output,
			format,
			scale,
			region,
			background: args.background ?? null,
			browser: args.browser ?? null,
		},
	};
};
