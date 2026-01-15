import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { CanvasEvent } from "../GestureHandler";

/**
 * Handles events that occur on the canvas (not on objects).
 * This is the main entry point for canvas-level event handling.
 */
export const handleCanvasEvent = (
	state: CanvasState,
	event: CanvasEvent,
): CanvasState => {
	let nextState = state;

	// Clear selection on click
	if (event.type === "click") {
		nextState = {
			...nextState,
			selectedIds: [],
		};
	}

	return nextState;
};
