import type { RichText } from "@jiscribe/doc/model/objects/types/RichText";
import type { TextAlign } from "@jiscribe/doc/model/objects/types/TextAlign";
import type { TextMeasureFont } from "@jiscribe/doc/text/measure/TextMeasureFont";

import { calcCaretContentOffset } from "./calcCaretContentOffset";

/** Where the caret is, in the terms the measurement needs: an offset and the body it indexes. */
export type CaretTarget = {
	/** Offset the caret is drawn at, in UTF-16 code units of `text` (the moving end of a selection). */
	caretIndex: number;
	/** The body being edited, styling included, so a part drawn larger is measured as drawn. */
	text: RichText;
};

/**
 * The caret's line box in the surface's scroll coordinates: px from the top-left
 * corner of the padding box, before any scroll offset is taken off. Padding
 * comes along because the scroll range carries it (see scrollSurfaceToCaret).
 */
export type CaretSurfaceRect = {
	/** X of the caret, from the padding box's left edge. */
	x: number;
	/** Y of the top of the caret's line box, from the padding box's top edge. */
	top: number;
	/** Y of the bottom of that line box; `bottom - top` is one line box. */
	bottom: number;
	/** Padding above the text, in local px; the top of the scroll range shows it. */
	paddingTop: number;
	/** Padding below the text, in local px; the bottom of the scroll range shows it. */
	paddingBottom: number;
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
 * Where an editing surface draws its caret inside its own scrollable content.
 *
 * Everything but the caret itself is read back off the element (font, padding,
 * alignment), so the measurement follows whatever the editor styled the surface
 * with; the caret's place inside the text is computed rather than read from the
 * DOM, which keeps one code path for the connector label's textarea and the shape
 * editor's contenteditable div. Nothing is written: scrolling the surface to the
 * result is scrollSurfaceToCaret, and placing it relative to the offset parent is
 * readCaretLocalRect.
 *
 * @param surface - The element being edited (a textarea or a contenteditable div); must be laid out (a mounted, non-hidden element), since its content width is what the text wraps in
 * @param target - The caret offset and the body it indexes; the body's own runs override the element's font where they set one
 * @returns The caret's line box, or null when the element carries no readable font size
 */
export const measureCaretInSurface = (
	surface: HTMLElement,
	target: CaretTarget,
): CaretSurfaceRect | null => {
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
	const paddingBottom = parseFloat(style.paddingBottom) || 0;

	const offset = calcCaretContentOffset({
		text: target.text,
		caretIndex: target.caretIndex,
		font,
		contentWidth: Math.max(surface.clientWidth - paddingLeft - paddingRight, 0),
		textAlign: toTextAlign(style.textAlign),
	});

	const top = paddingTop + offset.y;
	return {
		x: paddingLeft + offset.x,
		top,
		bottom: top + offset.height,
		paddingTop,
		paddingBottom,
	};
};
