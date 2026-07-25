import { degreesToRadians } from "../common/degreesToRadians";
import { applyAffineWithTrig } from "../transform/applyAffineWithTrig";
import type { Point, TransformedFrame } from "../types";

/**
 * The four corners of a frame in world coordinates (rotation and flips applied).
 *
 * @returns The corners in top-left, top-right, bottom-right, bottom-left order
 */
export function calcFrameCornerPoints(frame: TransformedFrame): Point[] {
	const { cx, cy, width, height, rotation = 0, scaleX = 1, scaleY = 1 } = frame;

	const halfWidth = width / 2;
	const halfHeight = height / 2;

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

	// Compute cos/sin once and reuse across all four corners.
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
