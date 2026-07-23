export { Canvas } from "./controllers/Canvas";
export type { CanvasHandle } from "./controllers/Canvas";
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
// Pass a custom `toolbar.layout` to `<Canvas>`; built-in category metadata is
// exported for hosts composing layouts (plugins add categories via
// `ObjectTypeDefinition.shapeLibrary.categories`).
export {
	DEFAULT_TOOLBAR_LAYOUT,
	type ToolbarEntry,
} from "./controllers/ui/menu/Toolbar";
export {
	SHAPE_CATEGORY_DEFINITIONS,
	type ShapeCategory,
} from "./controllers/ui/menu/ShapeLibrary/shapeCategories";
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
// Pass a `CanvasConfig` (capability set + initial view) to `<Canvas initialConfig={...}>`;
// its capability subset `CanvasCapabilities` is what the lower-level factory consumes.
// The factory and the full object-type descriptor table are exported for advanced/custom
// setups. Plugin declarations (docs/05_extensibility/canvas-plugin-design.md) go through
// `CanvasConfig.plugins`; there is no raw-registry escape hatch.
export type {
	CanvasCapabilities,
	CanvasConfig,
	CanvasRegistries,
} from "./controllers/setup";
export {
	createCanvasRegistries,
	ALL_OBJECT_DEFINITIONS,
} from "./controllers/setup";

// 図形定義の語彙（プラグイン作者向け、#144 Stage 1・src/plugin）。
// プラグインは `ObjectTypeDefinition<TDoc, TState>` を注釈した宣言だけで済む
// （defineObject 呼び出しは不要）。built-in レコードのみ defineObject を使う。
// 値 export は最小限（ObjectTypes / defineObject）に絞り、他はすべて型。
export { defineObject } from "./plugin";
export type {
	CanvasPlugin,
	ObjectTypeDefinition,
	AnyObjectTypeDefinition,
	ShapeLibraryRegistration,
} from "./plugin";
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
	ObjectFactory,
	ShapeDimensions,
} from "./schemas/objects/types/ObjectFactory";
export type { DocCreationDefaults } from "./schemas/objects/types/DocCreationDefaults";
export type {
	ObjectMapperType,
	DocToStateMapper,
	StateToDocMapper,
} from "./states/objects/base/MapperTypes";
export type { ObjectStateValidator } from "./states/registry/ObjectStateValidatorRegistry";
export type {
	ObjectBehaviorEntry,
	MoveByDeltaFunction,
	TransformByGroupFunction,
	RotateByGroupFunction,
} from "./controllers/gestures/registry/ObjectBehaviorTypes";
export type {
	ObjectMenuSection,
	ObjectMenuItem,
	BuiltinItem,
	CustomItem,
	BuiltinItemKey,
	ObjectMenuItemProps,
} from "./controllers/ui/menu/ObjectMenu/ObjectMenuTypes";
export type {
	SelectionControlDefinition,
	SelectionControlProps,
} from "./controllers/ui/controls/SelectionControlTypes";
export type { SelectionControlHandler } from "./controllers/gestures/registry/SelectionControlHandler";
export type { ObjectTextRegionCalculator } from "./presentations/objects/registry/ObjectTextRegionRegistry";
export type { ObjectOutlineCalculator } from "./presentations/objects/registry/ObjectOutlineRegistry";
export type {
	ShapePreset,
	ShapeIconProps,
} from "./controllers/ui/objects/ShapePreset";
