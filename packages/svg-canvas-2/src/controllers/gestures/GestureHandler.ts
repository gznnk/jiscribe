import { CanvasEventHandler } from "./canvas/CanvasEventHandler";
import { ControlEventHandler } from "./controls/ControlEventHandler";
import { ObjectEventHandler } from "./objects/ObjectEventHandler";
import { GestureHandlerRegistry } from "../../registry/GestureHandlerRegistry";
import type { CanvasState } from "../../states/canvas/CanvasState";
import type { Gesture } from "../hooks/useGestureRecognizer";

// Re-export types for convenience
export type {
	CanvasGesture,
	EventType,
	GestureHandler,
} from "../../registry/GestureHandlerRegistryTypes";

/**
 * Gesture handler registry instance.
 * Initialized with handlers for canvas, object, and control events.
 */
const gestureHandlerRegistry = new GestureHandlerRegistry()
	.register("canvas-handler", CanvasEventHandler)
	.register("object-handler", ObjectEventHandler)
	.register("control-handler", ControlEventHandler);

/**
 * Main gesture router.
 * Routes gestures to appropriate handlers based on their supports() method.
 */
export const handleGesture = (
	state: CanvasState,
	gesture: Gesture,
): CanvasState => {
	return gestureHandlerRegistry.handle(state, gesture);
};
