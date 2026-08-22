// Headless (UI-independent) entry point. It mirrors the canvas package's own ./doc: an
// entry point for consumers that want to take part in parse-time validation without going
// through definition.ts (which pulls in React components) — the MCP server, the Node-side
// diagnostics of the VSCode extension, and the like. It imports only ./schema/** and
// @jiscribe/doc / @jiscribe/canvas-sdk/doc, and never pulls in
// presentation / state / stencil.
import { createFrameObjectDoc } from "@jiscribe/canvas-sdk/doc";
import type { CanvasDocPlugin, ObjectDocDefinition } from "@jiscribe/doc";
import { calcFullBoxTextRegion } from "@jiscribe/doc";

import { MARKDOWN_DOC_DEFAULTS, MarkdownFeatures } from "./schema/MarkdownDoc";

export const markdownDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: MarkdownFeatures,
	defaults: MARKDOWN_DOC_DEFAULTS,
	textRegion: calcFullBoxTextRegion,
	// The body is rendered Markdown, not the wrapped plain text the shared layout
	// measures, so a height derived from that measurement is not the one it draws
	// at — headings, lists and code blocks all take a size of their own.
	autoHeight: false,
	// The schema $def is a handwritten template (nearly every property description
	// is Markdown-specific), so only summary is consumed — it fills the generated
	// doc tables.
	summary: "Markdown-rendered document card",
});

/**
 * Headless `CanvasDocPlugin` for the markdown shape: the doc-layer view of
 * `markdownPlugin`, teaching `createCanvasParser` the type without loading any
 * React / presentation code — which also keeps markdown-it / KaTeX out of the
 * Node-side bundle, since only the presentation renders Markdown.
 */
export const markdownDocPlugin: CanvasDocPlugin = {
	id: "markdown-shape",
	objects: { markdown: markdownDocDefinition },
};
