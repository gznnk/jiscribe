import type {
	SelectionControlContext,
	SelectionControlEvent,
} from "@jiscribe/canvas";
import {
	calcInverseAffineTransformedPoint,
	degreesToRadians,
} from "@jiscribe/geometry";

import { calcEdgeDirectionAndPosition } from "./calcEdgeDirectionAndPosition";
import type { GroupMarkerDirection } from "../schema/shared/GroupMarkerFields";
import type { GroupMarkerControlState } from "../state/shared/GroupMarkerControlState";

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

	const { direction, position } = calcEdgeDirectionAndPosition(
		localPoint,
		startMarker.width,
		startMarker.height,
	);

	return { direction, tipPosition: position };
};
