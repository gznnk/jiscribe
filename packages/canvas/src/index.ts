export { Canvas } from "./controllers/Canvas";
export type { CanvasExportHandle } from "./controllers/Canvas";
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
	ExportViewBox,
} from "./export";
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
