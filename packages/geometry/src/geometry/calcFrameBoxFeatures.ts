import { calcBoundingBox } from "./calcBoundingBox";
import type { BoxFeatures } from "../types/BoxFeatures";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Axis-aligned bounding box of a transformed frame, extended with its center and
 * four corners. The box itself comes from {@link calcBoundingBox}.
 */
export const calcFrameBoxFeatures = (frame: TransformedFrame): BoxFeatures => {
	const { top, left, right, bottom } = calcBoundingBox(frame);

	return {
		top,
		left,
		right,
		bottom,
		center: {
			x: (left + right) / 2,
			y: (top + bottom) / 2,
		},
		topLeft: {
			x: left,
			y: top,
		},
		bottomLeft: {
			x: left,
			y: bottom,
		},
		topRight: {
			x: right,
			y: top,
		},
		bottomRight: {
			x: right,
			y: bottom,
		},
	};
};
