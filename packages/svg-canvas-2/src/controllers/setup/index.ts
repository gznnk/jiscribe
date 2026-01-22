import { initializeGestureHandlerRegistry } from "./initializeGestureHandlerRegistry";
import { initializeObjectRegistry } from "./initializeObjectRegistry";

/**
 * Initialize all registries.
 * This should be called once at application startup before using any canvas functionality.
 */
export const initializeRegistries = (): void => {
	initializeObjectRegistry();
	initializeGestureHandlerRegistry();
};

// Re-export individual initializers for testing or partial initialization
export { initializeObjectRegistry } from "./initializeObjectRegistry";
export { initializeGestureHandlerRegistry } from "./initializeGestureHandlerRegistry";
