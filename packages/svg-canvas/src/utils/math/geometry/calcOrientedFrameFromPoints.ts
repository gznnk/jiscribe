import type { Frame } from "../../../types/core/Frame";
import type { Point } from "../../../types/core/Point";
import { degreesToRadians } from "../common/degreesToRadians";
import { nanToZero } from "../common/nanToZero";
import { efficientAffineTransformation } from "../transform/efficientAffineTransformation";
import { efficientInverseAffineTransformation } from "../transform/efficientInverseAffineTransformation";

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
		efficientInverseAffineTransformation(
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

	const originalCenter = efficientAffineTransformation(
		nanToZero((inverseLeft + inverseRight) / 2),
		nanToZero((inverseTop + inverseBottom) / 2),
		scaleX,
		scaleY,
		radians,
		x,
		y,
	);

	return {
		x: originalCenter.x,
		y: originalCenter.y,
		width: inverseRight - inverseLeft,
		height: inverseBottom - inverseTop,
		rotation,
		scaleX,
		scaleY,
	};
};
