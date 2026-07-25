// Headless (UI-independent) entry point — the stable API for parsing, validating,
// and programmatically building a CanvasDoc without any React / @emotion dependency.
//
// The root index.ts exports Canvas (a React component), so importing it pulls in
// react / @emotion / katex. Node-side consumers that only work with the doc model —
// the VSCode extension's DiagnosticProvider, the MCP server, Function Calling
// handlers — use this entry to keep those UI dependencies out of their bundle.
//
// The doc-ops each take already-typed params (no zod; tool-input validation is the
// adapter's responsibility) and reuse the same ObjectFactory as the canvas, so they
// produce correct ObjectDocs down to the style defaults.
//
// Import 例: `import { parseCanvasText, addRect } from "@workspace/canvas/doc";`
export type { CanvasDoc } from "./schemas/canvas/CanvasDoc";
export type { ObjectDoc } from "./schemas/objects/base/ObjectDoc";
export type { ObjectType } from "./schemas/objects/types/ObjectType";
export type { ObjectFeatures } from "./schemas/objects/types/ObjectFeatures";
export type { CreateObjectType } from "./schemas/objects/types/CreateObjectType";
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
	addRect,
	type AddRectParams,
	addEllipse,
	type AddEllipseParams,
	connect,
	type ConnectParams,
	type AnchorHandleId,
	DocOperationError,
} from "./docOps";
