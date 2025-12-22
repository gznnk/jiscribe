import { CONNECT_LINE_MARGIN } from "../../../constants/core/Constants";
import type { BoxGeometry } from "../../../types/core/BoxGeometry";

/**
 * Adds margin to a box geometry and returns a new box geometry with expanded boundaries.
 *
 * @param boxGeometry - The box geometry to add margin to
 * @returns A new box geometry with added margin
 */
export const addMarginToBoxGeometry = (
	boxGeometry: BoxGeometry,
): BoxGeometry => {
	const left = boxGeometry.left - CONNECT_LINE_MARGIN;
	const top = boxGeometry.top - CONNECT_LINE_MARGIN;
	const right = boxGeometry.right + CONNECT_LINE_MARGIN;
	const bottom = boxGeometry.bottom + CONNECT_LINE_MARGIN;
	return {
		top,
		left,
		right,
		bottom,
		center: boxGeometry.center,
		topLeft: { x: left, y: top },
		bottomLeft: { x: left, y: bottom },
		topRight: { x: right, y: top },
		bottomRight: { x: right, y: bottom },
	};
};
