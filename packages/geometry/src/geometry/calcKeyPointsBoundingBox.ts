import type { BoundingBox } from "../types/BoundingBox";
import type { FrameKeyPoints } from "../types/FrameKeyPoints";

/**
 * Axis-aligned bounding box of the four corners of a {@link FrameKeyPoints}.
 *
 * @param keyPoints - Key points to enclose; only the four corners are read,
 *   since the edge midpoints can never lie outside them
 */
export const calcKeyPointsBoundingBox = (
	keyPoints: FrameKeyPoints,
): BoundingBox => ({
	left: Math.min(
		keyPoints.topLeft.x,
		keyPoints.topRight.x,
		keyPoints.bottomLeft.x,
		keyPoints.bottomRight.x,
	),
	right: Math.max(
		keyPoints.topLeft.x,
		keyPoints.topRight.x,
		keyPoints.bottomLeft.x,
		keyPoints.bottomRight.x,
	),
	top: Math.min(
		keyPoints.topLeft.y,
		keyPoints.topRight.y,
		keyPoints.bottomLeft.y,
		keyPoints.bottomRight.y,
	),
	bottom: Math.max(
		keyPoints.topLeft.y,
		keyPoints.topRight.y,
		keyPoints.bottomLeft.y,
		keyPoints.bottomRight.y,
	),
});
