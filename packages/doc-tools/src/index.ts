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

export { contentBox } from "./contentBox";
export { calcContentInset } from "./contentInsets";
export type { ContentInset } from "./contentInsets";

export { diagnoseDoc } from "./diagnoseDoc";

// The shape set the two above are defined against, exposed so a host composing its
// own parser validates against the same types the official schema was generated from.
export {
	SHIPPED_DOC_PLUGINS,
	shippedObjectDocDefinitions,
} from "./shippedDocPlugins";

// Only for a host driving @jiscribe/canvas measurement itself; every entry point
// above installs the measurer before it measures.
export { installNodeTextMeasurer } from "./measure/nodeTextMeasurer";
