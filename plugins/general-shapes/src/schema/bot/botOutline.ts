import { OUTLINE_CURVE_SEGMENTS } from "@jiscribe/canvas-sdk/doc";
import type { ObjectDocOutlineCalculator } from "@jiscribe/doc";
import type { Dimensions } from "@jiscribe/geometry";
import { sampleEllipseArc } from "@jiscribe/geometry";

import {
	BOT_ANTENNA_BALL_RADIUS_RATIO,
	BOT_HEAD_CORNER_RATIO,
	BOT_HEAD_TOP_RATIO,
} from "./BotDoc";

/**
 * Bot outline (centered): the head, with the antenna standing on it as a post
 * as wide as the ball, capped by the ball's upper half.
 *
 * Tracing the drawn antenna instead — a thin stick under a wider ball — would
 * not be star-shaped: a ray from the center grazing the stick would cross the
 * ball's underside as well. The post is what the lock does with its shackle
 * (lockOutline), and it is star-shaped about the center, which sits inside the
 * head: a ray leaving it crosses the head's exposed top edge, one side of the
 * post, or the cap — exactly once.
 */
export const botOutline: ObjectDocOutlineCalculator<Dimensions> = ({
	width,
	height,
}) => {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const headTop = -halfHeight + height * BOT_HEAD_TOP_RATIO;
	const cornerRadius = Math.min(width, height) * BOT_HEAD_CORNER_RATIO;
	const ballRadius = Math.min(width, height) * BOT_ANTENNA_BALL_RADIUS_RATIO;
	const ballCenterY = -halfHeight + ballRadius;
	// Half the budget per head corner (four quarter-arcs make one ellipse); the
	// cap is a half-circle and takes the full one.
	const cornerSegments = Math.max(2, Math.round(OUTLINE_CURVE_SEGMENTS / 2));

	return [
		// Head's top-left corner, then right along its top edge to the post.
		...sampleEllipseArc(
			-halfWidth + cornerRadius,
			headTop + cornerRadius,
			cornerRadius,
			cornerRadius,
			180,
			270,
			cornerSegments,
		),
		{ x: -ballRadius, y: headTop },
		// Up the post's left side, over the cap, down its right side.
		{ x: -ballRadius, y: ballCenterY },
		...sampleEllipseArc(
			0,
			ballCenterY,
			ballRadius,
			ballRadius,
			180,
			360,
			OUTLINE_CURVE_SEGMENTS,
		).slice(1, -1),
		{ x: ballRadius, y: ballCenterY },
		{ x: ballRadius, y: headTop },
		// Head's remaining three corners, clockwise back to the start.
		...sampleEllipseArc(
			halfWidth - cornerRadius,
			headTop + cornerRadius,
			cornerRadius,
			cornerRadius,
			270,
			360,
			cornerSegments,
		),
		...sampleEllipseArc(
			halfWidth - cornerRadius,
			halfHeight - cornerRadius,
			cornerRadius,
			cornerRadius,
			0,
			90,
			cornerSegments,
		),
		...sampleEllipseArc(
			-halfWidth + cornerRadius,
			halfHeight - cornerRadius,
			cornerRadius,
			cornerRadius,
			90,
			180,
			cornerSegments,
		),
	];
};
