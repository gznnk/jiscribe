import { calcPolyBoundingBox } from "./calcPolyBoundingBox";
import { degreesToRadians } from "../common/degreesToRadians";
import { nanToZero } from "../common/nanToZero";
import { applyAffineWithTrig } from "../transform/applyAffineWithTrig";
import type { FlipScale } from "../types/FlipScale";
import type { Point } from "../types/Point";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Smallest frame with the given transform that encloses `points`.
 *
 * The points are inverse-transformed around the center of their axis-aligned
 * bounding box; the bounding box of the result gives width/height, and its
 * center is transformed forward again to give the final center.
 *
 * @param points - World-space points the frame must enclose
 * @param scaleX - Horizontal flip the resulting frame carries
 * @param scaleY - Vertical flip the resulting frame carries
 * @param rotationDeg - Rotation in degrees the resulting frame carries; the
 *   frame is fitted in that rotated space, not axis-aligned
 * @returns The enclosing frame, or null if `points` is empty
 */
export const calcOrientedFrameFromPoints = (
	points: Point[],
	scaleX: FlipScale = 1,
	scaleY: FlipScale = 1,
	rotationDeg = 0,
): TransformedFrame | null => {
	if (points.length === 0) {
		return null;
	}

	// points is non-empty, so calcPolyBoundingBox never returns null here.
	const { left, top, right, bottom } = calcPolyBoundingBox(points)!;

	const x = nanToZero((left + right) / 2);
	const y = nanToZero((top + bottom) / 2);

	const radians = degreesToRadians(rotationDeg);
	const cosAngle = Math.cos(radians);
	const sinAngle = Math.sin(radians);

	// Bounding box of the inverse-transformed points in a single pass, with no
	// intermediate array or Point. Matches applyInverseAffineWithTrig, inlined
	// because this is a hot path.
	let inverseLeft = Infinity;
	let inverseTop = Infinity;
	let inverseRight = -Infinity;
	let inverseBottom = -Infinity;
	for (const p of points) {
		const translatedX = p.x - x;
		const translatedY = p.y - y;
		const ix = (cosAngle * translatedX + sinAngle * translatedY) / scaleX;
		const iy = (-sinAngle * translatedX + cosAngle * translatedY) / scaleY;
		if (ix < inverseLeft) {
			inverseLeft = ix;
		}
		if (ix > inverseRight) {
			inverseRight = ix;
		}
		if (iy < inverseTop) {
			inverseTop = iy;
		}
		if (iy > inverseBottom) {
			inverseBottom = iy;
		}
	}

	const width = inverseRight - inverseLeft;
	const height = inverseBottom - inverseTop;

	const inverseCenterX = (inverseLeft + inverseRight) / 2;
	const inverseCenterY = (inverseTop + inverseBottom) / 2;

	const centerPoint = applyAffineWithTrig(
		inverseCenterX,
		inverseCenterY,
		scaleX,
		scaleY,
		cosAngle,
		sinAngle,
		x,
		y,
	);

	return {
		cx: centerPoint.x,
		cy: centerPoint.y,
		width,
		height,
		rotation: rotationDeg,
		scaleX,
		scaleY,
	};
};
