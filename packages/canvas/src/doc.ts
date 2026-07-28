// Headless (UI-independent) entry point — the stable API for parsing, validating,
// and programmatically building a CanvasDoc without any React / @emotion dependency.
//
// The root index.ts exports Canvas (a React component), so importing it pulls in
// react / @emotion / katex. Node-side consumers that only work with the doc model —
// the VSCode extension's DiagnosticProvider, the MCP server, Function Calling
// handlers — use this entry to keep those UI dependencies out of their bundle.
//
// The doc-ops are definition-driven: `createDocOps({ presetDefinitions?, plugins? })`
// resolves the same ObjectDocDefinition set as the parser, so `addObject(doc, type, …)`
// / `connect(…)` handle built-in and plugin types uniformly. They take already-typed
// params (no zod; tool-input validation is the adapter's responsibility) and reuse the
// same ObjectFactory as the canvas, producing correct ObjectDocs down to the style defaults.
//
// Import 例: `import { parseCanvasText, createDocOps } from "@workspace/canvas/doc";`
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
} from "./schemas/objects/types/TextSlot";
export {
	isTextSlot,
	TEXT_SLOT_STYLE_KEYS,
} from "./schemas/objects/types/TextSlot";
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
export {
	createCanvasParser,
	parseCanvasText,
} from "./schemas/canvas/validators";
export { builtinObjectDocDefinitions } from "./schemas/registry/builtinObjectDocDefinitions";
export {
	createDocOps,
	type DocOps,
	type AddObjectParams,
	type ConnectParams,
	type AnchorHandleId,
	DocOperationError,
} from "./docOps";
