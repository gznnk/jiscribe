import type {
	SelectionControlContext,
	SelectionControlEvent,
} from "@workspace/canvas";
import {
	calcInverseAffineTransformedPoint,
	degreesToRadians,
	roundToDecimal,
} from "@workspace/geometry";

import type { GroupMarkerDirection } from "../schema/shared/GroupMarkerFields";
import type { GroupMarkerControlState } from "../state/shared/GroupMarkerControlState";

/** Decimal places for tipPosition (a 0..1 ratio; 4 ≒ sub-pixel up to ~10k px boxes). */
const TIP_POSITION_PRECISION = 4;

/**
 * Normalizes a tip drag into the group marker model: `direction` from the
 * dominant axis in local coordinates, `tipPosition` from the projection onto
 * that edge. A marker whose tip does not move takes the direction and drops the
 * position (handleGroupMarkerDirection).
 *
 * The box is left as it is when the drag crosses axes (a left marker dragged to
 * the top edge), so depth and span swap roles and the marker comes out squat
 * until the box is resized. That is deliberate: re-proportioning the box on the
 * user's behalf would move the arms away from whatever they were bracketing.
 *
 * @param context The control's object, read at gesture start (the live one is not used).
 * @param event The drag; only `last` (the pointer in SVG coordinates) is read.
 * @returns The direction the pointer chose, and its position along that edge clamped to 0..1.
 */
export const resolveGroupMarkerTipDrag = (
	context: SelectionControlContext<GroupMarkerControlState>,
	event: SelectionControlEvent,
): { direction: GroupMarkerDirection; tipPosition: number } => {
	const startMarker = context.startObject;
	const { width, height } = startMarker;

	const radians = degreesToRadians(startMarker.rotation);
	const localPoint = calcInverseAffineTransformedPoint(
		event.last.x,
		event.last.y,
		startMarker.scaleX,
		startMarker.scaleY,
		radians,
		startMarker.cx,
		startMarker.cy,
	);

	// Direction from the dominant axis (local coordinates normalized to half extents)
	const normalizedX = width === 0 ? 0 : localPoint.x / (width / 2);
	const normalizedY = height === 0 ? 0 : localPoint.y / (height / 2);
	const direction: GroupMarkerDirection =
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

	return { direction, tipPosition };
};
