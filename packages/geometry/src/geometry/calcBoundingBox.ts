import { degreesToRadians } from "../common/degreesToRadians";
import type { BoundingBox } from "../types/BoundingBox";
import type { TransformedFrame } from "../types/TransformedFrame";

/**
 * Axis-aligned bounding box of a transformed frame.
 *
 * @param frame - The shape to enclose; `rotation` grows the box, while the
 *   flips cannot change its extents
 */
export const calcBoundingBox = (frame: TransformedFrame): BoundingBox => {
	const { cx, cy } = frame;

	const { width, height, rotation = 0 } = frame;

	const halfWidth = width / 2;
	const halfHeight = height / 2;

	if (rotation !== 0) {
		const radians = degreesToRadians(rotation);
		const cosAngle = Math.cos(radians);
		const sinAngle = Math.sin(radians);
		// Half extents of the rotated corners; the flips only swap which corner
		// lands where, so they drop out.
		const extentX =
			Math.abs(halfWidth * cosAngle) + Math.abs(halfHeight * sinAngle);
		const extentY =
			Math.abs(halfWidth * sinAngle) + Math.abs(halfHeight * cosAngle);

		return {
			top: cy - extentY,
			left: cx - extentX,
			right: cx + extentX,
			bottom: cy + extentY,
		};
	}

	// Unrotated fast path: scale is a flip flag, so it cannot change the extents.
	return {
		top: cy - halfHeight,
		left: cx - halfWidth,
		right: cx + halfWidth,
		bottom: cy + halfHeight,
	};
};
