import type { Dimensions } from "@jiscribe/geometry";

import { TEXT_BOX_PADDING_X, TEXT_BOX_PADDING_Y } from "./textBoxPadding";
import type { RichText } from "../../model/objects/types/RichText";
import { layoutVisualLines } from "../layout/layoutVisualLines";
import type { TextMeasureFont } from "../measure/TextMeasureFont";

/**
 * Size of a text box whose width is given and whose height follows from the text
 * wrapped inside it — the block layout, against calcTextBlockSize's label one.
 * The width is handed back untouched, so the box stays exactly as wide as it was
 * authored and only the height moves as the text changes.
 *
 * The wrapping is the one the box is drawn with (layoutVisualLines over the
 * content width, i.e. the box minus its horizontal padding), so the height
 * covers the lines the browser lays out and no width slack is added anywhere: a
 * line that ends up one fraction of a pixel too long wraps in both.
 *
 * @param text - The whole text, authored newlines included; an empty string sizes one empty line, as does each empty line
 * @param font - Font the text is drawn with, which each run overrides only where it sets a field; a family other than the drawn one moves where the lines break
 * @param width - Box width in local pixels, its horizontal padding included; a width at or below the padding still wraps at one pixel of content rather than collapsing
 * @returns The box size: `width` as given, and the height of the wrapped lines plus the vertical padding
 */
export const calcWrappedTextBlockSize = (
	text: RichText,
	font: TextMeasureFont,
	width: number,
): Dimensions => {
	const lines = layoutVisualLines(text, font, width - TEXT_BOX_PADDING_X * 2);

	return {
		width,
		height:
			lines.reduce((total, line) => total + line.height, 0) +
			TEXT_BOX_PADDING_Y * 2,
	};
};
