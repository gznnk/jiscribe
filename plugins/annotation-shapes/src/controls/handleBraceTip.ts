import type {
	SelectionControlContext,
	SelectionControlEvent,
} from "@workspace/canvas";
import {
	calcInverseAffineTransformedPoint,
	degreesToRadians,
	roundToDecimal,
} from "@workspace/geometry";

import type { BraceDirection } from "../schema/brace/BraceDoc";
import type { BraceState } from "../state/brace/BraceState";

/** Decimal places for tipPosition (a 0..1 ratio; 4 ≒ sub-pixel up to ~10k px boxes). */
const TIP_POSITION_PRECISION = 4;

/**
 * Handles the brace tip control (free 2D drag of the tip). The pointer is
 * normalized into the brace model: `direction` from the dominant axis in local
 * coordinates, `tipPosition` from the projection onto that edge.
 *
 * Dragging across axes (a left brace to the top edge) keeps the box as it is, so
 * the depth and span swap roles and the brace comes out squat until the box is
 * resized. That is deliberate: re-proportioning the box on the user's behalf
 * would move the arms away from whatever they were bracketing.
 *
 * Registered via the brace's ObjectTypeDefinition.selectionControls.
 */
export const handleBraceTip = (
	context: SelectionControlContext<BraceState>,
	event: SelectionControlEvent,
): BraceState => {
	const startBrace = context.startObject;
	const { width, height } = startBrace;

	const radians = degreesToRadians(startBrace.rotation);
	const localPoint = calcInverseAffineTransformedPoint(
		event.last.x,
		event.last.y,
		startBrace.scaleX,
		startBrace.scaleY,
		radians,
		startBrace.cx,
		startBrace.cy,
	);

	// Direction from the dominant axis (local coordinates normalized to half extents)
	const normalizedX = width === 0 ? 0 : localPoint.x / (width / 2);
	const normalizedY = height === 0 ? 0 : localPoint.y / (height / 2);
	const direction: BraceDirection =
		Math.abs(normalizedX) >= Math.abs(normalizedY)
			? normalizedX >= 0
				? "right"
				: "left"
			: normalizedY >= 0
				? "down"
				: "up";

	// Position from the projection onto the chosen edge, clamped to [0, 1]
	const rawPosition =
		direction === "up" || direction === "down"
			? width === 0
				? 0.5
				: (localPoint.x + width / 2) / width
			: height === 0
				? 0.5
				: (localPoint.y + height / 2) / height;
	const tipPosition = roundToDecimal(
		Math.min(Math.max(rawPosition, 0), 1),
		TIP_POSITION_PRECISION,
	);

	return { ...startBrace, direction, tipPosition };
};
