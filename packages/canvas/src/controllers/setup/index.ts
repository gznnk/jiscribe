import { initializeCommands } from "./initializeCommands";
import { initializeGestureHandlerRegistry } from "./initializeGestureHandlerRegistry";
import { initializeObjectRegistry } from "./initializeObjectRegistry";

/**
 * Initialize all registries.
 * This should be called once at application startup before using any canvas functionality.
 *
 * With no arguments each initializer targets the module-level singleton bundle
 * (backward compatible). Per-canvas bundles are built via `createCanvasRegistries`.
 */
export const initializeRegistries = (): void => {
	initializeObjectRegistry();
	initializeGestureHandlerRegistry();
	initializeCommands();
};

// Re-export individual initializers for testing or partial initialization
export { initializeObjectRegistry } from "./initializeObjectRegistry";
export { initializeGestureHandlerRegistry } from "./initializeGestureHandlerRegistry";
export { initializeCommands } from "./initializeCommands";

// Per-canvas registry bundle: types, factory, and defaults
export type { CanvasRegistries, CanvasConfig } from "./CanvasRegistries";
export { singletonRegistries } from "./CanvasRegistries";
export {
	createCanvasRegistries,
	defaultCanvasRegistries,
	createTestRegistries,
} from "./createCanvasRegistries";
export {
	ALL_OBJECT_DEFINITIONS,
	applyObjectDefinition,
} from "./initializeObjectRegistry";
export { ALL_COMMANDS } from "./initializeCommands";
