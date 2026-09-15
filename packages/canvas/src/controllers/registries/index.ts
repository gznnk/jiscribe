// Initializers that populate a given bundle. A canvas gets its bundle from
// createCanvasRegistries, which calls these along with initializeStyleProperties.
export { initializeGestureHandlerRegistry } from "./initializeGestureHandlerRegistry";
export { initializeCommands } from "./initializeCommands";

// Per-canvas registry bundle: types, factory, and defaults
export type {
	CanvasRegistries,
	CanvasCapabilities,
	CanvasConfig,
} from "./CanvasRegistries";
export {
	createCanvasRegistries,
	defaultCanvasRegistries,
	createTestRegistries,
} from "./createCanvasRegistries";
// Plugin vocabulary (ObjectTypeDefinition / defineObject / CanvasPlugin) lives in
// `src/plugin`; `applyObjectDefinition` is the wiring that applies it here.
export {
	BUILTIN_OBJECT_DEFINITIONS,
	applyObjectDefinition,
} from "./applyObjectDefinition";
export { ALL_COMMANDS } from "./initializeCommands";
