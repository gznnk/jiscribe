import { degreesToRadians } from "../common/degreesToRadians";
import { applyAffineWithTrig } from "../transform/applyAffineWithTrig";
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
	const cosTheta = Math.cos(radians);
	const sinTheta = Math.sin(radians);

	const topCenter = applyAffineWithTrig(
		0,
		-ry,
		scaleX,
		scaleY,
		cosTheta,
		sinTheta,
		cx,
		cy,
	);

	const rightCenter = applyAffineWithTrig(
		rx,
		0,
		scaleX,
		scaleY,
		cosTheta,
		sinTheta,
		cx,
		cy,
	);

	const bottomCenter = applyAffineWithTrig(
		0,
		ry,
		scaleX,
		scaleY,
		cosTheta,
		sinTheta,
		cx,
		cy,
	);

	const leftCenter = applyAffineWithTrig(
		-rx,
		0,
		scaleX,
		scaleY,
		cosTheta,
		sinTheta,
		cx,
		cy,
	);

	const topLeft = applyAffineWithTrig(
		-rx,
		-ry,
		scaleX,
		scaleY,
		cosTheta,
		sinTheta,
		cx,
		cy,
	);

	const topRight = applyAffineWithTrig(
		rx,
		-ry,
		scaleX,
		scaleY,
		cosTheta,
		sinTheta,
		cx,
		cy,
	);

	const bottomRight = applyAffineWithTrig(
		rx,
		ry,
		scaleX,
		scaleY,
		cosTheta,
		sinTheta,
		cx,
		cy,
	);

	const bottomLeft = applyAffineWithTrig(
		-rx,
		ry,
		scaleX,
		scaleY,
		cosTheta,
		sinTheta,
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
