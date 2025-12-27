import { degreesToRadians } from "../common/degreesToRadians";
import { calcAffineTransformedPoint } from "../transform/calcAffineTransformedPoint";
import type { Ellipse } from "../types/Ellipse";
import type { EllipseVertices } from "../types/EllipseVertices";

/**
 * Calculates the vertices of an ellipse.
 *
 * @param geometry - The ellipse geometry (center, radii, rotation, scale)
 * @returns The coordinates of the ellipse vertices
 */
export const calcEllipseVertices = (
	geometry: Ellipse,
): EllipseVertices => {
	const { cx, cy, rx, ry, rotation, scaleX, scaleY } = geometry;

	const radians = degreesToRadians(rotation);

	const topCenterPoint = calcAffineTransformedPoint(
		0,
		-ry,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
	);

	const rightCenterPoint = calcAffineTransformedPoint(
		rx,
		0,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
	);

	const bottomCenterPoint = calcAffineTransformedPoint(
		0,
		ry,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
	);

	const leftCenterPoint = calcAffineTransformedPoint(
		-rx,
		0,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
	);

	const topLeftPoint = calcAffineTransformedPoint(
		-rx,
		-ry,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
	);

	const topRightPoint = calcAffineTransformedPoint(
		rx,
		-ry,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
	);

	const bottomRightPoint = calcAffineTransformedPoint(
		rx,
		ry,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
	);

	const bottomLeftPoint = calcAffineTransformedPoint(
		-rx,
		ry,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
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
