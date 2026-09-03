import { layoutVisualLines } from "./layoutVisualLines";
import type { RichText } from "../../model/objects/types/RichText";
import type { TextMeasureFont } from "../measure/TextMeasureFont";

/**
 * Number of lines the text occupies once wrapped into a box of the given width,
 * counting authored newlines and automatic wrapping alike (see
 * {@link layoutVisualLines}). Multiply by `fontSize × line-height` for a box
 * height that does not clip the text — or, for a text whose runs are not all one
 * size and one family, take calcVisualTextHeight instead.
 *
 * @param text - The whole text, authored newlines included; an empty string counts as one line, as does each empty line
 * @param font - Font the text is drawn with; a family other than the drawn one moves where lines break
 * @param availableWidth - Content width the text wraps in, in local pixels; anything below 1 is treated as 1
 * @returns The line count, always at least 1
 */
export const calcVisualLineCount = (
	text: RichText,
	font: TextMeasureFont,
	availableWidth: number,
): number => layoutVisualLines(text, font, availableWidth).length;
