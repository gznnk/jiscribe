import { type RefObject, useLayoutEffect, useRef, useState } from "react";

import { useCanvasViewportElementRef } from "../../../CanvasViewportElementRefContext";
import { COMMENT_PANEL_VIEWPORT_MARGIN } from "../CommentsConstants";

/** Correction that keeps an absolutely positioned panel inside the canvas area. */
export type ViewportClampOffset = {
	/** px to add to the panel's `left`; negative pulls it back from the right edge. */
	offsetX: number;
	/** px to add to the panel's `top`; negative pulls it back from the bottom edge. */
	offsetY: number;
};

const NO_OFFSET: ViewportClampOffset = { offsetX: 0, offsetY: 0 };

/**
 * Keeps a panel anchored beside a canvas object inside the visible canvas area,
 * the way `useSubmenuPosition` keeps a dropdown inside it.
 *
 * The panel is clipped by the canvas root's `overflow: hidden`, so the bound is
 * that element's rect in browser viewport coordinates. The correction is
 * measured back out of the panel's own rect, which already carries the
 * previously applied one, so re-measuring never compounds.
 *
 * @param panelRef - ref of the element being clamped; while it holds null (the panel is not shown) the last correction is kept rather than reset
 * @param anchorLeft - the panel's uncorrected `left` in overlay px, which re-measures when it moves
 * @param anchorTop - the panel's uncorrected `top` in overlay px, likewise
 * @returns The px correction to add to the anchor position; `{0, 0}` while the panel already fits
 */
export function useViewportClampOffset(
	panelRef: RefObject<HTMLDivElement | null>,
	anchorLeft: number,
	anchorTop: number,
): ViewportClampOffset {
	const viewportElementRef = useCanvasViewportElementRef();
	const [offset, setOffset] = useState<ViewportClampOffset>(NO_OFFSET);
	const appliedOffsetRef = useRef<ViewportClampOffset>(NO_OFFSET);

	useLayoutEffect(() => {
		const panelElement = panelRef.current;
		if (!panelElement) {
			return;
		}

		const measure = (): void => {
			const panelRect = panelElement.getBoundingClientRect();
			const viewportElement = viewportElementRef?.current ?? null;
			const areaRect = viewportElement
				? viewportElement.getBoundingClientRect()
				: {
						left: 0,
						top: 0,
						right: window.innerWidth,
						bottom: window.innerHeight,
					};

			// The rect the panel would have without the correction already in place.
			const applied = appliedOffsetRef.current;
			const unshiftedLeft = panelRect.left - applied.offsetX;
			const unshiftedTop = panelRect.top - applied.offsetY;

			// The left / top adjustment is applied after the right / bottom one, so a
			// panel too large for the area is pinned to its top-left corner.
			let offsetX = 0;
			if (
				unshiftedLeft + panelRect.width >
				areaRect.right - COMMENT_PANEL_VIEWPORT_MARGIN
			) {
				offsetX =
					areaRect.right -
					COMMENT_PANEL_VIEWPORT_MARGIN -
					(unshiftedLeft + panelRect.width);
			}
			if (
				unshiftedLeft + offsetX <
				areaRect.left + COMMENT_PANEL_VIEWPORT_MARGIN
			) {
				offsetX = areaRect.left + COMMENT_PANEL_VIEWPORT_MARGIN - unshiftedLeft;
			}

			let offsetY = 0;
			if (
				unshiftedTop + panelRect.height >
				areaRect.bottom - COMMENT_PANEL_VIEWPORT_MARGIN
			) {
				offsetY =
					areaRect.bottom -
					COMMENT_PANEL_VIEWPORT_MARGIN -
					(unshiftedTop + panelRect.height);
			}
			if (
				unshiftedTop + offsetY <
				areaRect.top + COMMENT_PANEL_VIEWPORT_MARGIN
			) {
				offsetY = areaRect.top + COMMENT_PANEL_VIEWPORT_MARGIN - unshiftedTop;
			}

			if (offsetX === applied.offsetX && offsetY === applied.offsetY) {
				return;
			}
			appliedOffsetRef.current = { offsetX, offsetY };
			setOffset({ offsetX, offsetY });
		};

		measure();

		// The panel grows and shrinks as threads expand and composers open, which
		// moves its bottom edge without moving its anchor.
		if (typeof ResizeObserver === "undefined") {
			return;
		}
		const observer = new ResizeObserver(measure);
		observer.observe(panelElement);
		return () => observer.disconnect();
	}, [anchorLeft, anchorTop, panelRef, viewportElementRef]);

	return offset;
}
