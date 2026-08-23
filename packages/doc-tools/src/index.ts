// Headless checking, measuring and diagnosing of jiscribe documents: the core the
// CLI (@jiscribe/cli) and the MCP servers are thin mouths on. Node-only and free of
// React and the DOM — it reaches the canvas through ./doc and ./unstable-doc alone,
// and supplies the text measurement a browser would have taken from a canvas by
// reading the very font files @jiscribe/canvas ships (measure/nodeTextMeasurer.ts).
//
// e.g. `import { validateDoc, diagnoseDoc } from "@jiscribe/doc-tools";`
export type { Diagnostic, DiagnosticSeverity } from "./Diagnostic";

export { validateDoc } from "./validateDoc";
export type { ValidateDocResult } from "./validateDoc";

export { measureWrappedText } from "./measureWrappedText";
export type { TextMeasureFont, WrappedTextMetrics } from "./measureWrappedText";

export { resolveContentBox } from "./resolveContentBox";
export type {
	ContentBoxResolution,
	ContentBoxShape,
} from "./resolveContentBox";

export { diagnoseDoc } from "./diagnoseDoc";

// The shape set everything above is defined against is @jiscribe/standard-shapes/doc.
// A host composing its own parser takes `standardDocPlugins` from there, and validates
// against the same types the official schema was generated from.

// Only for a host driving the document layer's measurement itself (a Node process
// deriving heights through its own createDocOps, say); every entry point above
// offers this before it measures.
export { nodeTextMeasurement } from "./measure/nodeTextMeasurer";
