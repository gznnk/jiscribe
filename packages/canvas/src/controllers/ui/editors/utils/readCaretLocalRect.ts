import { calcCaretContentOffset } from "./calcCaretContentOffset";
import { TEXT_LINE_HEIGHT } from "../../../../constants/textLineHeight";
import type { TextAlign } from "../../../../schemas/objects/types/TextAlign";
import type { TextMeasureFont } from "../../../../states/objects/utils/measureText";

/** The caret as a zero-width vertical segment; see readCaretLocalRect. */
export type CaretLocalRect = {
	/** X of the caret, in the offset parent's local px. */
	x: number;
	/** Y of the caret's top, in the offset parent's local px. */
	y: number;
	/** Height of the caret, one line box. */
	height: number;
};

/** LTR is the only direction the editors lay out in, so start/end are left/right. */
const toTextAlign = (cssTextAlign: string): TextAlign => {
	if (cssTextAlign === "center") {
		return "center";
	}
	if (cssTextAlign === "right" || cssTextAlign === "end") {
		return "right";
	}
	return "left";
};

/**
 * Where a textarea draws its caret, relative to its offset parent — for the text
 * editors, the wrapper that carries the transform, so the caller only has to put
 * the result through that transform to land in world coordinates.
 *
 * Everything but the caret index is read back off the element (font, padding,
 * alignment, its own scroll offsets), so the measurement follows whatever the
 * editor styled the textarea with. The x is exact only on an unwrapped line
 * (see calcCaretContentOffset).
 *
 * @param textArea - The textarea being edited; must be laid out (a mounted, non-hidden element) and positioned inside an `offsetParent`
 * @returns The caret segment, or null when the element carries no readable font size
 */
export const readCaretLocalRect = (
	textArea: HTMLTextAreaElement,
): CaretLocalRect | null => {
	const style = getComputedStyle(textArea);
	const fontSize = parseFloat(style.fontSize);
	if (!Number.isFinite(fontSize)) {
		return null;
	}

	const font: TextMeasureFont = {
		fontSize,
		fontFamily: style.fontFamily,
		fontWeight: style.fontWeight,
		fontStyle: style.fontStyle,
	};
	const paddingLeft = parseFloat(style.paddingLeft) || 0;
	const paddingTop = parseFloat(style.paddingTop) || 0;
	const paddingRight = parseFloat(style.paddingRight) || 0;
	// `line-height: normal` has no px value to read, so the shared ratio stands in.
	const lineHeight =
		parseFloat(style.lineHeight) || fontSize * TEXT_LINE_HEIGHT;

	// The moving end of a selection is the one the caret is drawn at.
	const caretIndex =
		textArea.selectionDirection === "backward"
			? textArea.selectionStart
			: textArea.selectionEnd;

	const offset = calcCaretContentOffset({
		text: textArea.value,
		caretIndex,
		font,
		contentWidth: Math.max(
			textArea.clientWidth - paddingLeft - paddingRight,
			0,
		),
		lineHeight,
		textAlign: toTextAlign(style.textAlign),
	});

	return {
		x: textArea.offsetLeft + paddingLeft + offset.x - textArea.scrollLeft,
		y: textArea.offsetTop + paddingTop + offset.y - textArea.scrollTop,
		height: lineHeight,
	};
};
