import {
	calcLocalOffsetForRotation,
	calcWorldPointFromLocalOffset,
} from "./calcLocalOffsetForRotation";
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

	if (rx <= 0 || ry <= 0) {
		return null;
	}

	const offset = calcLocalOffsetForRotation(cx, cy, rotation, toward);
	const { dx, dy } = offset;
	if (dx === 0 && dy === 0) {
		return null;
	}

	// Check if the point is inside the ellipse
	// In local coordinates: (x/rx)^2 + (y/ry)^2 <= 1 means inside
	const normalizedDist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
	if (normalizedDist <= 1) {
		return null;
	}

	const denom = Math.sqrt(normalizedDist);
	if (denom === 0) {
		return null;
	}

	// local -> world: scale the offset onto the outline (÷denom), then rotate
	// the local hit point back around center by +rotation.
	return calcWorldPointFromLocalOffset(cx, cy, dx / denom, dy / denom, offset);
}
