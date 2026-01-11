import { handleGesture } from "./gestures";
import type { Gesture } from "./useGestureRecognizer";
import type { CanvasState } from "../states/canvas/CanvasState";

// Action types
export type CanvasAction = { type: "GESTURE"; gesture: Gesture };

export const canvasReducer = (
	state: CanvasState,
	action: CanvasAction,
): CanvasState => {
	switch (action.type) {
		case "GESTURE":
			return handleGesture(state, action.gesture);

		default:
			return state;
	}
};
