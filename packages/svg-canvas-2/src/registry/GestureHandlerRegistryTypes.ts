import type { Prettify } from "@workspace/utility-types/src/Prettify";

import type { Gesture, GestureType } from "../controllers/hooks/useGestureRecognizer";
import type { CanvasState } from "../states/canvas/CanvasState";

/**
 * Extended event type that includes gesture types plus additional canvas-specific events.
 */
export type EventType = GestureType | "dragOver" | "dragLeave";

/**
 * Canvas gesture type.
 * Extends the base Gesture type with additional event types like dragOver and dragLeave.
 */
export type CanvasGesture = Prettify<
	{
		type: EventType;
	} & Omit<Gesture, "type">
>;

/**
 * Interface for gesture handlers.
 * Handlers can determine if they support a gesture and process it accordingly.
 */
export interface GestureHandler {
	/**
	 * Determines if this handler supports the given canvas gesture.
	 * @param gesture - The canvas gesture to check
	 * @returns true if this handler can process the gesture
	 */
	supports(gesture: CanvasGesture): boolean;

	/**
	 * Handles the canvas gesture and returns the updated canvas state.
	 * @param state - The current canvas state
	 * @param gesture - The canvas gesture to process
	 * @returns The updated canvas state
	 */
	handle(state: CanvasState, gesture: CanvasGesture): CanvasState;
}
