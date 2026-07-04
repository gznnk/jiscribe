import { degreesToRadians } from "../common/degreesToRadians";
import { calcAffineTransformedPoint } from "../transform/calcAffineTransformedPoint";
import type { Point, TransformedFrame } from "../types";

/**
 * Computes the four corner points of a TransformedFrame in the global
 * coordinate system (rotation and scale applied).
 *
 * @param frame - The frame whose corners are computed
 * @returns The corners in top-left, top-right, bottom-right, bottom-left order
 */
export function calcFrameCornerPoints(frame: TransformedFrame): Point[] {
	const { cx, cy, width, height, rotation = 0, scaleX = 1, scaleY = 1 } = frame;

	const halfWidth = width / 2;
	const halfHeight = height / 2;

	// The four corners in the local coordinate system
	const localCorners: Point[] = [
		{ x: -halfWidth, y: -halfHeight }, // top-left
		{ x: halfWidth, y: -halfHeight }, // top-right
		{ x: halfWidth, y: halfHeight }, // bottom-right
		{ x: -halfWidth, y: halfHeight }, // bottom-left
	];

	// Apply the affine transform to convert to the global coordinate system
	const radians = degreesToRadians(rotation);
	return localCorners.map((corner) =>
		calcAffineTransformedPoint(
			corner.x,
			corner.y,
			scaleX,
			scaleY,
			radians,
			cx,
			cy,
		),
	);
}
