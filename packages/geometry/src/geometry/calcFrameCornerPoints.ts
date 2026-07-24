import { degreesToRadians } from "../common/degreesToRadians";
import { applyAffineWithTrig } from "../transform/applyAffineWithTrig";
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

	// No rotation - optimized path when rotation is 0
	if (rotation === 0) {
		const scaledHalfWidth = scaleX * halfWidth;
		const scaledHalfHeight = scaleY * halfHeight;

		return [
			{ x: cx - scaledHalfWidth, y: cy - scaledHalfHeight }, // top-left
			{ x: cx + scaledHalfWidth, y: cy - scaledHalfHeight }, // top-right
			{ x: cx + scaledHalfWidth, y: cy + scaledHalfHeight }, // bottom-right
			{ x: cx - scaledHalfWidth, y: cy + scaledHalfHeight }, // bottom-left
		];
	}

	// With rotation - compute cos/sin once and reuse across all four corners
	const radians = degreesToRadians(rotation);
	const cosAngle = Math.cos(radians);
	const sinAngle = Math.sin(radians);

	return [
		applyAffineWithTrig(
			-halfWidth,
			-halfHeight,
			scaleX,
			scaleY,
			cosAngle,
			sinAngle,
			cx,
			cy,
		), // top-left
		applyAffineWithTrig(
			halfWidth,
			-halfHeight,
			scaleX,
			scaleY,
			cosAngle,
			sinAngle,
			cx,
			cy,
		), // top-right
		applyAffineWithTrig(
			halfWidth,
			halfHeight,
			scaleX,
			scaleY,
			cosAngle,
			sinAngle,
			cx,
			cy,
		), // bottom-right
		applyAffineWithTrig(
			-halfWidth,
			halfHeight,
			scaleX,
			scaleY,
			cosAngle,
			sinAngle,
			cx,
			cy,
		), // bottom-left
	];
}
