// Headless (UI-independent) entry point — the stable API for parsing, validating,
// and programmatically building and editing a CanvasDoc without any React / @emotion
// dependency.
//
// The root index.ts exports Canvas (a React component), so importing it pulls in
// react / @emotion / katex. Node-side consumers that only work with the doc model —
// the VSCode extension's DiagnosticProvider, the MCP server, Function Calling
// handlers — use this entry to keep those UI dependencies out of their bundle.
//
// The doc-ops are definition-driven: `createDocOps({ presetDefinitions?, plugins? })`
// resolves the same ObjectDocDefinition set as the parser. `create` is the factory prefix
// (as in createCanvasParser) — the DocOps it returns covers the whole edit vocabulary, not
// only creation: building (`addObject` / `connect`) and reworking what is already there
// (delete / move / resize / rotate / reshape / restack / style / retext / re-route /
// align / group) handle built-in and plugin types uniformly, following each type's
// `features`.
// They take already-typed params (no zod; tool-input validation is the
// adapter's responsibility) and reuse the same ObjectFactory as the canvas, producing
// correct ObjectDocs down to the style defaults. Every editing op mutates the doc in place
// and checks its arguments first, so a call that throws leaves the doc untouched.
//
// e.g. `import { createCanvasParser, createDocOps } from "@jiscribe/canvas/doc";`
export type { CanvasDoc } from "./schemas/canvas/CanvasDoc";
export type { ObjectDoc } from "./schemas/objects/base/ObjectDoc";
export type { ObjectType } from "./schemas/objects/types/ObjectType";
export type { ObjectFeatures } from "./schemas/objects/types/ObjectFeatures";
export type { CreateObjectType } from "./schemas/objects/types/CreateObjectType";
// A text slot is the unit of text in both layers, so a type that spells out its
// own slots (features.text: "slots") declares them with this in its Doc and reuses
// the very same values in its State.
export type {
	TextSlot,
	TextSlotContent,
	TextSlotStyle,
} from "./schemas/objects/types/TextSlot";
export {
	isTextRows,
	isTextSlot,
	resolveTextSlotStyle,
	TEXT_BLOCK_STYLE_KEYS,
	TEXT_SLOT_STYLE_KEYS,
} from "./schemas/objects/types/TextSlot";
// One body of a slot's text: the plain string it is until part of it is styled on
// its own, and the runs it is written as once it is.
export type {
	InlineTextStyle,
	RichText,
	TextRun,
} from "./schemas/objects/types/RichText";
export {
	isRichText,
	isTextRun,
	normalizeRichText,
	remapRichText,
	richTextToPlain,
	sliceRichText,
	styleRichTextRange,
	TEXT_INLINE_STYLE_KEYS,
} from "./schemas/objects/types/RichText";
export type {
	ExtraStylePropertyDescriptor,
	StyleValueType,
} from "./schemas/objects/types/ExtraStyleProperty";
export type { ObjectDocDefinition } from "./schemas/plugin/ObjectDocDefinition";
export type { CanvasDocPlugin } from "./schemas/plugin/CanvasDocPlugin";
export type { ObjectDocValidateFn } from "./schemas/registry/ObjectDocValidatorRegistry";
export type {
	CanvasParser,
	CanvasParseResult,
	SemanticDiagnostic,
} from "./schemas/canvas/validators";
export { createCanvasParser } from "./schemas/canvas/validators";
export { builtinObjectDocDefinitions } from "./schemas/registry/builtinObjectDocDefinitions";
export {
	createDocOps,
	type DocOps,
	type AddObjectParams,
	type AlignEdge,
	type ConnectParams,
	type AnchorHandleId,
	type DeleteObjectsResult,
	type DistributeAxis,
	type EdgeAnchorHandle,
	type EdgeAnchorSide,
	type RemoveFromGroupResult,
	type MoveObjectParams,
	type Point,
	type Rect,
	type ResizeObjectParams,
	type SetRotationResult,
	type SetStyleResult,
	type StyleParams,
	type StyleTextParams,
	type UpdateConnectorParams,
	type ZOrderPlacement,
	DocOperationError,
} from "./docOps";
