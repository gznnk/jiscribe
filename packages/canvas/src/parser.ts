// Parser-only entry point.
//
// The root index.ts exports Canvas (a React component), so importing it pulls UI
// dependencies such as react / @emotion / katex into the bundle. Consumers that only
// want to parse text into a CanvasDoc — like the Node side of the VSCode extension
// (DiagnosticProvider) — can use this entry to avoid bringing in those UI dependencies.
//
// Import example: `import { parseCanvasText } from "@workspace/canvas/parser";`
//
// parseCanvasText lazily initializes the objectDocValidatorRegistry needed for
// validation on demand, so no initialization is required on this entry side.
export type { CanvasDoc } from "./schemas/canvas/CanvasDoc";
export { parseCanvasText } from "./schemas/canvas/validators";
export type {
	CanvasParseResult,
	SemanticDiagnostic,
} from "./schemas/canvas/validators";
