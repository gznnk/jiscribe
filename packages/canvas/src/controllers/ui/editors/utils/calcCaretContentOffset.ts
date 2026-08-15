import type { RichText } from "../../../../schemas/objects/types/RichText";
import { sliceRichText } from "../../../../schemas/objects/types/RichText";
import type { TextAlign } from "../../../../schemas/objects/types/TextAlign";
import type { TextMeasureFont } from "../../../../states/objects/utils/measureText";
import {
	layoutVisualLines,
	measureTextWidth,
} from "../../../../states/objects/utils/measureText";

/** What the caret's place in the text is read from; see calcCaretContentOffset. */
export type CaretContentOffsetParams = {
	/** The whole edited body, authored newlines included; its runs are measured as they are drawn. */
	text: RichText;
	/** Caret offset into `text`, in UTF-16 code units; outside the text it is clamped to its ends. */
	caretIndex: number;
	/** Font the slot is drawn with, which each run overrides only where it sets a field; a family other than the drawn one skews the offset. */
	font: TextMeasureFont;
	/** Width the text wraps in (the content box, padding excluded), in local px. */
	contentWidth: number;
	/** Horizontal alignment the lines are laid out with. */
	textAlign: TextAlign;
};

/** Where the caret is drawn inside the content box; see calcCaretContentOffset. */
export type CaretContentOffset = {
	/** X of the caret, from the content box's left edge, in local px. */
	x: number;
	/** Y of the top of the caret's line box, from the content box's top edge, in local px. */
	y: number;
	/** Height of that line box: the tallest type size on the line × the shared line-height. */
	height: number;
};

/**
 * Where the caret sits inside a text block, as the line box it is drawn in
 * relative to the content box's top-left corner.
 *
 * The text is laid out the way it is drawn ({@link layoutVisualLines}), so both
 * axes follow the wrapping: the y counts the heights of the lines above, which for
 * a body styled per range are not all equal, and the x is measured along the
 * caret's own *visual* line rather than its logical one. A caret that falls on a
 * soft-wrap boundary belongs to the line starting there, which is where the
 * character typed next is drawn.
 *
 * @param params - See {@link CaretContentOffsetParams}
 * @returns The caret's line box; `x` never leaves the content width, so the result
 *   stays inside the block even where a line is wider than the box
 */
export const calcCaretContentOffset = ({
	text,
	caretIndex,
	font,
	contentWidth,
	textAlign,
}: CaretContentOffsetParams): CaretContentOffset => {
	const lines = layoutVisualLines(text, font, contentWidth);
	let lineIndex = 0;
	let y = 0;
	for (let index = 1; index < lines.length; index += 1) {
		if (lines[index].start > caretIndex) {
			break;
		}
		lineIndex = index;
		y += lines[index - 1].height;
	}
	const line = lines[lineIndex];

	const lineWidth = Math.min(line.width, contentWidth);
	const prefixWidth = Math.min(
		measureTextWidth(
			sliceRichText(text, line.start, Math.max(caretIndex, line.start)),
			font,
		),
		lineWidth,
	);
	const lineLeft =
		textAlign === "center"
			? (contentWidth - lineWidth) / 2
			: textAlign === "right"
				? contentWidth - lineWidth
				: 0;

	return { x: lineLeft + prefixWidth, y, height: line.height };
};
