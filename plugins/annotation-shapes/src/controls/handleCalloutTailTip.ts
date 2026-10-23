import type {
	SelectionControlContext,
	SelectionControlEvent,
	SelectionControlResult,
} from "@jiscribe/canvas";
import {
	calcInverseAffineTransformedPoint,
	degreesToRadians,
	roundToDecimal,
	snapToDirection,
} from "@jiscribe/geometry";
import type { OrthogonalDirection } from "@jiscribe/geometry";

import { calcEdgeRatio } from "./calcEdgeRatio";
import type { CalloutTailSide } from "../schema/callout/CalloutDoc";
import type { CalloutState } from "../state/callout/CalloutState";

/** Decimal places for tail.position (a 0..1 ratio; 4 ≒ sub-pixel up to ~10k px boxes). */
const TAIL_POSITION_PRECISION = 4;

/** The tail side each snapped direction names. */
const TAIL_SIDE_BY_DIRECTION: Record<OrthogonalDirection, CalloutTailSide> = {
	up: "top",
	down: "bottom",
	left: "left",
	right: "right",
};

/**
 * Handles the callout tail-tip control (free 2D drag of the tail tip).
 * The pointer is normalized into the tail model: `side` from the dominant
 * axis in local coordinates, `position` from the projection onto that edge.
 *
 * Registered via the callout's ObjectTypeDefinition.selectionControls.
 */
export const handleCalloutTailTip = (
	context: SelectionControlContext<CalloutState>,
	event: SelectionControlEvent,
): SelectionControlResult<CalloutState> => {
	const startCallout = context.startObject;
	const { width, height } = startCallout;

	const radians = degreesToRadians(startCallout.rotation);
	const localPoint = calcInverseAffineTransformedPoint(
		event.last.x,
		event.last.y,
		startCallout.scaleX,
		startCallout.scaleY,
		radians,
		startCallout.cx,
		startCallout.cy,
	);

	// Side from the dominant axis (local coordinates normalized to half extents)
	const normalizedX = width === 0 ? 0 : localPoint.x / (width / 2);
	const normalizedY = height === 0 ? 0 : localPoint.y / (height / 2);
	const side =
		TAIL_SIDE_BY_DIRECTION[snapToDirection(normalizedX, normalizedY)];

	// Position from the projection onto the chosen edge, clamped to [0, 1]
	const rawPosition =
		side === "top" || side === "bottom"
			? calcEdgeRatio(localPoint.x, width)
			: calcEdgeRatio(localPoint.y, height);
	const position = roundToDecimal(
		Math.min(Math.max(rawPosition, 0), 1),
		TAIL_POSITION_PRECISION,
	);

	return { object: { ...startCallout, tail: { side, position } } };
};
