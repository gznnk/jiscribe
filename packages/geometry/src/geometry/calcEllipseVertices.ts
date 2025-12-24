import { degreesToRadians } from "../common/degreesToRadians";
import { calcEfficientAffineTransformation } from "../transform/calcEfficientAffineTransformation";
import type { EllipseVertices } from "../types/EllipseVertices";
import type { Frame } from "../types/Frame";

/**
 * Calculates the vertices of an ellipse.
 *
 * @param shape - The shape parameters (position, dimensions, rotation, scale)
 * @returns The coordinates of the ellipse vertices
 */
export const calcEllipseVertices = (frame: Frame): EllipseVertices => {
	const { x, y, width, height, rotation, scaleX, scaleY } = frame;

	const halfWidth = width / 2;
	const halfHeight = height / 2;

	const tx = x;
	const ty = y;

	const radians = degreesToRadians(rotation);

	const topCenterPoint = calcEfficientAffineTransformation(
		0,
		-halfHeight,
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

	const leftCenterPoint = calcEfficientAffineTransformation(
		-halfWidth,
		0,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const topLeftPoint = calcEfficientAffineTransformation(
		-halfWidth,
		-halfHeight,
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

	const bottomLeftPoint = calcEfficientAffineTransformation(
		-halfWidth,
		halfHeight,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	return {
		topCenterPoint,
		rightCenterPoint,
		bottomCenterPoint,
		leftCenterPoint,
		topLeftPoint,
		topRightPoint,
		bottomRightPoint,
		bottomLeftPoint,
	};
};


