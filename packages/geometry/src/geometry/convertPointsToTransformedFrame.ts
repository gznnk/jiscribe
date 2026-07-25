import { calcPolyBoundingBox } from "./calcPolyBoundingBox";
import type { Point } from "../types/Point";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Smallest axis-aligned frame enclosing `points`, with no rotation and no flips.
 *
 * @returns The enclosing frame, or null if `points` is empty
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
