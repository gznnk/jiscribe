import type {
	SelectionControlContext,
	SelectionControlEvent,
	SelectionControlResult,
} from "@jiscribe/canvas";

import { calcErEntityLocalDragDelta } from "./calcErEntityLocalDragDelta";
import { calcErEntitySlotBoundaryDrag } from "./calcErEntitySlotBoundaryDrag";
import {
	parseErEntitySlotBoundaryIndex,
	readErEntitySlotBoundaryDragMode,
} from "./erEntitySlotBoundaryAction";
import { readErEntitySlotDragStart } from "./readErEntitySlotDragStart";
import type { ErEntityState } from "../state/ErEntityState";
import { writeErEntitySlotWidths } from "../state/writeErEntitySlotWidths";

/**
 * Handles a drag on a slot boundary: the slot left of it resizes alone and the
 * box with it, or with Shift held the two slots either side trade width
 * (calcErEntitySlotBoundaryDrag). The mode is read off every frame's modifiers,
 * and which boundary off the strip's `data-action`.
 *
 * Every frame is rebuilt from the gesture-start snapshot, so a cursor brought
 * back to where it started restores the start. Both slot widths are written
 * stated from the first frame on (writeErEntitySlotWidths).
 *
 * Registered via the entity's ObjectTypeDefinition.selectionControls.
 */
export const handleErEntitySlotBoundary = (
	context: SelectionControlContext<ErEntityState>,
	event: SelectionControlEvent,
): SelectionControlResult<ErEntityState> | null => {
	// Drags only: the control declares no `events`.
	if (event.type !== "drag" && event.type !== "dragEnd") {
		return null;
	}
	const boundaryIndex = parseErEntitySlotBoundaryIndex(event.subAction);
	if (boundaryIndex === null) {
		return null;
	}
	const startEntity = context.startObject;
	const slotWidths = calcErEntitySlotBoundaryDrag(
		readErEntitySlotDragStart(startEntity),
		boundaryIndex,
		calcErEntityLocalDragDelta(startEntity, event).x,
		readErEntitySlotBoundaryDragMode(event.mods),
	);
	if (slotWidths === null) {
		return null;
	}
	return { object: writeErEntitySlotWidths(startEntity, slotWidths) };
};
