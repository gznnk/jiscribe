// Individual initializers (each populates a given bundle). Exposed for tests
// and partial initialization; production builds bundles via createCanvasRegistries.
export { initializeObjectRegistry } from "./initializeObjectRegistry";
export { initializeGestureHandlerRegistry } from "./initializeGestureHandlerRegistry";
export { initializeCommands } from "./initializeCommands";

// Per-canvas registry bundle: types, factory, and defaults
export type { CanvasRegistries, CanvasConfig } from "./CanvasRegistries";
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
