import { degreesToRadians } from "../common/degreesToRadians";
import { calcEfficientAffineTransformation } from "../transform/calcEfficientAffineTransformation";
import type { Frame } from "../types/Frame";
import type { RectangleVertices } from "../types/RectangleVertices";

/**
 * Calculates the vertices of a rectangle.
 *
 * @param shape - The shape parameters (position, dimensions, rotation, scale)
 * @returns The coordinates of the rectangle vertices
 */
export const calcRectangleVertices = (frame: Frame): RectangleVertices => {
	const { x, y, width, height, rotation, scaleX, scaleY } = frame;

	const halfWidth = width / 2;
	const halfHeight = height / 2;

	const tx = x;
	const ty = y;

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

	const topLeftPoint = calcEfficientAffineTransformation(
		-halfWidth,
		-halfHeight,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const bottomLeftPoint = calcEfficientAffineTransformation(
		-halfWidth,
		halfHeight,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const topRightPoint = calcEfficientAffineTransformation(
		halfWidth,
		-halfHeight,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const bottomRightPoint = calcEfficientAffineTransformation(
		halfWidth,
		halfHeight,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const topCenterPoint = calcEfficientAffineTransformation(
		0,
		-halfHeight,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const leftCenterPoint = calcEfficientAffineTransformation(
		-halfWidth,
		0,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const rightCenterPoint = calcEfficientAffineTransformation(
		halfWidth,
		0,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const bottomCenterPoint = calcEfficientAffineTransformation(
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


