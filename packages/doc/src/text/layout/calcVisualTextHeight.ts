import { layoutVisualLines } from "./layoutVisualLines";
import { createOffsetMeasurer, splitAuthoredLines } from "./utils/textOffsets";
import type { RichText } from "../../model/objects/types/RichText";
import type { TextMeasureFont } from "../measure/TextMeasureFont";

/**
 * Height the drawn lines of a text add up to, the line boxes of parts drawn
 * larger included. The height counterpart of calcVisualLineCount, and equal to
 * `lineCount × fontSize × line-height` whenever nothing overrides the type size
 * or the font family.
 *
 * @param text - The whole text, authored newlines included
 * @param font - Font the slot is drawn with
 * @param availableWidth - Content width the text wraps in; `undefined` lays it out as authored, breaking only at newlines, and takes the height without measuring any width
 * @returns The total height in local pixels, never below one line box
 */
export const calcVisualTextHeight = (
	text: RichText,
	font: TextMeasureFont,
	availableWidth?: number,
): number => {
	if (availableWidth !== undefined) {
		return layoutVisualLines(text, font, availableWidth).reduce(
			(total, line) => total + line.height,
			0,
		);
	}
	// Without a width to wrap in, the drawn lines are the authored ones and their
	// heights follow from the type sizes alone. Going through layoutVisualLines
	// would canvas-measure every line for a width this caller discards, and the
	// callers that pass no width ask for a height per line on every render.
	const { plain, measurer } = createOffsetMeasurer(text, font);
	return splitAuthoredLines(plain).reduce(
		(total, line) => total + measurer.lineHeight(line.start, line.end),
		0,
	);
};
