// Headless (UI-independent) entry point. It mirrors the canvas package's own ./doc: an
// entry point for consumers that want to take part in parse-time validation without going
// through definition.ts (which pulls in React components) — the MCP server, the Node-side
// diagnostics of the VSCode extension, and the like. It imports only ./schema/** and
// @jiscribe/canvas/doc / @jiscribe/canvas-sdk/doc, and never pulls in
// presentation / state / stencil.
import type {
	CanvasDocPlugin,
	ObjectDocDefinition,
} from "@jiscribe/canvas/doc";
import { createFrameObjectDoc } from "@jiscribe/canvas-sdk/doc";

import { RECORD_DOC_DEFAULTS, RecordFeatures } from "./schema/RecordDoc";
import { validateRecordTextFields } from "./schema/validateRecordTextFields";

export const recordDocDefinition: ObjectDocDefinition = createFrameObjectDoc({
	features: RecordFeatures,
	defaults: RECORD_DOC_DEFAULTS,
	// The schema $def is a handwritten template (text is a slotted object), so
	// only summary is consumed — it fills the generated doc tables.
	summary: "titled box + row compartments (UML class / ER entity)",
	validateExtra: validateRecordTextFields,
});

/**
 * Headless `CanvasDocPlugin` for the UML shapes: the doc-layer view of
 * `umlPlugin`, teaching `createCanvasParser` the types without loading any
 * React / presentation code (packages/canvas/docs/12-plugin-architecture.md).
 */
export const umlDocPlugin: CanvasDocPlugin = {
	id: "uml-shapes",
	objects: { record: recordDocDefinition },
};
