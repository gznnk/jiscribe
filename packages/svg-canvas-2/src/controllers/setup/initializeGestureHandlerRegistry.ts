import { gestureHandlerRegistry } from "../../registry/GestureHandlerRegistry";
import { CanvasEventHandler } from "../gestures/canvas/CanvasEventHandler";
import { ControlEventHandler } from "../gestures/controls/ControlEventHandler";
import { ObjectEventHandler } from "../gestures/objects/ObjectEventHandler";

/**
 * Initialize the GestureHandlerRegistry with all gesture handlers.
 * Registers handlers for canvas, object, and control events.
 */
export const initializeGestureHandlerRegistry = (): void => {
	gestureHandlerRegistry.clear();

	gestureHandlerRegistry
		.register("canvas-handler", CanvasEventHandler)
		.register("object-handler", ObjectEventHandler)
		.register("control-handler", ControlEventHandler);
};
