import type {
	SelectionControlContext,
	SelectionControlEvent,
} from "@workspace/canvas";

import { resolveGroupMarkerTipDrag } from "./resolveGroupMarkerTipDrag";
import type { GroupMarkerControlState } from "../state/shared/GroupMarkerControlState";

/**
 * Handles the tip control of a marker whose tip is pinned to the middle of the
 * span (the plain bracket): the same dominant-axis reading as
 * handleGroupMarkerTip, with the position dropped, so the drag only ever moves
 * the marker to another edge.
 *
 * Registered via that type's ObjectTypeDefinition.selectionControls.
 */
export const handleGroupMarkerDirection = <
	TState extends GroupMarkerControlState,
>(
	context: SelectionControlContext<TState>,
	event: SelectionControlEvent,
): TState => ({
	...context.startObject,
	direction: resolveGroupMarkerTipDrag(context, event).direction,
});
