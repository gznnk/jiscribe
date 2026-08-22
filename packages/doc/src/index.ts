// The stable API of @jiscribe/doc — parsing, validating, and programmatically
// building and editing a CanvasDoc. The whole package is headless
// (UI-independent), so nothing here carries a React / @emotion dependency.
//
// The root entry of @jiscribe/canvas exports Canvas (a React component), so importing
// it pulls in react / @emotion / katex. Node-side consumers that only work with the
// doc model — the VSCode extension's DiagnosticProvider, the MCP server, Function
// Calling handlers — take this package instead, keeping those UI dependencies out of
// their bundle.
//
// The doc-ops are definition-driven: `createDocOps({ presetDefinitions?, plugins? })`
// resolves the same ObjectDocDefinition set as the parser. `create` is the factory prefix
// (as in createCanvasParser) — the DocOps it returns covers the whole edit vocabulary, not
// only creation: building (`addObject` / `connect`) and reworking what is already there
// (delete / move / resize / rotate / reshape / restack / style / retext / re-route /
// align / group) handle built-in and plugin types uniformly, following each type's
// `features`. Reading is covered too: `get` / `list` / `find` ops answer what is in the
// doc without handing back the whole of it.
// They take already-typed params (no zod; tool-input validation is the
// adapter's responsibility) and reuse the same ObjectFactory as the canvas, producing
// correct ObjectDocs down to the style defaults. Every editing op mutates the doc in place
// and checks its arguments first, so a call that throws leaves the doc untouched.
//
// e.g. `import { createCanvasParser, createDocOps } from "@jiscribe/doc";`
export type { CanvasDoc } from "./model/canvas/CanvasDoc";
export type { ObjectDoc } from "./model/objects/base/ObjectDoc";
export type { ObjectType } from "./model/objects/types/ObjectType";
export type { ObjectFeatures } from "./model/objects/types/ObjectFeatures";
export type { CreateObjectType } from "./model/objects/types/CreateObjectType";
// The field names each style group owns, tied to its Doc type so a field added to the
// group cannot be left out. Consumers that enumerate style properties of their own —
// the AI schema generator's property table is the one outside this package — build
// their lists from these rather than spelling the names again.
export { FILL_STYLE_KEYS } from "./model/objects/base/FillStyleDoc";
export { STROKE_STYLE_KEYS } from "./model/objects/base/StrokeStyleDoc";
export { RADIUS_STYLE_KEYS } from "./model/objects/base/RadiusStyleDoc";
export { ARROW_STYLE_KEYS } from "./model/objects/base/ArrowStyleDoc";
export { TRANSFORM_STYLE_KEYS } from "./model/objects/base/TransformDoc";
// A text slot is the unit of text in both layers, so a type that spells out its
// own slots (features.text: "slots") declares them with this in its Doc and reuses
// the very same values in its State.
export type {
	TextSlot,
	TextSlotContent,
	TextSlotStyle,
} from "./model/objects/types/TextSlot";
export {
	isTextRows,
	isTextSlot,
	resolveTextSlotStyle,
	TEXT_BLOCK_STYLE_KEYS,
	TEXT_SLOT_STYLE_KEYS,
} from "./model/objects/types/TextSlot";
// One body of a slot's text: the plain string it is until part of it is styled on
// its own, and the runs it is written as once it is.
export type {
	InlineTextStyle,
	RichText,
	TextRun,
} from "./model/objects/types/RichText";
export {
	isRichText,
	isTextRun,
	normalizeRichText,
	remapRichText,
	richTextToPlain,
	sliceRichText,
	styleRichTextRange,
	TEXT_INLINE_STYLE_KEYS,
} from "./model/objects/types/RichText";
export type {
	ExtraStylePropertyDescriptor,
	StyleValueType,
} from "./model/objects/types/ExtraStyleProperty";
export type { ObjectDocDefinition } from "./plugin/ObjectDocDefinition";
// The text-region declaration a doc definition carries, and the two answers most
// types give: the whole box, and "the box does not hold the text at all".
export type { ObjectDocTextRegionCalculator } from "./plugin/ObjectDocTextRegion";
export {
	calcFullBoxTextRegion,
	calcOutsideBoxTextRegion,
} from "./plugin/ObjectDocTextRegion";
// Whether a type may leave `height` out of the document, which is what that
// declaration decides: the schema generator relaxes the field for exactly these
// types, and the doc-ops refuse to switch any other.
export { supportsAutoHeight } from "./plugin/supportsAutoHeight";
export type { AutoHeightDeclaration } from "./plugin/supportsAutoHeight";
// The per-slot text-style defaults a `text: "slots"` type declares on its doc
// definition (`ObjectDocDefinition.textSlotStyleDefaults`).
export type { ObjectTextSlotStyleDefaults } from "./plugin/ObjectTextStyleDefaultsRegistry";
export type { CanvasDocPlugin } from "./plugin/CanvasDocPlugin";
export type { ObjectDocValidateFn } from "./plugin/ObjectDocValidatorRegistry";
export type { SemanticDiagnostic } from "./model/types/SemanticDiagnostic";
export type { CanvasParser, CanvasParseResult } from "./parse";
export { createCanvasParser } from "./parse";
export { builtinObjectDocDefinitions } from "./plugin/builtinObjectDocDefinitions";
export {
	createDocOps,
	DocOperationError,
	type AddObjectEntry,
	type AddObjectParams,
	type AlignEdge,
	type AnchorHandleId,
	type ConnectParams,
	type DeleteObjectsResult,
	type DistributeAxis,
	type DocOps,
	type GetZOrderResult,
	type EdgeAnchorHandle,
	type EdgeAnchorSide,
	type InlineTextStyleParams,
	type ObjectFilter,
	type ObjectSummary,
	type ObjectTypeSummary,
	type Point,
	type Rect,
	type RemoveObjectsFromGroupResult,
	type ResizeObjectParams,
	type SetHeightModeParams,
	type SetInlineTextStyleEntry,
	type SetPointsEntry,
	type SetPositionEntry,
	type SetPositionParams,
	type SetRotationResult,
	type SetStyleResult,
	type SetTextEntry,
	type StyleParams,
	type UpdateConnectorEntry,
	type UpdateConnectorParams,
	type ZOrderPlacement,
} from "./ops";
