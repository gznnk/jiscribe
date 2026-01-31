import { calcRotatedPoint } from "./calcRotatedPoint";
import { degreesToRadians } from "../common/degreesToRadians";
import type { Point } from "../types/Point";
import type { TransformedEllipse } from "../types/TransformedEllipse";

/**
 * Return the intersection point on the ellipse outline along the ray
 * from ellipse center toward `toward` (world coord).
 *
 * If degenerate (toward == center), returns center.
 */
export function calcOutlinePointTowardForRotatedEllipse(
	ellipse: TransformedEllipse,
	toward: Point,
): Point {
	const { cx, cy, rx, ry, rotation } = ellipse;
	const center = { x: cx, y: cy };

	if (rx <= 0 || ry <= 0) return center;

	// Convert rotation from degrees to radians
	const rotationRad = degreesToRadians(rotation);

	// world -> local (centered, unrotated)
	// Rotate the target point around the center by -rotation
	const towardLocal = calcRotatedPoint(toward.x, toward.y, cx, cy, -rotationRad);

	const dx = towardLocal.x - cx;
	const dy = towardLocal.y - cy;
	if (dx === 0 && dy === 0) return center;

	const denom = Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
	if (denom === 0) return center;

	const pLocal: Point = { x: dx / denom, y: dy / denom };

	// local -> world
	// The pLocal is in local coordinates (offset from center)
	// We need to rotate it back and add to center
	const localPoint = { x: cx + pLocal.x, y: cy + pLocal.y };
	return calcRotatedPoint(localPoint.x, localPoint.y, cx, cy, rotationRad);
}
