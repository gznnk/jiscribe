import type {
	CanvasGesture,
	GestureHandler,
} from "../../../registry/GestureHandlerRegistryTypes";
import type { CanvasState } from "../../../states/canvas/CanvasState";

/**
 * Handles events that occur on the canvas (not on objects).
 * This is the main entry point for canvas-level event handling.
 */
export const CanvasEventHandler: GestureHandler = {
	supports(gesture: CanvasGesture): boolean {
		return gesture.targetKind === "canvas";
	},

	handle(state: CanvasState, gesture: CanvasGesture): CanvasState {
		let nextState = state;

		// Clear selection on click
		if (gesture.type === "click") {
			nextState = {
				...nextState,
				selectedIds: [],
			};
		}

		return nextState;
	},
};
