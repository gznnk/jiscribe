import type { CanvasState } from "../../states/canvas/CanvasState";
import type { Gesture } from "../hooks/useGestureRecognizer";

/**
 * Gesture handler - pure function that returns new state.
 */
export const handleGesture = (
	state: CanvasState,
	gesture: Gesture,
): CanvasState => {
	if (gesture.targetKind === "canvas") {
		// Handle canvas-level gestures here
		return state;
	}

	if (gesture.targetKind === "object") {
		return state;
	}

	return state;
};
