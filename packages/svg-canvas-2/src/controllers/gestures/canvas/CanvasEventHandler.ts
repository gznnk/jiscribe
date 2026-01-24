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

		// Right-click drag for viewport panning (GrabScroll)
		if (gesture.button === 2) {
			if (gesture.type === "dragStart") {
				// Save the initial state when starting to drag
				nextState = {
					...nextState,
					eventStartState: state,
				};
			} else if (gesture.type === "drag") {
				// Calculate viewport offset from the initial state
				// gesture.delta is already in SVG coordinate system, so we need to multiply by zoom to get pixel offset
				const initialViewport =
					state.eventStartState?.viewport ?? state.viewport;
				const deltaX = gesture.delta.x * initialViewport.zoom;
				const deltaY = gesture.delta.y * initialViewport.zoom;

				nextState = {
					...nextState,
					viewport: {
						...initialViewport,
						minX: initialViewport.minX - deltaX,
						minY: initialViewport.minY - deltaY,
					},
				};
			} else if (gesture.type === "dragEnd") {
				// Clear the initial state when drag ends
				nextState = {
					...nextState,
					eventStartState: null,
				};
			}
			return nextState;
		}

		// Clear selection on click (left-click only)
		if (gesture.type === "click" && gesture.button === 0) {
			nextState = {
				...nextState,
				selectedIds: [],
			};
		}

		return nextState;
	},
};
