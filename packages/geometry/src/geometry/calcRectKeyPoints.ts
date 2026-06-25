import { degreesToRadians } from "../common/degreesToRadians";
import { applyAffineWithTrig } from "../transform/applyAffineWithTrig";
import type { RectKeyPoints } from "../types/RectKeyPoints";
import type { TransformedRect } from "../types/TransformedRect";

/**
 * Calculates the key points of a transformed rectangle.
 *
 * @param geometry - The transformed rectangle geometry (top-left, dimensions, rotation, scale)
 * @returns The coordinates of the rectangle key points
 */
export const calcRectKeyPoints = (geometry: TransformedRect): RectKeyPoints => {
	const { x, y, width, height, rotation, scaleX, scaleY } = geometry;

	const halfWidth = width / 2;
	const halfHeight = height / 2;

	// Calculate center point from top-left
	const tx = x + halfWidth;
	const ty = y + halfHeight;

	// No rotation vertices calculation - optimized path when rotation is 0
	if (rotation === 0) {
		return {
			topLeft: { x: tx - scaleX * halfWidth, y: ty - scaleY * halfHeight },
			bottomLeft: {
				x: tx - scaleX * halfWidth,
				y: ty + scaleY * halfHeight,
			},
			topRight: {
				x: tx + scaleX * halfWidth,
				y: ty - scaleY * halfHeight,
			},
			bottomRight: {
				x: tx + scaleX * halfWidth,
				y: ty + scaleY * halfHeight,
			},
			topCenter: { x: tx, y: ty - scaleY * halfHeight },
			leftCenter: { x: tx - scaleX * halfWidth, y: ty },
			rightCenter: { x: tx + scaleX * halfWidth, y: ty },
			bottomCenter: { x: tx, y: ty + scaleY * halfHeight },
		};
	}

	const radians = degreesToRadians(rotation);
	const cosTheta = Math.cos(radians);
	const sinTheta = Math.sin(radians);

	const topLeft = applyAffineWithTrig(
		-halfWidth,
		-halfHeight,
		scaleX,
		scaleY,
		cosTheta,
		sinTheta,
		tx,
		ty,
	);

	const bottomLeft = applyAffineWithTrig(
		-halfWidth,
		halfHeight,
		scaleX,
		scaleY,
		cosTheta,
		sinTheta,
		tx,
		ty,
	);

	const topRight = applyAffineWithTrig(
		halfWidth,
		-halfHeight,
		scaleX,
		scaleY,
		cosTheta,
		sinTheta,
		tx,
		ty,
	);

	const bottomRight = applyAffineWithTrig(
		halfWidth,
		halfHeight,
		scaleX,
		scaleY,
		cosTheta,
		sinTheta,
		tx,
		ty,
	);

	const topCenter = applyAffineWithTrig(
		0,
		-halfHeight,
		scaleX,
		scaleY,
		cosTheta,
		sinTheta,
		tx,
		ty,
	);

	const leftCenter = applyAffineWithTrig(
		-halfWidth,
		0,
		scaleX,
		scaleY,
		cosTheta,
		sinTheta,
		tx,
		ty,
	);

	const rightCenter = applyAffineWithTrig(
		halfWidth,
		0,
		scaleX,
		scaleY,
		cosTheta,
		sinTheta,
		tx,
		ty,
	);

	const bottomCenter = applyAffineWithTrig(
		0,
		halfHeight,
		scaleX,
		scaleY,
		cosTheta,
		sinTheta,
		tx,
		ty,
	);

	return {
		topLeft,
		bottomLeft,
		topRight,
		bottomRight,
		topCenter,
		leftCenter,
		rightCenter,
		bottomCenter,
	};
};
