import { degreesToRadians } from "../common/degreesToRadians";
import { applyAffineWithTrig } from "../transform/applyAffineWithTrig";
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

	const { width, height, rotation = 0, scaleX = 1, scaleY = 1 } = frame;

	const halfWidth = width / 2;
	const halfHeight = height / 2;

	if (rotation !== 0) {
		// Compute cos/sin once and reuse across all four corners.
		const radians = degreesToRadians(rotation);
		const cosAngle = Math.cos(radians);
		const sinAngle = Math.sin(radians);

		const topLeft = applyAffineWithTrig(
			-halfWidth,
			-halfHeight,
			scaleX,
			scaleY,
			cosAngle,
			sinAngle,
			cx,
			cy,
		);

		const bottomLeft = applyAffineWithTrig(
			-halfWidth,
			halfHeight,
			scaleX,
			scaleY,
			cosAngle,
			sinAngle,
			cx,
			cy,
		);

		const topRight = applyAffineWithTrig(
			halfWidth,
			-halfHeight,
			scaleX,
			scaleY,
			cosAngle,
			sinAngle,
			cx,
			cy,
		);

		const bottomRight = applyAffineWithTrig(
			halfWidth,
			halfHeight,
			scaleX,
			scaleY,
			cosAngle,
			sinAngle,
			cx,
			cy,
		);

		const left = Math.min(topLeft.x, bottomLeft.x, topRight.x, bottomRight.x);
		const right = Math.max(topLeft.x, bottomLeft.x, topRight.x, bottomRight.x);
		const top = Math.min(topLeft.y, bottomLeft.y, topRight.y, bottomRight.y);
		const bottom = Math.max(topLeft.y, bottomLeft.y, topRight.y, bottomRight.y);

		return { top, left, right, bottom };
	}

	// Unrotated fast path: scale is a flip flag, so it cannot change the extents.
	return {
		top: cy - halfHeight,
		left: cx - halfWidth,
		right: cx + halfWidth,
		bottom: cy + halfHeight,
	};
};
