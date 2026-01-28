import type {
	CanvasEvent,
	GestureHandler,
} from "./GestureHandlerRegistryTypes";
import type { CanvasState } from "../states/canvas/CanvasState";

/**
 * Registry for gesture handlers.
 * Routes canvas events to appropriate handlers based on their supports() method.
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
	 * Processes a canvas event by routing it to the first handler that supports it.
	 * @param state - The current canvas state
	 * @param event - The canvas event to process
	 * @returns The updated canvas state
	 */
	handle(state: CanvasState, event: CanvasEvent): CanvasState {
		// Iterate through all handlers and find the first one that supports this event
		for (const handler of this.handlers.values()) {
			if (handler.supports(event)) {
				return handler.handle(state, event);
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
