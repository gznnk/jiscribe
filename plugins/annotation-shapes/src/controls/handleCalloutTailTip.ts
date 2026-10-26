import type {
	SelectionControlContext,
	SelectionControlEvent,
	SelectionControlResult,
} from "@jiscribe/canvas";
import {
	calcInverseAffineTransformedPoint,
	degreesToRadians,
} from "@jiscribe/geometry";
import type { OrthogonalDirection } from "@jiscribe/geometry";

import { calcEdgeDirectionAndPosition } from "./calcEdgeDirectionAndPosition";
import type { CalloutTailSide } from "../schema/callout/CalloutDoc";
import type { CalloutState } from "../state/callout/CalloutState";

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

	const { direction, position } = calcEdgeDirectionAndPosition(
		localPoint,
		startCallout.width,
		startCallout.height,
	);
	const side = TAIL_SIDE_BY_DIRECTION[direction];

	return { object: { ...startCallout, tail: { side, position } } };
};
