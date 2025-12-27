import { degreesToRadians } from "../common/degreesToRadians";
import { calcAffineTransformedPoint } from "../transform/calcAffineTransformedPoint";
import type { Rect } from "../types/Rect";
import type { RectangleVertices } from "../types/RectangleVertices";

// TODO: 要精査・廃止？
/**
 * Calculates the vertices of a rectangle.
 *
 * @param geometry - The rectangle geometry (top-left, dimensions, rotation, scale)
 * @returns The coordinates of the rectangle vertices
 */
export const calcRectangleVertices = (geometry: Rect): RectangleVertices => {
	const { x, y, width, height, rotation, scaleX, scaleY } = geometry;

	const halfWidth = width / 2;
	const halfHeight = height / 2;

	// Calculate center point from top-left
	const tx = x + halfWidth;
	const ty = y + halfHeight;

	// No rotation vertices calculation - optimized path when rotation is 0
	if (rotation === 0) {
		return {
			topLeftPoint: { x: tx - scaleX * halfWidth, y: ty - scaleY * halfHeight },
			bottomLeftPoint: {
				x: tx - scaleX * halfWidth,
				y: ty + scaleY * halfHeight,
			},
			topRightPoint: {
				x: tx + scaleX * halfWidth,
				y: ty - scaleY * halfHeight,
			},
			bottomRightPoint: {
				x: tx + scaleX * halfWidth,
				y: ty + scaleY * halfHeight,
			},
			topCenterPoint: { x: tx, y: ty - scaleY * halfHeight },
			leftCenterPoint: { x: tx - scaleX * halfWidth, y: ty },
			rightCenterPoint: { x: tx + scaleX * halfWidth, y: ty },
			bottomCenterPoint: { x: tx, y: ty + scaleY * halfHeight },
		};
	}

	const radians = degreesToRadians(rotation);

	const topLeftPoint = calcAffineTransformedPoint(
		-halfWidth,
		-halfHeight,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const bottomLeftPoint = calcAffineTransformedPoint(
		-halfWidth,
		halfHeight,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const topRightPoint = calcAffineTransformedPoint(
		halfWidth,
		-halfHeight,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const bottomRightPoint = calcAffineTransformedPoint(
		halfWidth,
		halfHeight,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const topCenterPoint = calcAffineTransformedPoint(
		0,
		-halfHeight,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const leftCenterPoint = calcAffineTransformedPoint(
		-halfWidth,
		0,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const rightCenterPoint = calcAffineTransformedPoint(
		halfWidth,
		0,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const bottomCenterPoint = calcAffineTransformedPoint(
		0,
		halfHeight,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	return {
		topLeftPoint,
		bottomLeftPoint,
		topRightPoint,
		bottomRightPoint,
		topCenterPoint,
		leftCenterPoint,
		rightCenterPoint,
		bottomCenterPoint,
	};
};
