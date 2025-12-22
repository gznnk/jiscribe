import type { EllipseVertices } from "../../../types/core/EllipseVertices";
import type { Frame } from "../../../types/core/Frame";
import { degreesToRadians } from "../common/degreesToRadians";
import { efficientAffineTransformation } from "../transform/efficientAffineTransformation";

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

	const topCenterPoint = efficientAffineTransformation(
		0,
		-halfHeight,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const rightCenterPoint = efficientAffineTransformation(
		halfWidth,
		0,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const bottomCenterPoint = efficientAffineTransformation(
		0,
		halfHeight,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const leftCenterPoint = efficientAffineTransformation(
		-halfWidth,
		0,
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);
	const topRightPoint = efficientAffineTransformation(
		halfWidth / Math.sqrt(2),
		-halfHeight / Math.sqrt(2),
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const bottomRightPoint = efficientAffineTransformation(
		halfWidth / Math.sqrt(2),
		halfHeight / Math.sqrt(2),
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const bottomLeftPoint = efficientAffineTransformation(
		-halfWidth / Math.sqrt(2),
		halfHeight / Math.sqrt(2),
		scaleX,
		scaleY,
		radians,
		tx,
		ty,
	);

	const topLeftPoint = efficientAffineTransformation(
		-halfWidth / Math.sqrt(2),
		-halfHeight / Math.sqrt(2),
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
