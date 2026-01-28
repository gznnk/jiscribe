import { gestureHandlerRegistry } from "../../../registry/GestureHandlerRegistry";
import type {
	CanvasEvent,
	EventType,
} from "../../../registry/GestureHandlerRegistryTypes";
import type { CanvasState } from "../../../states/canvas/CanvasState";
import type { Gesture } from "../recognizer/GestureRecognizerTypes";

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
 * Converts low-level gestures to high-level canvas events and routes them to appropriate handlers.
 * Also manages eventStartState lifecycle (save on dragStart, clear on dragEnd).
 *
 * Note: The gestureHandlerRegistry must be initialized via initializeRegistries()
 * from controllers/setup/ before using this function.
 */
export const handleGesture = (
	state: CanvasState,
	gesture: Gesture,
): CanvasState => {
	let nextState = state;

	// Convert Gesture to CanvasEvent
	// wheel is converted to scroll/zoom, others are passed through
	let canvasEvent: CanvasEvent;
	if (gesture.type === "wheel") {
		if (gesture.mods.ctrl) {
			canvasEvent = { ...gesture, type: "zoom" } as CanvasEvent;
		} else {
			canvasEvent = { ...gesture, type: "scroll" } as CanvasEvent;
		}
	} else {
		canvasEvent = gesture as CanvasEvent;
	}

	// Save eventStartState on event start
	if (EVENT_START_TYPES.includes(canvasEvent.type)) {
		nextState = {
			...state,
			eventStartState: state,
		};
	}

	// Collect events to process (original + derived)
	const derivedEvents: CanvasEvent[] = [canvasEvent];

	// Edge scroll: If drag has scrollDelta, add a scroll event
	if (canvasEvent.type === "drag" && gesture.scrollDelta) {
		derivedEvents.push({
			...canvasEvent,
			type: "scroll",
			targetKind: "canvas",
		});
	}

	// Process all events
	for (const event of derivedEvents) {
		nextState = gestureHandlerRegistry.handle(nextState, event);
	}

	// Clear eventStartState on event end
	if (EVENT_END_TYPES.includes(canvasEvent.type)) {
		nextState = {
			...nextState,
			eventStartState: null,
			lastCommitTime: canvasEvent.time,
		};
	}

	return nextState;
};
