import type { Point } from "@jiscribe/geometry";

import { getSvgPoint } from "./getSvgPoint";
import type { Viewport } from "../../../../states/canvas/Viewport";

/**
 * Converts client coordinates to world coordinates from the state viewport
 * rather than the rendered CTM.
 *
 * During edge scrolling the viewport advances in state once per tick, while the
 * DOM commit may lag a frame behind under load. A CTM-based conversion then
 * reads the stale view: the next tick scrolls the state viewport again while
 * the drag position it derives stands still, so the dragged shape falls behind
 * the cursor and snaps back on the catch-up frame — visible trembling. Deriving
 * positions from the same state the scroll increments keeps drag.last and the
 * viewport in lockstep, and a late commit merely delays the motion.
 *
 * @param svg - Supplies the on-screen rect the viewport maps onto; null falls
 *   back to getSvgPoint (which passes client coordinates through).
 * @param viewport - Pan/zoom state the conversion derives from; while it is
 *   missing or unmeasured (width/height 0) the rendered CTM is used instead.
 * @param clientX - Client / screen X in px.
 * @param clientY - Client / screen Y in px, measured from the viewport top.
 * @returns The point in world (SVG user-space) coordinates.
 */
export const getWorldPoint = (
	svg: SVGSVGElement | null,
	viewport: Viewport | undefined,
	clientX: number,
	clientY: number,
): Point => {
	if (svg && viewport && viewport.width > 0 && viewport.height > 0) {
		const rect = svg.getBoundingClientRect();
		if (rect.width > 0 && rect.height > 0) {
			const { minX, minY, width, height, zoom } = viewport;
			// The rendered viewBox is `minX minY width/zoom height/zoom` over the
			// element's client rect. The rect ratio (not 1/zoom directly) keeps the
			// mapping exact when the host CSS-scales the canvas element.
			return {
				x: minX + ((clientX - rect.left) * (width / zoom)) / rect.width,
				y: minY + ((clientY - rect.top) * (height / zoom)) / rect.height,
			};
		}
	}
	return getSvgPoint(svg, clientX, clientY);
};
