// The vocabulary every tool decorating part of a text speaks: the built-in
// set_text_styles and any plugin tool reaching inside text of its
// own (a table's cells). Written in zod, as every tool argument is (ObjectAiTool.ts).

import type { InlineTextStyle, RichTextMatch } from "@jiscribe/doc";
import { z } from "zod";

import {
	AI_FONT_WEIGHTS,
	describeFontFamily,
	describeFontWeight,
} from "./textSlotStyleSchema";

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
		.describe("Size of the matched characters in px."),
	fontFamily: z
		.string()
		.optional()
		.describe(describeFontFamily("the matched characters")),
	fontWeight: z
		.enum(AI_FONT_WEIGHTS)
		.optional()
		.describe(describeFontWeight("the matched characters")),
	fontStyle: z
		.enum(["normal", "italic"])
		.optional()
		.describe("Slant of the matched characters."),
	textDecoration: z
		.enum(["none", "underline", "line-through", "underline line-through"])
		.optional()
		.describe("Line drawn on the matched characters."),
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
			"The characters to decorate, matched literally against the object's own text; an error when they do not occur.",
		),
	occurrence: z
		.number()
		.int()
		.min(1)
		.optional()
		.describe(
			"Which occurrence to decorate, counted from 1; omit for every one.",
		),
} satisfies Record<keyof RichTextMatch, z.ZodType>;
