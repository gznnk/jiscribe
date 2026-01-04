import { calcRectKeyPoints } from "./calcRectKeyPoints";
import type { BoxFeatures } from "../types/BoxFeatures";
import type { TransformedFrame } from "../types/TransformedFrame";

// TODO: この関数は calcBoundingBox と似ているので、統合を検討すること
/**
 * Calculates the bounding box features of a transformed frame.
 * Takes into account rotation and scaling.
 *
 * @param frame - Transformed frame shape parameters
 * @returns The bounding box features
 */
export const calcFrameBoxFeatures = (
	frame: TransformedFrame,
): BoxFeatures => {
	const { cx, cy, width, height, rotation, scaleX, scaleY } = frame;
	const rectGeometry = {
		x: cx - width / 2,
		y: cy - height / 2,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
	};
	const { topLeft, bottomLeft, topRight, bottomRight } =
		calcRectKeyPoints(rectGeometry);

	const left = Math.min(topLeft.x, bottomLeft.x, topRight.x, bottomRight.x);
	const top = Math.min(topLeft.y, bottomLeft.y, topRight.y, bottomRight.y);
	const right = Math.max(topLeft.x, bottomLeft.x, topRight.x, bottomRight.x);
	const bottom = Math.max(topLeft.y, bottomLeft.y, topRight.y, bottomRight.y);

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
