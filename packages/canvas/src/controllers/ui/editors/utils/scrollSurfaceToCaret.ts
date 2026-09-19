import type { CaretSurfaceRect } from "./measureCaretInSurface";

/**
 * Scroll `surface` by the least it takes for the caret's line box to lie inside
 * the element's clip — the same move a browser makes when it reveals a selection,
 * but on demand.
 *
 * A caret already inside the clip leaves the scroll offset untouched, so a surface
 * the user scrolled by hand mid-edit is not yanked back. Either end of the scroll
 * range carries the padding: on the last line this lands on the maximum offset,
 * showing the padding below the text, and on the first line it lands on 0.
 *
 * @param surface - The scrolling element (one styled `overflow-y: auto` or `scroll`); one that cannot scroll simply has the assignment clamped back to 0 by the browser, as is any offset past the end of the range
 * @param caret - The caret's line box in the surface's scroll coordinates (from measureCaretInSurface)
 */
export const scrollSurfaceToCaret = (
	surface: HTMLElement,
	caret: CaretSurfaceRect,
): void => {
	if (caret.bottom > surface.scrollTop + surface.clientHeight) {
		surface.scrollTop =
			caret.bottom + caret.paddingBottom - surface.clientHeight;
		return;
	}
	if (caret.top < surface.scrollTop) {
		surface.scrollTop = caret.top - caret.paddingTop;
	}
};
