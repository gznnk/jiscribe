import { degreesToRadians } from "../common/degreesToRadians";
import { calcAffineTransformedPoint } from "../transform/calcAffineTransformedPoint";
import type { EllipseKeyPoints } from "../types/EllipseKeyPoints";
import type { TransformedEllipse } from "../types/TransformedEllipse";

/**
 * Calculates the key points of a transformed ellipse.
 *
 * @param geometry - The transformed ellipse geometry (center, radii, rotation, scale)
 * @returns The coordinates of the ellipse key points
 */
export const calcEllipseKeyPoints = (
	geometry: TransformedEllipse,
): EllipseKeyPoints => {
	const { cx, cy, rx, ry, rotation, scaleX, scaleY } = geometry;

	const radians = degreesToRadians(rotation);

	const topCenter = calcAffineTransformedPoint(
		0,
		-ry,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
	);

	const rightCenter = calcAffineTransformedPoint(
		rx,
		0,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
	);

	const bottomCenter = calcAffineTransformedPoint(
		0,
		ry,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
	);

	const leftCenter = calcAffineTransformedPoint(
		-rx,
		0,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
	);

	const topLeft = calcAffineTransformedPoint(
		-rx,
		-ry,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
	);

	const topRight = calcAffineTransformedPoint(
		rx,
		-ry,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
	);

	const bottomRight = calcAffineTransformedPoint(
		rx,
		ry,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
	);

	const bottomLeft = calcAffineTransformedPoint(
		-rx,
		ry,
		scaleX,
		scaleY,
		radians,
		cx,
		cy,
	);

	return {
		topCenter,
		rightCenter,
		bottomCenter,
		leftCenter,
		topLeft,
		topRight,
		bottomRight,
		bottomLeft,
	};
};
