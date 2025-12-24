import { degreesToRadians } from "../common/degreesToRadians";
import { nanToZero } from "../common/nanToZero";
import { calcAffineTransformedPoint } from "../transform/calcAffineTransformedPoint";
import { calcInverseAffineTransformedPoint } from "../transform/calcInverseAffineTransformedPoint";
import type { Frame } from "../types/Frame";
import type { Point } from "../types/Point";

/**
 * Calculates an oriented bounding box for a series of points.
 * This is useful for computing the bounding frame that encompasses all points
 * while maintaining rotation and scale properties.
 *
 * This function derives a Frame object (including rotation and scale)
 * that represents the minimum bounding box containing all given points.
 * It's particularly useful for path-based shapes where you need to determine
 * the overall frame properties from the constituent points.
 *
 * @param points - Array of points to calculate the bounding box for
 * @returns A Frame object representing the oriented bounding box of the path
 */
export const calcOrientedFrameFromPoints = (
	points: Point[],
	scaleX = 1,
	scaleY = 1,
	rotation = 0,
): Frame => {
	const left = Math.min(...points.map((p) => p.x));
	const top = Math.min(...points.map((p) => p.y));
	const right = Math.max(...points.map((p) => p.x));
	const bottom = Math.max(...points.map((p) => p.y));

	const x = nanToZero((left + right) / 2);
	const y = nanToZero((top + bottom) / 2);

	const radians = degreesToRadians(rotation);

	const inversePoints = points.map((p) =>
		calcInverseAffineTransformedPoint(
			p.x,
			p.y,
			scaleX,
			scaleY,
			radians,
			x,
			y,
		),
	);

	const inverseLeft = Math.min(...inversePoints.map((p) => p.x));
	const inverseTop = Math.min(...inversePoints.map((p) => p.y));
	const inverseRight = Math.max(...inversePoints.map((p) => p.x));
	const inverseBottom = Math.max(...inversePoints.map((p) => p.y));

	const width = inverseRight - inverseLeft;
	const height = inverseBottom - inverseTop;

	const inverseCenterX = (inverseLeft + inverseRight) / 2;
	const inverseCenterY = (inverseTop + inverseBottom) / 2;

	const centerPoint = calcAffineTransformedPoint(
		inverseCenterX,
		inverseCenterY,
		scaleX,
		scaleY,
		radians,
		x,
		y,
	);

	return {
		x: centerPoint.x,
		y: centerPoint.y,
		width,
		height,
		rotation,
		scaleX,
		scaleY,
	};
};


