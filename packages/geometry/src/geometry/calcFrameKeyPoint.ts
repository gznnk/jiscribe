import { degreesToRadians } from "../common/degreesToRadians";
import { calcAffineTransformedPoint } from "../transform/calcAffineTransformedPoint";
import type { KeyPointId } from "../types/KeyPoints";
import type { Point } from "../types/Point";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * A single key point of a frame. Lightweight alternative to
 * {@link calcFrameKeyPoints} for callers that need one point rather than all
 * eight.
 */
export const calcFrameKeyPoint = (
	frame: TransformedFrame,
	keyPointId: KeyPointId,
): Point => {
	const { cx, cy, width, height, rotation, scaleX, scaleY } = frame;

	const halfWidth = width / 2;
	const halfHeight = height / 2;

	// Frame-local coordinates of the requested key point (origin at the center).
	let localX: number;
	let localY: number;
	switch (keyPointId) {
		case "topLeft":
			localX = -halfWidth;
			localY = -halfHeight;
			break;
		case "topCenter":
			localX = 0;
			localY = -halfHeight;
			break;
		case "topRight":
			localX = halfWidth;
			localY = -halfHeight;
			break;
		case "rightCenter":
			localX = halfWidth;
			localY = 0;
			break;
		case "bottomRight":
			localX = halfWidth;
			localY = halfHeight;
			break;
		case "bottomCenter":
			localX = 0;
			localY = halfHeight;
			break;
		case "bottomLeft":
			localX = -halfWidth;
			localY = halfHeight;
			break;
		case "leftCenter":
			localX = -halfWidth;
			localY = 0;
			break;
	}

	// calcAffineTransformedPoint takes its own fast path when rotation is 0.
	const radians = degreesToRadians(rotation);
	return calcAffineTransformedPoint(
		localX,
		localY,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
	);
};
