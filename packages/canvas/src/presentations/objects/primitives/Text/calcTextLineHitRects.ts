import type { Dimensions, Rect } from "@workspace/geometry";

import {
	TEXT_BOX_PADDING_X,
	TEXT_BOX_PADDING_Y,
} from "../../../../constants/textBoxPadding";
import { TEXT_LINE_HEIGHT } from "../../../../constants/textLineHeight";
import type { TextAlign } from "../../../../schemas/objects/types/TextAlign";
import { calcTextLineWidths } from "../../../../states/objects/utils/calcTextLineWidths";
import type { TextMeasureFont } from "../../../../states/objects/utils/measureText";
import { TEXT_BLOCK_WIDTH_SLACK } from "../../../../states/objects/utils/textBlockWidthSlack";

/**
 * The bands a frameless text can be picked by: one per line, each covering only
 * that line's own glyphs and sitting where the alignment puts them, so the blank
 * side of a short line lets the pointer through to whatever is underneath. A band
 * spans the full line height (fontSize × TEXT_LINE_HEIGHT), leading included,
 * since a gap the height of the leading would be too fine to aim at either way.
 *
 * An empty line yields no band at all — there is nothing there to pick — with
 * one exception: a text whose lines are all empty falls back to a single band
 * over the whole box, or a text emptied down to nothing could no longer be
 * selected or deleted.
 *
 * @param text - The whole text, authored newlines included; lines are taken as authored and never wrapped
 * @param font - Font the text is drawn with; a family other than the drawn one shifts every band's width and height
 * @param boxSize - Size of the box the text was measured into (calcTextBlockSize); bands never exceed its width, and the first and last lines take its vertical padding
 * @param textAlign - Side the drawn lines are pulled to inside the box; omitted takes TextOverlayFrame's own default, so a band always sits under the glyphs rather than where they would be if left-aligned
 * @returns Bands top to bottom in the shape's local coordinates, the box centered on the origin (x = -width/2 is the box's left edge), never empty
 */
export const calcTextLineHitRects = (
	text: string,
	font: TextMeasureFont,
	boxSize: Dimensions,
	textAlign: TextAlign = "center",
): Rect[] => {
	const lineWidths = calcTextLineWidths(text, font);
	const lineHeight = font.fontSize * TEXT_LINE_HEIGHT;
	const boxLeft = -boxSize.width / 2;
	const boxTop = -boxSize.height / 2;
	const lastLineIndex = lineWidths.length - 1;

	/** Left edge of a band of `bandWidth`, placed under the glyphs its line draws. */
	const bandLeft = (bandWidth: number): number => {
		if (textAlign === "center") {
			return -bandWidth / 2;
		}
		if (textAlign === "right") {
			return boxLeft + boxSize.width - bandWidth;
		}
		return boxLeft;
	};

	const lineRects = lineWidths.flatMap<Rect>((lineWidth, lineIndex) => {
		if (lineWidth <= 0) {
			return [];
		}
		// The box's own padding belongs to the outermost lines, so the edges of the
		// box stay grabbable; the 2px are too few to be worth aiming past.
		const isFirstLine = lineIndex === 0;
		const isLastLine = lineIndex === lastLineIndex;
		const topPadding = isFirstLine ? TEXT_BOX_PADDING_Y : 0;
		const bottomPadding = isLastLine ? TEXT_BOX_PADDING_Y : 0;

		const bandWidth = Math.min(
			boxSize.width,
			lineWidth + TEXT_BOX_PADDING_X * 2 + TEXT_BLOCK_WIDTH_SLACK,
		);

		return [
			{
				x: bandLeft(bandWidth),
				y: boxTop + TEXT_BOX_PADDING_Y + lineIndex * lineHeight - topPadding,
				width: bandWidth,
				height: lineHeight + topPadding + bottomPadding,
			},
		];
	});

	if (lineRects.length === 0) {
		return [
			{
				x: boxLeft,
				y: boxTop,
				width: boxSize.width,
				height: boxSize.height,
			},
		];
	}

	return lineRects;
};
