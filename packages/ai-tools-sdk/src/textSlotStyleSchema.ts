// The typography vocabulary every tool styling a whole body of text speaks: the
// built-in set_style and any plugin tool styling text slots of its own (a table's
// cells). Written in zod, as every tool argument is (ObjectAiTool.ts).

import type { TextSlotStyle } from "@jiscribe/doc";
import { z } from "zod";

/**
 * The weights a tool lets the model write: the ladder the canvas ships faces for,
 * plus "400" / "700" as a design token spells two of its rungs. Pass a written weight
 * through {@link canonicalizeFontWeight} before storing it.
 */
export const AI_FONT_WEIGHTS = [
	"normal",
	"400",
	"500",
	"600",
	"700",
	"bold",
] as const;

/**
 * The numeric weights that name a rung the document spells out in words, and the
 * spelling it keeps. The middle rungs ("500" / "600") have no other spelling.
 */
const FONT_WEIGHT_ALIASES: Readonly<Record<string, string>> = {
	"400": "normal",
	"700": "bold",
};

/**
 * The spelling a document keeps for a weight the model wrote. The document keeps
 * "normal" / "bold" for those two rungs because the UI's bold toggle matches on them.
 *
 * @param fontWeight - A weight from {@link AI_FONT_WEIGHTS}; any other string comes back as it is
 * @returns "normal" for "400", "bold" for "700", and `fontWeight` itself otherwise
 */
export const canonicalizeFontWeight = (fontWeight: string): string =>
	FONT_WEIGHT_ALIASES[fontWeight] ?? fontWeight;

/**
 * The typography of one whole body of text, one optional zod schema per field of
 * TextSlotStyle, in the order set_style declares them. Spread it into a tool's
 * `inputSchema`; `fontWeight` arrives as written, so run it through
 * {@link canonicalizeFontWeight} before it reaches the document.
 */
export const textSlotStyleSchema = {
	fontColor: z.string().optional().describe("Text color, any CSS color."),
	fontSize: z.number().min(1).optional().describe("Text size in px."),
	fontFamily: z
		.string()
		.optional()
		.describe(
			'Font family for the whole body, from the four the canvas ships faces for: \'"Source Sans 3", "Noto Sans JP", sans-serif\' (sans), \'"Source Serif 4", "Noto Serif JP", serif\' (serif), \'"Source Code Pro", "Noto Sans JP", monospace\' (monospace), \'Caveat, "Klee One", cursive\' (handwriting). A family outside those is drawn by whatever the viewer has, and measured by estimate.',
		),
	fontWeight: z
		.enum(AI_FONT_WEIGHTS)
		.optional()
		.describe(
			'Text weight, from the ladder the canvas ships faces for: "normal" (400), "500", "600", "bold" (700). "400" and "700" are the same two rungs written as a design token would spell them, and are stored as "normal" and "bold".',
		),
	fontStyle: z
		.enum(["normal", "italic"])
		.optional()
		.describe('Slant of the whole body; "normal" stands it upright again.'),
	textDecoration: z
		.enum(["none", "underline", "line-through", "underline line-through"])
		.optional()
		.describe('Line drawn on the whole body; "none" removes it.'),
	textAlign: z
		.enum(["left", "center", "right"])
		.optional()
		.describe("Horizontal text alignment inside the shape."),
	verticalAlign: z
		.enum(["top", "middle", "bottom"])
		.optional()
		.describe("Vertical text alignment inside the shape."),
} satisfies Record<keyof TextSlotStyle, z.ZodType>;
