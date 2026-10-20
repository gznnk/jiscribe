// The vocabulary every tool decorating part of a text speaks: the built-in
// set_text_style / set_text_styles and any plugin tool reaching inside text of its
// own (a table's cells). Written in zod, as every tool argument is (ObjectAiTool.ts).

import type { InlineTextStyle, RichTextMatch } from "@jiscribe/doc";
import { z } from "zod";

import { AI_FONT_WEIGHTS } from "./textSlotStyleSchema";

/**
 * The typography a stretch of characters carries on its own, one optional zod schema
 * per field of InlineTextStyle. Alignment is absent on purpose: it places the whole
 * body, so it lives in textSlotStyleSchema. `fontWeight` arrives as written,
 * so run it through canonicalizeFontWeight before it reaches the document.
 */
export const inlineTextStyleSchema = {
	fontColor: z
		.string()
		.optional()
		.describe("Color of the matched characters, any CSS color."),
	fontSize: z
		.number()
		.min(1)
		.optional()
		.describe(
			"Size of the matched characters in px; the rest of the body keeps the shape's own size.",
		),
	fontFamily: z
		.string()
		.optional()
		.describe(
			'Font family for the matched characters, from the four the canvas ships faces for: \'"Source Sans 3", "Noto Sans JP", sans-serif\' (sans), \'"Source Serif 4", "Noto Serif JP", serif\' (serif), \'"Source Code Pro", "Noto Sans JP", monospace\' (monospace, e.g. for a code term inside a sentence), \'Caveat, "Klee One", cursive\' (handwriting).',
		),
	fontWeight: z
		.enum(AI_FONT_WEIGHTS)
		.optional()
		.describe(
			'Weight of the matched characters, from the shipped ladder "normal" (400) / "500" / "600" / "bold" (700); "400" and "700" are those two rungs written as a design token would spell them, and are stored as "normal" and "bold". "normal" takes the emphasis off again.',
		),
	fontStyle: z
		.enum(["normal", "italic"])
		.optional()
		.describe(
			'Slant of the matched characters; "normal" stands them upright again.',
		),
	textDecoration: z
		.enum(["none", "underline", "line-through", "underline line-through"])
		.optional()
		.describe('Line drawn on the matched characters; "none" removes it.'),
} satisfies Record<keyof InlineTextStyle, z.ZodType>;

/**
 * Which characters to decorate, named by the text itself rather than by an offset,
 * since an offset is something the model would have to count out of a string it
 * wrote. The fields of RichTextMatch, which styleRichTextMatches takes as they arrive.
 * `match` speaks of "the object's own text"; a tool whose text lives elsewhere (a
 * cell) re-describes it.
 */
export const textMatchSchema = {
	match: z
		.string()
		.min(1)
		.describe(
			"The characters to decorate, matched literally against the object's own text. Must occur in it — a stretch that does not is an error, not a silent no-op.",
		),
	occurrence: z
		.number()
		.int()
		.min(1)
		.optional()
		.describe(
			"Which occurrence to decorate when the text holds several, counted from 1. Omit to decorate every occurrence.",
		),
} satisfies Record<keyof RichTextMatch, z.ZodType>;
