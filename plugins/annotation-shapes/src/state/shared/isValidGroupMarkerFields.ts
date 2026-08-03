import {
	isGroupMarkerDirection,
	isGroupMarkerTipPosition,
} from "../../schema/shared/GroupMarkerFields";

/** The state fields a group marker adds, both optional. */
type GroupMarkerStateFields = { direction?: unknown; tipPosition?: unknown };

/** Whether an optional `direction` holds one of the four sides. */
export const isValidGroupMarkerDirection = (
	state: GroupMarkerStateFields,
): boolean =>
	state.direction === undefined || isGroupMarkerDirection(state.direction);

/** Whether `direction` and the movable tip's `tipPosition` both hold (each optional). */
export const isValidGroupMarkerTipFields = (
	state: GroupMarkerStateFields,
): boolean =>
	isValidGroupMarkerDirection(state) &&
	(state.tipPosition === undefined ||
		isGroupMarkerTipPosition(state.tipPosition));
