import { degreesToRadians } from "../common/degreesToRadians";
import { calcAffineTransformedPoint } from "../transform/calcAffineTransformedPoint";
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

	const topLeft = calcAffineTransformedPoint(
		-halfWidth,
		-halfHeight,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const bottomLeft = calcAffineTransformedPoint(
		-halfWidth,
		halfHeight,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const topRight = calcAffineTransformedPoint(
		halfWidth,
		-halfHeight,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const bottomRight = calcAffineTransformedPoint(
		halfWidth,
		halfHeight,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const topCenter = calcAffineTransformedPoint(
		0,
		-halfHeight,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const leftCenter = calcAffineTransformedPoint(
		-halfWidth,
		0,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const rightCenter = calcAffineTransformedPoint(
		halfWidth,
		0,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const bottomCenter = calcAffineTransformedPoint(
		0,
		halfHeight,
		scaleX,
		scaleY,
		radians,
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
