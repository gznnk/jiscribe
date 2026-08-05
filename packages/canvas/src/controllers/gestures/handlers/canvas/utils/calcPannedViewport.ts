import { roundToDecimal } from "@workspace/geometry";

import { PRECISION } from "../../../../../constants/precision";
import type { Viewport } from "../../../../../states/canvas/Viewport";

/**
 * Viewport panned so the content follows the pointer (grab scroll / touch pan).
 *
 * @param initialViewport - The viewport at dragStart (eventStartSnapshot), not the
 *   current one: the pan is recomputed from the drag origin every frame, so
 *   incremental drift cannot accumulate.
 * @param clientDelta - Movement since dragStart in screen pixels. Screen-based on
 *   purpose: world coordinates shift while panning, client coordinates do not.
 */
export const calcPannedViewport = (
	initialViewport: Viewport,
	clientDelta: { x: number; y: number },
): Viewport => {
	const deltaX = clientDelta.x / initialViewport.zoom;
	const deltaY = clientDelta.y / initialViewport.zoom;
	return {
		...initialViewport,
		minX: roundToDecimal(initialViewport.minX - deltaX, PRECISION.COORDINATE),
		minY: roundToDecimal(initialViewport.minY - deltaY, PRECISION.COORDINATE),
	};
};
