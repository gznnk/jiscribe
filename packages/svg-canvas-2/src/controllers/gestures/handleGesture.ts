import { gestureHandlerRegistry } from "../../registry/GestureHandlerRegistry";
import type { CanvasState } from "../../states/canvas/CanvasState";
import type { Gesture } from "../hooks/useGestureRecognizer";

// Re-export types for convenience
export type {
	CanvasGesture,
	EventType,
	GestureHandler,
} from "../../registry/GestureHandlerRegistryTypes";

/**
 * Main gesture router.
 * Routes gestures to appropriate handlers based on their supports() method.
 *
 * Note: The gestureHandlerRegistry must be initialized via initializeRegistries()
 * from controllers/setup/ before using this function.
 */
export const handleGesture = (
	state: CanvasState,
	gesture: Gesture,
): CanvasState => {
	return gestureHandlerRegistry.handle(state, gesture);
};
