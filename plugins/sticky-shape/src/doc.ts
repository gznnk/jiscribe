// Headless (UI-independent) entry point. It mirrors the canvas package's own ./doc: an
// entry point for consumers that want to take part in parse-time validation without going
// through definition.ts (which pulls in React components) — the MCP server, the Node-side
// diagnostics of the VSCode extension, and the like. It imports only ./schema/** and
// @jiscribe/doc / @jiscribe/canvas-sdk/doc, and never pulls in
// presentation / state / stencil / menu.
import { createFrameObjectDoc } from "@jiscribe/canvas-sdk/doc";
import type { CanvasDocPlugin, ObjectDocDefinition } from "@jiscribe/doc";

import { STICKY_DOC_DEFAULTS, StickyFeatures } from "./schema/StickyDoc";

export const stickyDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: StickyFeatures,
	defaults: STICKY_DOC_DEFAULTS,
	description: "Sticky note annotation.",
	summary: "sticky note (no stroke or `rx`)",
	// Stickies are only center-placed on click (no bounds drawing).
	supportsBounds: false,
});

/**
 * Headless `CanvasDocPlugin` for the sticky shape: the doc-layer view of
 * `stickyPlugin`, teaching `createCanvasParser` the type without loading any
 * React / presentation code.
 */
export const stickyDocPlugin: CanvasDocPlugin = {
	id: "sticky-shape",
	objects: { sticky: stickyDocDefinition },
};
