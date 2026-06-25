import { degreesToRadians } from "../common/degreesToRadians";
import { applyAffineWithTrig } from "../transform/applyAffineWithTrig";
import type { FrameKeyPoints } from "../types/FrameKeyPoints";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Calculates the key points (vertices and edge centers) of a frame.
 *
 * @param frame - The transformed frame geometry (center position, dimensions, rotation, scale)
 * @returns The coordinates of the frame's key points
 */
export const calcFrameKeyPoints = (frame: TransformedFrame): FrameKeyPoints => {
	const { cx, cy, width, height, rotation, scaleX, scaleY } = frame;

	const halfWidth = width / 2;
	const halfHeight = height / 2;

	// No rotation - optimized path when rotation is 0
	if (rotation === 0) {
		const scaledHalfWidth = scaleX * halfWidth;
		const scaledHalfHeight = scaleY * halfHeight;

		return {
			topLeft: { x: cx - scaledHalfWidth, y: cy - scaledHalfHeight },
			topCenter: { x: cx, y: cy - scaledHalfHeight },
			topRight: { x: cx + scaledHalfWidth, y: cy - scaledHalfHeight },
			rightCenter: { x: cx + scaledHalfWidth, y: cy },
			bottomRight: { x: cx + scaledHalfWidth, y: cy + scaledHalfHeight },
			bottomCenter: { x: cx, y: cy + scaledHalfHeight },
			bottomLeft: { x: cx - scaledHalfWidth, y: cy + scaledHalfHeight },
			leftCenter: { x: cx - scaledHalfWidth, y: cy },
		};
	}

	// With rotation - compute cos/sin once and reuse across all 8 key points
	const radians = degreesToRadians(rotation);
	const cosTheta = Math.cos(radians);
	const sinTheta = Math.sin(radians);

	return {
		topLeft: applyAffineWithTrig(
			-halfWidth,
			-halfHeight,
			scaleX,
			scaleY,
			cosTheta,
			sinTheta,
			cx,
			cy,
		),
		topCenter: applyAffineWithTrig(
			0,
			-halfHeight,
			scaleX,
			scaleY,
			cosTheta,
			sinTheta,
			cx,
			cy,
		),
		topRight: applyAffineWithTrig(
			halfWidth,
			-halfHeight,
			scaleX,
			scaleY,
			cosTheta,
			sinTheta,
			cx,
			cy,
		),
		rightCenter: applyAffineWithTrig(
			halfWidth,
			0,
			scaleX,
			scaleY,
			cosTheta,
			sinTheta,
			cx,
			cy,
		),
		bottomRight: applyAffineWithTrig(
			halfWidth,
			halfHeight,
			scaleX,
			scaleY,
			cosTheta,
			sinTheta,
			cx,
			cy,
		),
		bottomCenter: applyAffineWithTrig(
			0,
			halfHeight,
			scaleX,
			scaleY,
			cosTheta,
			sinTheta,
			cx,
			cy,
		),
		bottomLeft: applyAffineWithTrig(
			-halfWidth,
			halfHeight,
			scaleX,
			scaleY,
			cosTheta,
			sinTheta,
			cx,
			cy,
		),
		leftCenter: applyAffineWithTrig(
			-halfWidth,
			0,
			scaleX,
			scaleY,
			cosTheta,
			sinTheta,
			cx,
			cy,
		),
	};
};
