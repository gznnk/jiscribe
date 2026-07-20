export { Canvas } from "./controllers/Canvas";
export type {
	CanvasExportHandle,
	CanvasExportImagePayload,
	CanvasExportOptions,
} from "./controllers/hooks/useCanvasExport";
export type { CanvasViewportHandle } from "./controllers/hooks/useViewportHandle";
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
export {
	parseCanvasText,
	createCanvasParser,
	defaultObjectParserExtensions,
} from "./schemas/canvas/validators";
export type {
	SemanticDiagnostic,
	CanvasParseResult,
	CanvasParser,
	ObjectParserExtension,
} from "./schemas/canvas/validators";

// Per-canvas registry configuration (plugin-style extensibility / feature-gating).
// Pass a `CanvasConfig` to `<Canvas initialConfig={...}>`; the lower-level factory and the
// full object-type descriptor table are exported for advanced/custom setups.
// Plugin declarations (docs/05_extensibility/canvas-plugin-design.md) go through
// `CanvasConfig.plugins`; there is no raw-registry escape hatch.
export type {
	CanvasConfig,
	CanvasRegistries,
	CanvasPlugin,
} from "./controllers/setup";
export {
	createCanvasRegistries,
	ALL_OBJECT_DEFINITIONS,
	defineObject,
} from "./controllers/setup";
export type {
	ObjectTypeDefinition,
	ShapeLibraryRegistration,
} from "./controllers/setup";

// 図形定義の語彙（プラグイン作者向け、#144 Stage 1）。
// `defineObject` で ObjectTypeDefinition を組み立て、`CanvasPlugin.objects` で
// 宣言する。値 export は最小限（ObjectTypes / defineObject）に絞り、他はすべて型。
export { ObjectTypes } from "./schemas/objects/types/ObjectType";
export type { ObjectType } from "./schemas/objects/types/ObjectType";
export type { ObjectDoc } from "./schemas/objects/base/ObjectDoc";
export type { MetaDoc } from "./schemas/objects/base/MetaDoc";
export type { ObjectState } from "./states/objects/base/ObjectState";
export type { MetaState } from "./states/objects/base/MetaState";
export type { CreateObjectType } from "./schemas/objects/types/CreateObjectType";
export type { CreateObjectState } from "./states/objects/types/CreateObjectState";
export type { ObjectFeatures } from "./schemas/objects/types/ObjectFeatures";
export type { GeometryType } from "./schemas/objects/types/GeometryType";
export type {
	ExtraStylePropertyDescriptor,
	StyleValueType,
} from "./schemas/objects/types/ExtraStyleProperty";
export type {
	ShapeFactory,
	ShapeDimensions,
} from "./schemas/objects/types/ShapeFactory";
export type { DocCreationDefaults } from "./schemas/objects/types/DocCreationDefaults";
export type {
	ObjectMapperType,
	DocToStateMapper,
	StateToDocMapper,
} from "./states/objects/base/MapperTypes";
export type { ObjectStateValidateFn } from "./states/registry/ObjectStateValidatorRegistry";
export type {
	ObjectBehaviorEntry,
	MoveByDeltaFunction,
	TransformByGroupFunction,
	RotateByGroupFunction,
} from "./controllers/gestures/registry/ObjectBehaviorTypes";
export type {
	MenuSectionFactory,
	MenuSection,
	MenuItem,
	BuiltinItem,
	CustomItem,
	BuiltinItemKey,
	MenuItemProps,
} from "./controllers/ui/menu/ObjectMenu/ObjectMenuTypes";
export type {
	SelectionControlDefinition,
	SelectionControlProps,
} from "./controllers/ui/controls/SelectionControlTypes";
export type { SelectionControlHandler } from "./controllers/gestures/registry/SelectionControlHandler";
export type { TextRegionCalculator } from "./presentations/objects/registry/TextRegionRegistry";
export type { ShapeOutlineProvider } from "./presentations/objects/registry/ShapeOutlineRegistry";
export type {
	ShapePreviewRenderer,
	ShapePreviewProps,
} from "./presentations/objects/registry/ShapePreviewTypes";
export type {
	ShapePreset,
	ShapeIconProps,
} from "./controllers/ui/objects/ShapePreset";
