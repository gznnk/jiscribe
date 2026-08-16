export { Canvas } from "./controllers/Canvas";
export type { CanvasHandle } from "./controllers/Canvas";
export type { CanvasGestureHandling } from "./controllers/CanvasGestureHandling";
export type {
	CanvasExportHandle,
	CanvasExportImagePayload,
	CanvasExportOptions,
	CanvasPngExportOptions,
} from "./controllers/hooks/useCanvasExport";
export type {
	CanvasFitOptions,
	CanvasViewportHandle,
} from "./controllers/hooks/useViewportHandle";
export type { CanvasSelectionHandle } from "./controllers/hooks/useSelectionHandle";
export type { ResolvedSelection } from "./controllers/utils/resolveRequestedSelection";
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
// StencilLibrary toolbar arrangement (pinned presets + category flyouts, issue #184).
// The layout is the single source of order and category metadata: each entry names,
// in display order, a pinned preset or a category flyout (label / icon / `presetIds`
// carried inline). Pass a custom `toolbar.layout` to `<Canvas>`; built-in category
// entries are exported for hosts composing layouts, and plugins export their own
// (e.g. `containerToolbarEntry`).
export {
	DEFAULT_TOOLBAR_LAYOUT,
	basicToolbarEntry,
	type ToolbarEntry,
} from "./controllers/ui/menu/Toolbar";
export { defaultCanvasMessages } from "./controllers/messages/CanvasMessages";
export type {
	CanvasMessages,
	CanvasMessageStrings,
} from "./controllers/messages/CanvasMessagesTypes";
export type {
	CanvasTheme,
	CanvasThemeTokens,
	CanvasHandleDimensions,
} from "./theme/CanvasTheme";
export { darkCanvasTheme, lightCanvasTheme } from "./theme/themePresets";
export type { Camera, Viewport } from "./states/canvas/Viewport";
export type { ScrollBoundsConfig } from "./controllers/CanvasTypes";
export type { CanvasDoc } from "./schemas/canvas/CanvasDoc";
// Headless parse/build API. `createCanvasParser` and the doc-ops live on the
// `./doc` entry (UI-free); the root carries only the result types, so a UI consumer
// can type a parse result without importing the parser factory itself.
export type { SemanticDiagnostic } from "./schemas/types/SemanticDiagnostic";
export type { CanvasParseResult, CanvasParser } from "./parser";

// Per-canvas registry configuration (plugin-style extensibility / feature-gating).
// Pass a `CanvasConfig` (capability set + view setup) to `<Canvas initialConfig={...}>`;
// its capability subset `CanvasCapabilities` is what the lower-level factory consumes.
// The factory and the full object-type descriptor table are exported for advanced/custom
// setups. Plugin declarations (packages/canvas/docs/12-plugin-architecture.md)
// go through `CanvasConfig.plugins`; there is no raw-registry escape hatch.
export type {
	CanvasCapabilities,
	CanvasConfig,
	CanvasRegistries,
} from "./controllers/registries";
export {
	createCanvasRegistries,
	ALL_OBJECT_DEFINITIONS,
} from "./controllers/registries";

// Shape-definition vocabulary for plugin authors (#144 Stage 1, src/plugin).
// A plugin needs only a declaration annotated `ObjectTypeDefinition<TDoc, TState>` — no
// defineObject call; only built-in records use it. Value exports are kept to the minimum
// (ObjectTypes / defineObject) and everything else is a type.
export { defineObject } from "./plugin";
export type {
	CanvasPlugin,
	ObjectTypeDefinition,
	AnyObjectTypeDefinition,
	ObjectDocDefinition,
	CanvasDocPlugin,
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
	ObjectDimensions,
} from "./schemas/objects/types/ObjectFactory";
export type { DocCreationDefaults } from "./schemas/objects/types/DocCreationDefaults";
export type {
	ObjectMapperType,
	DocToStateMapper,
	StateToDocMapper,
} from "./states/objects/base/MapperTypes";
export type { ObjectStateValidator } from "./states/registry/ObjectStateValidatorRegistry";
export type {
	ObjectContentResizer,
	ObjectContentResizeContext,
} from "./states/registry/ObjectContentResizerRegistry";
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
	ObjectMenuPropertyUpdater,
	OpenReferencePayload,
	OpenReferenceHandler,
} from "./controllers/ui/menu/ObjectMenu/ObjectMenuTypes";
export type {
	SelectionControlContext,
	SelectionControlDefinition,
	SelectionControlEvent,
	SelectionControlProps,
} from "./controllers/ui/controls/SelectionControlTypes";
export type { Mods } from "./controllers/gestures/recognizer/GestureRecognizerTypes";
// The slot id every single-text shape (`features.text: "body"`) holds, i.e. the
// key its `state.text` carries. A shape with several slots names its own instead.
export { BODY_TEXT_SLOT_ID } from "./constants/textSlotId";
export type { ObjectTextRegionCalculator } from "./presentations/objects/registry/ObjectTextRegionRegistry";
// Per-type, per-slot text-style defaults: the registry a canvas resolves an
// unset text style through, reachable as
// `CanvasRegistries["objectTextStyleDefaults"]`.
export type { TextSlotStyle } from "./schemas/objects/types/TextSlot";
export { resolveTextSlotStyle } from "./schemas/objects/types/TextSlot";
export type {
	ObjectTextSlotStyleDefaults,
	ObjectTextStyleDefaultsRegistry,
} from "./schemas/registry/ObjectTextStyleDefaultsRegistry";
export type {
	ObjectTextEditOverflowResolver,
	TextEditOverflow,
} from "./controllers/ui/editors/ObjectTextEditOverflowTypes";
export type { ObjectOutlineCalculator } from "./presentations/objects/registry/ObjectOutlineRegistry";
export type { ObjectAnchorRegionCalculator } from "./presentations/objects/registry/ObjectAnchorRegionRegistry";
export type {
	ExtraConnectPoint,
	ObjectExtraConnectPointsCalculator,
} from "./presentations/objects/registry/ObjectExtraConnectPointsRegistry";
export type { ObjectGeometryKeyCalculator } from "./presentations/objects/registry/ObjectGeometryKeyRegistry";
export type { ObjectVisualBoundsCalculator } from "./presentations/objects/registry/ObjectVisualBoundsRegistry";
export type { ObjectTransformHandles } from "./controllers/ui/controls/ObjectTransformHandlesRegistry";
export type {
	Stencil,
	StencilIconProps,
} from "./controllers/ui/objects/Stencil";
