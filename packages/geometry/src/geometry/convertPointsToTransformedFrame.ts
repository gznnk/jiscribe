import { calcPolyBoundingBox } from "./calcPolyBoundingBox";
import type { Point } from "../types/Point";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Converts an array of Points to a TransformedFrame (center based) that
 * encompasses all points. Rotation is fixed to 0 and scale to 1.
 *
 * @param points - The array of points
 * @returns The corresponding TransformedFrame, or null if `points` is empty
 */
export const convertPointsToTransformedFrame = (
	points: Point[],
): TransformedFrame | null => {
	const box = calcPolyBoundingBox(points);
	if (box === null) {
		return null;
	}

	const width = box.right - box.left;
	const height = box.bottom - box.top;

	return {
		cx: box.left + width / 2,
		cy: box.top + height / 2,
		width,
		height,
		rotation: 0,
		scaleX: 1,
		scaleY: 1,
	};
};
