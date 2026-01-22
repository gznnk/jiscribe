import { gestureHandlerRegistry } from "../../registry/GestureHandlerRegistry";
import type {
	CanvasGesture,
	EventType,
} from "../../registry/GestureHandlerRegistryTypes";
import type { CanvasState } from "../../states/canvas/CanvasState";
import type { Gesture } from "../hooks/useGestureRecognizer";

/**
 * Event types that should trigger saving the current state as eventStartState.
 * Add new event start types here as needed.
 */
const EVENT_START_TYPES: readonly EventType[] = ["dragStart"] as const;

/**
 * Event types that should trigger clearing the eventStartState.
 * Add new event end types here as needed.
 */
const EVENT_END_TYPES: readonly EventType[] = ["dragEnd"] as const;

/**
 * Main gesture router.
 * Routes gestures to appropriate handlers based on their supports() method.
 * Also manages eventStartState lifecycle (save on dragStart, clear on dragEnd).
 *
 * Note: The gestureHandlerRegistry must be initialized via initializeRegistries()
 * from controllers/setup/ before using this function.
 */
export const handleGesture = (
	state: CanvasState,
	gesture: Gesture,
): CanvasState => {
	// Convert Gesture to CanvasGesture
	// Currently, Gesture and CanvasGesture are structurally identical,
	// but this conversion point allows for future extensions (e.g., dragOver, dragLeave)
	const canvasGesture: CanvasGesture = gesture;

	let nextState = state;

	// Save eventStartState on event start
	if (EVENT_START_TYPES.includes(canvasGesture.type)) {
		nextState = {
			...state,
			eventStartState: state,
		};
	}

	// Route to appropriate handler
	nextState = gestureHandlerRegistry.handle(nextState, canvasGesture);

	// Clear eventStartState on event end
	if (EVENT_END_TYPES.includes(canvasGesture.type)) {
		nextState = {
			...nextState,
			eventStartState: null,
			lastCommitTime: canvasGesture.time,
		};
	}

	return nextState;
};
