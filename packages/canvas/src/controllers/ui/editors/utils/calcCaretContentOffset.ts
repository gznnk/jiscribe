import type { Point } from "@workspace/geometry";

import type { TextAlign } from "../../../../schemas/objects/types/TextAlign";
import type { TextMeasureFont } from "../../../../states/objects/utils/measureText";
import {
	calcVisualLineCount,
	measureTextWidth,
} from "../../../../states/objects/utils/measureText";

/** What the caret's place in the text is read from; see calcCaretContentOffset. */
export type CaretContentOffsetParams = {
	/** The whole edited text, authored newlines included. */
	text: string;
	/** Caret index into `text`, i.e. a textarea's `selectionStart` / `selectionEnd`. */
	caretIndex: number;
	/** Font the text is drawn with; a family other than the drawn one skews the offset. */
	font: TextMeasureFont;
	/** Width the text wraps in (the content box, padding excluded), in local px. */
	contentWidth: number;
	/** Height of one line box, in local px (`fontSize × TEXT_LINE_HEIGHT`). */
	lineHeight: number;
	/** Horizontal alignment the lines are laid out with. */
	textAlign: TextAlign;
};

/**
 * Where the caret sits inside a text block, as the top of its line box relative
 * to the content box's top-left corner.
 *
 * The x is measured along the caret's own logical line, so it is exact only
 * while that line is not soft-wrapped; a wrapped line has its x clamped to the
 * content width (its right edge) while the y still counts the wrapped lines. The
 * result therefore stays inside the block either way, which is what the callers
 * (revealing the caret) need.
 *
 * @param params - See {@link CaretContentOffsetParams}
 * @returns The caret's top point in local px; `y` is a whole multiple of `lineHeight`
 */
export const calcCaretContentOffset = ({
	text,
	caretIndex,
	font,
	contentWidth,
	lineHeight,
	textAlign,
}: CaretContentOffsetParams): Point => {
	const lineStart =
		caretIndex === 0 ? 0 : text.lastIndexOf("\n", caretIndex - 1) + 1;
	const lineEnd = text.indexOf("\n", caretIndex);
	const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);

	const lineWidth = Math.min(measureTextWidth(line, font), contentWidth);
	const prefixWidth = Math.min(
		measureTextWidth(text.slice(lineStart, caretIndex), font),
		lineWidth,
	);
	const lineLeft =
		textAlign === "center"
			? (contentWidth - lineWidth) / 2
			: textAlign === "right"
				? contentWidth - lineWidth
				: 0;

	const lineIndex =
		calcVisualLineCount(text.slice(0, caretIndex), font, contentWidth) - 1;

	return { x: lineLeft + prefixWidth, y: lineIndex * lineHeight };
};
