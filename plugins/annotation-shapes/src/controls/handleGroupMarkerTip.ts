import type {
	SelectionControlContext,
	SelectionControlEvent,
} from "@jiscribe/canvas";

import { resolveGroupMarkerTipDrag } from "./resolveGroupMarkerTipDrag";
import type { GroupMarkerControlState } from "../state/shared/GroupMarkerControlState";

/**
 * Handles the tip control of a marker whose tip moves along the span (the brace
 * and the stemmed bracket): a free 2D drag writing back both the edge the tip
 * landed on and where along it (resolveGroupMarkerTipDrag).
 *
 * Registered via those types' ObjectTypeDefinition.selectionControls.
 */
export const handleGroupMarkerTip = <TState extends GroupMarkerControlState>(
	context: SelectionControlContext<TState>,
	event: SelectionControlEvent,
): TState => ({
	...context.startObject,
	...resolveGroupMarkerTipDrag(context, event),
});
