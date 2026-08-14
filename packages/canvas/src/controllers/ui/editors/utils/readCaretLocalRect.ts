import { calcCaretContentOffset } from "./calcCaretContentOffset";
import type { RichText } from "../../../../schemas/objects/types/RichText";
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

/** Where the caret is, in the terms the measurement needs: an offset and the body it indexes. */
export type CaretTarget = {
	/** Offset the caret is drawn at, in UTF-16 code units of `text` (the moving end of a selection). */
	caretIndex: number;
	/** The body being edited, styling included, so a part drawn larger is measured as drawn. */
	text: RichText;
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
 * Where an editing surface draws its caret, relative to its offset parent — for
 * the text editors, the wrapper that carries the transform, so the caller only has
 * to put the result through that transform to land in world coordinates.
 *
 * Everything but the caret itself is read back off the element (font, padding,
 * alignment, its own scroll offsets), so the measurement follows whatever the
 * editor styled the surface with; the caret's place inside the text is computed
 * rather than read from the DOM, which keeps one code path for the connector
 * label's textarea and the shape editor's contenteditable div.
 *
 * @param surface - The element being edited (a textarea or a contenteditable div); must be laid out (a mounted, non-hidden element) and positioned inside an `offsetParent`
 * @param target - The caret offset and the body it indexes; the body's own runs override the element's font where they set one
 * @returns The caret segment, or null when the element carries no readable font size
 */
export const readCaretLocalRect = (
	surface: HTMLElement,
	target: CaretTarget,
): CaretLocalRect | null => {
	const style = getComputedStyle(surface);
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

	const offset = calcCaretContentOffset({
		text: target.text,
		caretIndex: target.caretIndex,
		font,
		contentWidth: Math.max(surface.clientWidth - paddingLeft - paddingRight, 0),
		textAlign: toTextAlign(style.textAlign),
	});

	return {
		x: surface.offsetLeft + paddingLeft + offset.x - surface.scrollLeft,
		y: surface.offsetTop + paddingTop + offset.y - surface.scrollTop,
		height: offset.height,
	};
};
