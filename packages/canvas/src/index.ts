export { Canvas } from "./controllers/Canvas";
export { CanvasThumbnail } from "./controllers/CanvasThumbnail";
export { defaultCanvasMessages } from "./controllers/messages/CanvasMessages";
export type {
	CanvasMessages,
	CanvasMessageStrings,
} from "./controllers/messages/CanvasMessages";
export type {
	CanvasTheme,
	CanvasThemeTokens,
	CanvasHandleDimensions,
} from "./theme/CanvasTheme";
export { darkCanvasTheme, lightCanvasTheme } from "./theme/themePresets";
export type { Camera } from "./states/canvas/Viewport";
export type { CanvasDoc } from "./schemas/canvas/CanvasDoc";
export { parseCanvasText } from "./schemas/canvas/validators";
export type {
	SemanticDiagnostic,
	CanvasParseResult,
} from "./schemas/canvas/validators";

// Per-canvas registry configuration (plugin-style extensibility / feature-gating).
// Pass a `CanvasConfig` to `<Canvas config={...}>`; the lower-level factory and the
// full object-type descriptor table are exported for advanced/custom setups.
export type { CanvasConfig, CanvasRegistries } from "./controllers/setup";
export {
	createCanvasRegistries,
	ALL_OBJECT_DEFINITIONS,
} from "./controllers/setup";
