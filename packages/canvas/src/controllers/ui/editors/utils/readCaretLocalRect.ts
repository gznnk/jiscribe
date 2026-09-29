import type { CaretSurfaceRect } from "./measureCaretInSurface";

/** The caret as a zero-width vertical segment; see readCaretLocalRect. */
export type CaretLocalRect = {
	/** X of the caret, in the offset parent's local px. */
	x: number;
	/** Y of the caret's top, in the offset parent's local px. */
	y: number;
	/** Height of the caret, one line box. */
	height: number;
};

/**
 * Where an editing surface draws its caret, relative to its offset parent — for
 * the text editors, the wrapper that carries the transform, so the caller only has
 * to put the result through that transform to land in world coordinates.
 *
 * @param surface - The element being edited; must be positioned inside an `offsetParent`, and its scroll offsets are read as they are now (scroll it first if the caret has to be inside the clip)
 * @param caret - The caret's line box in the surface's scroll coordinates (from measureCaretInSurface)
 */
export const readCaretLocalRect = (
	surface: HTMLElement,
	caret: CaretSurfaceRect,
): CaretLocalRect => ({
	x: surface.offsetLeft + caret.x - surface.scrollLeft,
	y: surface.offsetTop + caret.top - surface.scrollTop,
	height: caret.bottom - caret.top,
});
