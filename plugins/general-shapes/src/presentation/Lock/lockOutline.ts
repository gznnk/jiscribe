import type { ObjectOutlineCalculator } from "@jiscribe/canvas";
import { OUTLINE_CURVE_SEGMENTS } from "@jiscribe/canvas-sdk";
import type { Dimensions } from "@jiscribe/geometry";
import { sampleEllipseArc } from "@jiscribe/geometry";

import {
	LOCK_BODY_CORNER_RATIO,
	LOCK_BODY_TOP_RATIO,
	LOCK_BODY_X_RATIO,
	LOCK_SHACKLE_ARCH_RATIO,
	LOCK_SHACKLE_HALF_WIDTH_RATIO,
	LOCK_SHACKLE_SHOULDER_RATIO,
} from "../../schema/lock/LockDoc";

/**
 * Lock outline (centered): the padlock's visible envelope — the body block, with
 * the shackle's arch standing on it.
 *
 * The shackle is an open arc and encloses nothing, so the shape has no closed
 * silhouette to copy; this traces what a reader sees as the edge instead. Taking
 * the body alone would stop a connector coming from above inside the drawn
 * shackle, and the bounding box would leave it hanging over two empty top
 * corners.
 *
 * The result is still star-shaped about the center, which sits inside the body
 * block: a ray leaving it crosses either the body's exposed top edge, one
 * shackle leg, or the arch — exactly once, in that order as the ray tips upward.
 */
export const lockOutline: ObjectOutlineCalculator<Dimensions> = ({
	width,
	height,
}) => {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const bodyLeft = -halfWidth + width * LOCK_BODY_X_RATIO;
	const bodyRight = halfWidth - width * LOCK_BODY_X_RATIO;
	const bodyTop = -halfHeight + height * LOCK_BODY_TOP_RATIO;
	const bodyBottom = halfHeight;
	const cornerRadius = Math.min(width, height) * LOCK_BODY_CORNER_RATIO;
	const shackleHalfWidth = width * LOCK_SHACKLE_HALF_WIDTH_RATIO;
	const shoulderY = -halfHeight + height * LOCK_SHACKLE_SHOULDER_RATIO;
	// Half the budget per body corner (four quarter-arcs make one ellipse); the
	// arch is a half-ellipse and takes the full one.
	const cornerSegments = Math.max(2, Math.round(OUTLINE_CURVE_SEGMENTS / 2));

	return [
		// Body's top-left corner, then right along its top edge to the left leg.
		...sampleEllipseArc(
			bodyLeft + cornerRadius,
			bodyTop + cornerRadius,
			cornerRadius,
			cornerRadius,
			180,
			270,
			cornerSegments,
		),
		{ x: -shackleHalfWidth, y: bodyTop },
		// Up the left leg, over the arch, down the right leg.
		{ x: -shackleHalfWidth, y: shoulderY },
		...sampleEllipseArc(
			0,
			shoulderY,
			shackleHalfWidth,
			height * LOCK_SHACKLE_ARCH_RATIO,
			180,
			360,
			OUTLINE_CURVE_SEGMENTS,
		).slice(1, -1),
		{ x: shackleHalfWidth, y: shoulderY },
		{ x: shackleHalfWidth, y: bodyTop },
		// Body's remaining three corners, clockwise back to the start.
		...sampleEllipseArc(
			bodyRight - cornerRadius,
			bodyTop + cornerRadius,
			cornerRadius,
			cornerRadius,
			270,
			360,
			cornerSegments,
		),
		...sampleEllipseArc(
			bodyRight - cornerRadius,
			bodyBottom - cornerRadius,
			cornerRadius,
			cornerRadius,
			0,
			90,
			cornerSegments,
		),
		...sampleEllipseArc(
			bodyLeft + cornerRadius,
			bodyBottom - cornerRadius,
			cornerRadius,
			cornerRadius,
			90,
			180,
			cornerSegments,
		),
	];
};
