import { degreesToRadians } from "../common/degreesToRadians";
import { calcAffineTransformedPoint } from "../transform/calcAffineTransformedPoint";
import type { BoundingBox } from "../types/BoundingBox";
import type { Frame } from "../types/Frame";

// TODO: この関数は calcRectangleBoundingBoxGeometry と似ているので、統合を検討すること
/**
 * Calculates the bounding box of a Frame.
 * Returns the box coordinates representing the frame's outer bounds.
 * Note: cx and cy represent the center coordinates of the frame.
 *
 * @param frame - The frame to calculate bounding box for
 * @returns The bounding box with top, left, right, bottom coordinates
 */
export const calcBoundingBox = (frame: Frame): BoundingBox => {
	const { cx: x, cy: y } = frame;

	const { width, height, rotation = 0, scaleX = 1, scaleY = 1 } = frame;

	const halfWidth = width / 2;
	const halfHeight = height / 2;

	// For elements with rotation, calculate all four corners and find bounding box
	if (rotation !== 0) {
		const radians = degreesToRadians(rotation);

		// Calculate all four corners
		const topLeft = calcAffineTransformedPoint(
			-halfWidth,
			-halfHeight,
			scaleX,
			scaleY,
			radians,
			x,
			y,
		);

		const bottomLeft = calcAffineTransformedPoint(
			-halfWidth,
			halfHeight,
			scaleX,
			scaleY,
			radians,
			x,
			y,
		);

		const topRight = calcAffineTransformedPoint(
			halfWidth,
			-halfHeight,
			scaleX,
			scaleY,
			radians,
			x,
			y,
		);

		const bottomRight = calcAffineTransformedPoint(
			halfWidth,
			halfHeight,
			scaleX,
			scaleY,
			radians,
			x,
			y,
		);

		// Find min/max values
		const left = Math.min(topLeft.x, bottomLeft.x, topRight.x, bottomRight.x);
		const right = Math.max(topLeft.x, bottomLeft.x, topRight.x, bottomRight.x);
		const top = Math.min(topLeft.y, bottomLeft.y, topRight.y, bottomRight.y);
		const bottom = Math.max(topLeft.y, bottomLeft.y, topRight.y, bottomRight.y);

		return { top, left, right, bottom };
	}

	// Optimized path for non-rotated elements
	// Calculate scaled dimensions
	const scaledHalfWidth = halfWidth * scaleX;
	const scaledHalfHeight = halfHeight * scaleY;

	return {
		top: y - scaledHalfHeight,
		left: x - scaledHalfWidth,
		right: x + scaledHalfWidth,
		bottom: y + scaledHalfHeight,
	};
};
