import type {
	CanvasGesture,
	GestureHandler,
} from "./GestureHandlerRegistryTypes";
import type { Gesture } from "../controllers/hooks/useGestureRecognizer";
import type { CanvasState } from "../states/canvas/CanvasState";

/**
 * Registry for gesture handlers.
 * Routes gestures to appropriate handlers based on their supports() method.
 */
export class GestureHandlerRegistry {
	private handlers = new Map<string, GestureHandler>();

	/**
	 * Registers a handler with a given name.
	 * @param name - A unique identifier for this handler (e.g., "canvas-handler", "object-handler")
	 * @param handler - The handler instance to register
	 * @returns this for method chaining
	 */
	register(name: string, handler: GestureHandler): this {
		this.handlers.set(name, handler);
		return this;
	}

	/**
	 * Unregisters a handler by name.
	 * @param name - The name of the handler to unregister
	 * @returns true if the handler was removed, false if it didn't exist
	 */
	unregister(name: string): boolean {
		return this.handlers.delete(name);
	}

	/**
	 * Retrieves a handler by name.
	 * @param name - The name of the handler to look up
	 * @returns The handler instance, or undefined if not found
	 */
	getHandler(name: string): GestureHandler | undefined {
		return this.handlers.get(name);
	}

	/**
	 * Processes a gesture by routing it to the first handler that supports it.
	 * @param state - The current canvas state
	 * @param gesture - The gesture to process
	 * @returns The updated canvas state
	 */
	handle(state: CanvasState, gesture: Gesture): CanvasState {
		// Convert Gesture to CanvasGesture
		const canvasGesture: CanvasGesture = gesture;

		// Iterate through all handlers and find the first one that supports this gesture
		for (const handler of this.handlers.values()) {
			if (handler.supports(canvasGesture)) {
				return handler.handle(state, canvasGesture);
			}
		}

		return state;
	}

	/**
	 * Clears all registered handlers.
	 */
	clear(): void {
		this.handlers.clear();
	}
}

/**
 * Singleton instance of GestureHandlerRegistry.
 * Should be initialized via initializeGestureHandlerRegistry() from controllers/setup/.
 */
export const gestureHandlerRegistry = new GestureHandlerRegistry();
