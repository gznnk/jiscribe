export { Canvas } from "./controllers/Canvas";
export type {
	CanvasExportHandle,
	CanvasExportImagePayload,
	CanvasExportOptions,
} from "./controllers/hooks/useCanvasExport";
export { CanvasThumbnail } from "./controllers/CanvasThumbnail";
export {
	exportCanvasToPng,
	exportCanvasToSvg,
	rasterizeSvgToPngBlob,
	canvasToSvgString,
	buildExportSvg,
	serializeSvg,
	embedCanvasSource,
	extractCanvasSource,
	embedCanvasSourceInPng,
	extractCanvasSourceFromPng,
	downloadBlob,
} from "./export";
export type {
	ExportCanvasToPngOptions,
	ExportCanvasToSvgOptions,
	RasterizeSvgOptions,
	BuildExportSvgOptions,
} from "./export";
// ShapeLibrary toolbar arrangement (pinned presets + category flyouts, issue #184).
// Pass a custom `toolbarLayout` to `<Canvas>`; category metadata is exported so
// hosts can reference or extend the built-in categories.
export {
	DEFAULT_TOOLBAR_LAYOUT,
	type ToolbarEntry,
} from "./controllers/ui/menu/Toolbar";
export {
	SHAPE_CATEGORY_DEFINITIONS,
	type ShapeCategory,
} from "./controllers/ui/menu/ShapeLibrary/shapeCategories";
export { defaultCanvasMessages } from "./controllers/messages/CanvasMessages";
export { jaCanvasMessages } from "./controllers/messages/jaCanvasMessages";
export type {
	CanvasMessages,
	CanvasMessageStrings,
} from "./controllers/messages/CanvasMessages";
export type {
	CanvasTheme,
	CanvasThemeTokens,
	CanvasHandleDimensions,
} from "./theme/CanvasTheme";
export {
	darkCanvasTheme,
	lightCanvasTheme,
	brandLightCanvasTheme,
} from "./theme/themePresets";
export type { Camera } from "./states/canvas/Viewport";
export type { CanvasDoc } from "./schemas/canvas/CanvasDoc";
export { parseCanvasText } from "./schemas/canvas/validators";
export type {
	SemanticDiagnostic,
	CanvasParseResult,
} from "./schemas/canvas/validators";

// Per-canvas registry configuration (plugin-style extensibility / feature-gating).
// Pass a `CanvasConfig` to `<Canvas initialConfig={...}>`; the lower-level factory and the
// full object-type descriptor table are exported for advanced/custom setups.
export type { CanvasConfig, CanvasRegistries } from "./controllers/setup";
export {
	createCanvasRegistries,
	ALL_OBJECT_DEFINITIONS,
} from "./controllers/setup";
