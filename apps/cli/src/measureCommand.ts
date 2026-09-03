import { parseArgs } from "node:util";

import { measureWrappedText, resolveContentBox } from "@jiscribe/doc-tools";

import { parseCommandArgs } from "./parseCommandArgs";

/**
 * The font stack a document that names none is drawn with — the `sans` entry of
 * the canvas's own list, spelled out here because a command line has no document
 * to read it off.
 */
const DEFAULT_FONT_FAMILY = '"Source Sans 3", "Noto Sans JP", sans-serif';

const USAGE =
	"usage: jiscribe measure --width <px> --font-size <px> [--bold] [--shape <type> --height <px>] [--json] <text>\n";

const round = (value: number): number => Math.round(value * 10) / 10;

/**
 * What a shape whose box does not hold its text is reported as, worded the same
 * here and in the MCP `measure_text` tool so the two answers cannot drift.
 *
 * @param shape - Object type name as the command line spelled it
 */
const outsideBoxMessage = (shape: string): string =>
	`shape ${shape} draws its label outside the box; the box size does not constrain the text`;

/**
 * What a type name outside the shipped set is reported as, worded the same here
 * and in the MCP `measure_text` tool.
 *
 * @param shape - Object type name as the command line spelled it
 */
const unknownShapeMessage = (shape: string): string =>
	`error: unknown shape type "${shape}" (not in the standard set)`;

const parsePositiveNumber = (raw: string, name: string): number | null => {
	const value = Number(raw);
	if (!Number.isFinite(value) || value <= 0) {
		process.stderr.write(`${name} must be a positive number, got "${raw}"\n`);
		return null;
	}
	return value;
};

const fail = (message?: string): number => {
	if (message !== undefined) {
		process.stderr.write(`${message}\n`);
	}
	process.stderr.write(USAGE);
	return 2;
};

/**
 * Answers "how does this text lay out in a box of this size" for one string,
 * without a document to put it in: the line count, the box the lines take, the
 * content box the named shape leaves for them, and whether the one fits in the
 * other.
 *
 * `--width` and `--height` are the shape's own size, not the space inside it —
 * the same numbers a document holds — so the content box is what the outline and
 * the shared padding leave of them.
 *
 * A shape that draws its label outside its box has no content box to fit into:
 * the text is measured as authored and reported with a note, and neither a
 * `content` line nor a verdict is printed.
 *
 * @param argv - Arguments after the sub-command name: `--width` (required), `--font-size` (required), `--bold`, `--shape` (default `rect`), `--height` (required for any shape whose outline is built from both sides and holds its text), `--json`, and the text as the single positional
 * @returns The process exit code: 0 when the text fits and for a shape whose box does not constrain it, 1 when it does not fit and for a type outside the shipped set, 2 for a malformed command line
 */
export const runMeasureCommand = (argv: readonly string[]): number => {
	const parsed = parseCommandArgs(USAGE, () =>
		parseArgs({
			args: [...argv],
			options: {
				width: { type: "string" },
				height: { type: "string" },
				"font-size": { type: "string" },
				shape: { type: "string", default: "rect" },
				bold: { type: "boolean", default: false },
				json: { type: "boolean", default: false },
			},
			allowPositionals: true,
		}),
	);
	if (parsed === null) {
		return 2;
	}
	const { values, positionals } = parsed;

	if (positionals.length !== 1) {
		return fail();
	}
	if (values.width === undefined || values["font-size"] === undefined) {
		return fail("--width and --font-size are required");
	}
	const width = parsePositiveNumber(values.width, "--width");
	const fontSize = parsePositiveNumber(values["font-size"], "--font-size");
	if (width === null || fontSize === null) {
		return fail();
	}
	const height =
		values.height === undefined
			? null
			: parsePositiveNumber(values.height, "--height");
	if (values.height !== undefined && height === null) {
		return fail();
	}

	const shape = values.shape ?? "rect";
	// No shipped calculator answers differently at one height than another about
	// whether it has a region at all, so a missing height cannot change the kind —
	// which is why the three-way answer is taken before the height is insisted on.
	const resolution = resolveContentBox({
		type: shape,
		width,
		height: height ?? 0,
	});
	if (resolution.kind === "unknown") {
		process.stderr.write(`${unknownShapeMessage(shape)}\n`);
		return 1;
	}

	const font = {
		fontSize,
		fontFamily: DEFAULT_FONT_FAMILY,
		fontWeight: values.bold ? "bold" : "normal",
	};

	// The box constrains nothing, so the text is laid out as authored — the
	// automatic size the shape draws its label at.
	if (resolution.kind === "outside") {
		const metrics = measureWrappedText(positionals[0], font);
		if (values.json) {
			process.stdout.write(
				`${JSON.stringify(
					{
						shape,
						lines: metrics.lines,
						width: round(metrics.width),
						height: round(metrics.height),
						contentWidth: null,
						contentHeight: null,
						fits: true,
						note: outsideBoxMessage(shape),
					},
					null,
					2,
				)}\n`,
			);
			return 0;
		}
		process.stdout.write(`lines ${metrics.lines}\n`);
		process.stdout.write(
			`text ${round(metrics.width)}x${round(metrics.height)}\n`,
		);
		process.stdout.write(`note: ${outsideBoxMessage(shape)}\n`);
		return 0;
	}

	// Only a plain box's content width follows from its width alone; every other
	// outline is cut from both sides at once, so measuring one without a height
	// would answer for a box nobody named.
	if (shape !== "rect" && height === null) {
		return fail(`--height is required for --shape ${shape}`);
	}

	const box = resolution.rect;
	const metrics = measureWrappedText(positionals[0], font, box.width);

	const fits =
		metrics.width <= box.width + 0.5 &&
		(height === null || metrics.height <= box.height);

	if (values.json) {
		process.stdout.write(
			`${JSON.stringify(
				{
					shape,
					lines: metrics.lines,
					width: round(metrics.width),
					height: round(metrics.height),
					contentWidth: round(box.width),
					contentHeight: height === null ? null : round(box.height),
					fits,
				},
				null,
				2,
			)}\n`,
		);
		return fits ? 0 : 1;
	}

	process.stdout.write(`lines ${metrics.lines}\n`);
	process.stdout.write(
		`text ${round(metrics.width)}x${round(metrics.height)}\n`,
	);
	process.stdout.write(
		`content ${round(box.width)}x${height === null ? "-" : round(box.height)}\n`,
	);
	process.stdout.write(`fits ${fits ? "yes" : "no"}\n`);
	return fits ? 0 : 1;
};
