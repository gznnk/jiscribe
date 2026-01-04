import type { BoxFeatures } from "@workspace/geometry";

import { CONNECT_LINE_MARGIN } from "../../../constants/core/Constants";

/**
 * Adds margin to box features and returns new box features with expanded boundaries.
 *
 * @param boxGeometry - The box features to add margin to
 * @returns New box features with added margin
 */
export const addMarginToBoxGeometry = (
	boxGeometry: BoxFeatures,
): BoxFeatures => {
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
