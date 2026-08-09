import type { Dimensions } from "@workspace/geometry";

import { calcTextLineWidths } from "./calcTextLineWidths";
import type { TextMeasureFont } from "./measureText";
import {
	TEXT_BLOCK_PADDING_X,
	TEXT_BLOCK_PADDING_Y,
	TEXT_BLOCK_WIDTH_SLACK,
} from "./textBlockMetrics";
import { TEXT_LINE_HEIGHT } from "../../constants/textLineHeight";

/** Width of a box holding no text, so an empty one still has something to hit. */
const TEXT_BLOCK_MIN_WIDTH = 16;

/**
 * Size of the box a text of its own — one with no frame to wrap inside — takes.
 * The text is laid out as authored: lines break at `\n` and nowhere else, so
 * width grows with the longest line and there is deliberately no maximum
 * (unlike calcBelowLabelTextRegion, whose label is bounded to stay under its
 * shape). The caller keeps the box's top-left fixed when this grows.
 *
 * @param text - The whole text, authored newlines included; an empty string sizes one empty line, as does each empty line
 * @param font - Font the text is drawn with; a family other than the drawn one skews the width
 * @returns The box size including padding. Outside a browser the width comes from the estimate measureTextWidth falls back to, so only the height is faithful
 */
export const calcTextBlockSize = (
	text: string,
	font: TextMeasureFont,
): Dimensions => {
	const lineWidths = calcTextLineWidths(text, font);
	const longestLineWidth = lineWidths.reduce(
		(widest, lineWidth) => Math.max(widest, lineWidth),
		0,
	);

	return {
		width: Math.max(
			TEXT_BLOCK_MIN_WIDTH,
			longestLineWidth + TEXT_BLOCK_PADDING_X * 2 + TEXT_BLOCK_WIDTH_SLACK,
		),
		height:
			lineWidths.length * font.fontSize * TEXT_LINE_HEIGHT +
			TEXT_BLOCK_PADDING_Y * 2,
	};
};
