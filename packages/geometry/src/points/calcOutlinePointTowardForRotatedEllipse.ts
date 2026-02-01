import { calcRotatedPoint } from "./calcRotatedPoint";
import { degreesToRadians } from "../common/degreesToRadians";
import type { Point } from "../types/Point";
import type { TransformedEllipse } from "../types/TransformedEllipse";

/**
 * Return the intersection point on the ellipse outline along the ray
 * from ellipse center toward `toward` (world coord).
 *
 * Returns null if `toward` is inside the ellipse or if degenerate (toward == center).
 */
export function calcOutlinePointTowardForRotatedEllipse(
	ellipse: TransformedEllipse,
	toward: Point,
): Point | null {
	const { cx, cy, rx, ry, rotation } = ellipse;

	if (rx <= 0 || ry <= 0) return null;

	// Convert rotation from degrees to radians
	const rotationRad = degreesToRadians(rotation);

	// world -> local (centered, unrotated)
	// Rotate the target point around the center by -rotation
	const towardLocal = calcRotatedPoint(toward.x, toward.y, cx, cy, -rotationRad);

	const dx = towardLocal.x - cx;
	const dy = towardLocal.y - cy;
	if (dx === 0 && dy === 0) return null;

	// Check if the point is inside the ellipse
	// In local coordinates: (x/rx)^2 + (y/ry)^2 <= 1 means inside
	const normalizedDist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
	if (normalizedDist <= 1) return null;

	const denom = Math.sqrt(normalizedDist);
	if (denom === 0) return null;

	const pLocal: Point = { x: dx / denom, y: dy / denom };

	// local -> world
	// The pLocal is in local coordinates (offset from center)
	// We need to rotate it back and add to center
	const localPoint = { x: cx + pLocal.x, y: cy + pLocal.y };
	return calcRotatedPoint(localPoint.x, localPoint.y, cx, cy, rotationRad);
}
