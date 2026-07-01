import { calcBoundingBox } from "./calcBoundingBox";
import type { BoxFeatures } from "../types/BoxFeatures";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Calculates the bounding box features of a transformed frame.
 * Takes into account rotation and scaling.
 *
 * `BoxFeatures` は `calcBoundingBox` が返す軸並行バウンディングボックスに、
 * center と四隅（いずれも AABB から導出される点）を加えたもの。AABB 算出は
 * calcBoundingBox に委ね、ここではその拡張だけを担う。
 *
 * @param frame - Transformed frame shape parameters
 * @returns The bounding box features
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
