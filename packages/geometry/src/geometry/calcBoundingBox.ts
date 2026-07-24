import { degreesToRadians } from "../common/degreesToRadians";
import { applyAffineWithTrig } from "../transform/applyAffineWithTrig";
import type { BoundingBox } from "../types/BoundingBox";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Calculates the bounding box of a TransformedFrame.
 * Returns the box coordinates representing the frame's outer bounds.
 * Note: cx and cy represent the center coordinates of the frame.
 *
 * @param frame - The transformed frame to calculate bounding box for
 * @returns The bounding box with top, left, right, bottom coordinates
 */
export const calcBoundingBox = (frame: TransformedFrame): BoundingBox => {
	const { cx, cy } = frame;

	const { width, height, rotation = 0, scaleX = 1, scaleY = 1 } = frame;

	const halfWidth = width / 2;
	const halfHeight = height / 2;

	// For elements with rotation, calculate all four corners and find bounding box
	if (rotation !== 0) {
		const radians = degreesToRadians(rotation);
		const cosAngle = Math.cos(radians);
		const sinAngle = Math.sin(radians);

		// Calculate all four corners
		const topLeft = applyAffineWithTrig(
			-halfWidth,
			-halfHeight,
			scaleX,
			scaleY,
			cosAngle,
			sinAngle,
			cx,
			cy,
		);

		const bottomLeft = applyAffineWithTrig(
			-halfWidth,
			halfHeight,
			scaleX,
			scaleY,
			cosAngle,
			sinAngle,
			cx,
			cy,
		);

		const topRight = applyAffineWithTrig(
			halfWidth,
			-halfHeight,
			scaleX,
			scaleY,
			cosAngle,
			sinAngle,
			cx,
			cy,
		);

		const bottomRight = applyAffineWithTrig(
			halfWidth,
			halfHeight,
			scaleX,
			scaleY,
			cosAngle,
			sinAngle,
			cx,
			cy,
		);

		// Find min/max values
		const left = Math.min(topLeft.x, bottomLeft.x, topRight.x, bottomRight.x);
		const right = Math.max(topLeft.x, bottomLeft.x, topRight.x, bottomRight.x);
		const top = Math.min(topLeft.y, bottomLeft.y, topRight.y, bottomRight.y);
		const bottom = Math.max(topLeft.y, bottomLeft.y, topRight.y, bottomRight.y);

		return { top, left, right, bottom };
	}

	// Optimized path for non-rotated elements
	// Note: scaleX and scaleY are 1 or -1 (flip only), so dimensions don't change
	return {
		top: cy - halfHeight,
		left: cx - halfWidth,
		right: cx + halfWidth,
		bottom: cy + halfHeight,
	};
};
