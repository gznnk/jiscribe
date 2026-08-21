export { Canvas } from "./controllers/Canvas";
export type { CanvasGestureHandling } from "./controllers/CanvasGestureHandling";
// The imperative handle and its namespaces (controllers/handles): the whole
// surface a host drives a mounted canvas through.
export type { CanvasHandle } from "./controllers/handles/CanvasHandle";
export type {
	CanvasExportHandle,
	CanvasPngCapture,
} from "./controllers/handles/useExportHandle";
export type {
	CanvasFitOptions,
	CanvasViewportHandle,
} from "./controllers/handles/useViewportHandle";
export type { CanvasSelectionHandle } from "./controllers/handles/useSelectionHandle";
export type {
	CanvasHitTestOptions,
	CanvasMeasureHandle,
} from "./controllers/handles/useMeasureHandle";
export type {
	CanvasHistoryHandle,
	CanvasHistoryMark,
} from "./controllers/handles/useHistoryHandle";
export type {
	CanvasInteractionHandle,
	CanvasInteractionStatus,
} from "./controllers/handles/useInteractionHandle";
export type {
	CanvasExportOptions,
	CanvasExportRegion,
	CanvasPngExportOptions,
} from "./controllers/utils/resolveExportOptions";
export type { CanvasExportImagePayload } from "./controllers/hooks/useExportDialog";
export type { TextSlotMeasurement } from "./controllers/utils/measureTextSlot";
export type { ObjectOverlap } from "./controllers/utils/findObjectOverlaps";
export type { CanvasModalKind, DragKind } from "./controllers/CanvasTypes";
export type { ResolvedSelection } from "./controllers/utils/resolveRequestedSelection";
export { CanvasThumbnail } from "./controllers/CanvasThumbnail";
export {
	exportCanvasToPng,
	exportCanvasToSvg,
	rasterizeSvgToPng,
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
	RasterizedPng,
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
export type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
// Headless parse/build API. `createCanvasParser` and the doc-ops live on the
// `./doc` entry (UI-free); the root carries only the result types, so a UI consumer
// can type a parse result without importing the parser factory itself.
export type { SemanticDiagnostic } from "@jiscribe/doc/model/types/SemanticDiagnostic";
export type { CanvasParseResult, CanvasParser } from "@jiscribe/doc/parse";

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
export { ObjectTypes } from "@jiscribe/doc/model/objects/types/ObjectType";
export type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
export type { ObjectDoc } from "@jiscribe/doc/model/objects/base/ObjectDoc";
export type { MetaDoc } from "@jiscribe/doc/model/objects/base/MetaDoc";
export type { ObjectState } from "./states/objects/base/ObjectState";
export type { MetaState } from "./states/objects/base/MetaState";
export type { CreateObjectType } from "@jiscribe/doc/model/objects/types/CreateObjectType";
export type { CreateObjectState } from "./states/objects/types/CreateObjectState";
export type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
export type { GeometryType } from "@jiscribe/doc/model/objects/types/GeometryType";
export type {
	ExtraStylePropertyDescriptor,
	StyleValueType,
} from "@jiscribe/doc/model/objects/types/ExtraStyleProperty";
export type {
	ObjectFactory,
	ObjectDimensions,
} from "@jiscribe/doc/model/objects/types/ObjectFactory";
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
export { BODY_TEXT_SLOT_ID } from "@jiscribe/doc/text/style/textSlotId";
export { CANVAS_FONT_FAMILIES } from "@jiscribe/doc/text/style/fontFamilies";
export type {
	CanvasFontFamily,
	CanvasFontFamilyId,
} from "@jiscribe/doc/text/style/fontFamilies";
export type { ObjectTextRegionCalculator } from "./rendering/objects/registry/ObjectTextRegionRegistry";
// Per-type, per-slot text-style defaults: the registry a canvas resolves an
// unset text style through, reachable as
// `CanvasRegistries["objectTextStyleDefaults"]`.
export type { TextSlotStyle } from "@jiscribe/doc/model/objects/types/TextSlot";
export { resolveTextSlotStyle } from "@jiscribe/doc/model/objects/types/TextSlot";
export type {
	ObjectTextSlotStyleDefaults,
	ObjectTextStyleDefaultsRegistry,
} from "@jiscribe/doc/plugin/ObjectTextStyleDefaultsRegistry";
export type {
	ObjectTextEditOverflowResolver,
	TextEditOverflow,
} from "./controllers/ui/editors/ObjectTextEditOverflowTypes";
export type { ObjectOutlineCalculator } from "./rendering/objects/registry/ObjectOutlineRegistry";
export type { ObjectAnchorRegionCalculator } from "./rendering/objects/registry/ObjectAnchorRegionRegistry";
export type {
	ExtraConnectPoint,
	ObjectExtraConnectPointsCalculator,
} from "./rendering/objects/registry/ObjectExtraConnectPointsRegistry";
export type { ObjectGeometryKeyCalculator } from "./rendering/objects/registry/ObjectGeometryKeyRegistry";
export type { ObjectVisualBoundsCalculator } from "./rendering/objects/registry/ObjectVisualBoundsRegistry";
export type { ObjectTransformHandles } from "./controllers/ui/controls/ObjectTransformHandlesRegistry";
export type {
	Stencil,
	StencilIconProps,
} from "./controllers/ui/objects/Stencil";
