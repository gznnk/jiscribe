import type {
	SelectionControlContext,
	SelectionControlEvent,
	SelectionControlResult,
} from "@jiscribe/canvas";

import { calcErEntityLocalDragDelta } from "./calcErEntityLocalDragDelta";
import { calcErEntityTrailingEdgeDrag } from "./calcErEntityTrailingEdgeDrag";
import { readErEntitySlotDragStart } from "./readErEntitySlotDragStart";
import type { ErEntityState } from "../state/ErEntityState";
import { writeErEntitySlotWidths } from "../state/writeErEntitySlotWidths";

/**
 * Handles a drag on the entity's right edge below the title band: the type
 * column alone resizes and the box with it, from the corner the entity is drawn
 * from (calcErEntityTrailingEdgeDrag). Shift is ignored, the edge having no
 * neighbour to trade with.
 *
 * Every frame is rebuilt from the gesture-start snapshot, so a cursor brought
 * back to where it started restores the start.
 *
 * Registered via the entity's ObjectTypeDefinition.selectionControls.
 */
export const handleErEntityTrailingEdge = (
	context: SelectionControlContext<ErEntityState>,
	event: SelectionControlEvent,
): SelectionControlResult<ErEntityState> | null => {
	// Drags only: the control declares no `events`.
	if (event.type !== "drag" && event.type !== "dragEnd") {
		return null;
	}
	const startEntity = context.startObject;
	const slotWidths = calcErEntityTrailingEdgeDrag(
		readErEntitySlotDragStart(startEntity),
		calcErEntityLocalDragDelta(startEntity, event).x,
	);
	return { object: writeErEntitySlotWidths(startEntity, slotWidths) };
};
