import {
	calcLocalOffsetForRotation,
	calcWorldPointFromLocalOffset,
} from "./calcLocalOffsetForRotation";
import type { Point } from "../types/Point";
import type { TransformedEllipse } from "../types/TransformedEllipse";

/**
 * Intersection point on the ellipse outline along the ray from the ellipse
 * center toward `toward` (world coordinates).
 *
 * Scale is ignored: it is a `FlipScale`, and an ellipse outline is
 * invariant under axis flips.
 *
 * Returns null if `toward` is inside the ellipse, or is the center itself.
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

	// In local coordinates (x/rx)^2 + (y/ry)^2 <= 1 means inside.
	const normalizedDist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
	if (normalizedDist <= 1) {
		return null;
	}

	const denom = Math.sqrt(normalizedDist);
	if (denom === 0) {
		return null;
	}

	// Scale the offset onto the outline, then rotate the hit point back to world.
	return calcWorldPointFromLocalOffset(cx, cy, dx / denom, dy / denom, offset);
}
