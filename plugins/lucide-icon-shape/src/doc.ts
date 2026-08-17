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

import { ICON_DOC_DEFAULTS, IconFeatures } from "./schema/IconDoc";
import { validateIconName } from "./schema/validateIconName";

export const lucideIconDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: IconFeatures,
		defaults: ICON_DOC_DEFAULTS,
		description:
			'A named pictogram from the bundled Lucide icon set, drawn as line art. Decoration, not a node: it holds no text and cannot be a connector endpoint, so place it beside the shape it marks (a rect, a container header, a sticky) and connect arrows to that shape instead. For a picture that is itself a node, use a labelled pictogram such as "server", "package" or "db". The drawing is scaled uniformly to the smaller side of the box and centred, so keep the box square (the 64x64 default) unless margin is wanted. `stroke` is the icon\'s own color and `strokeWidth` its line weight, both honoured at any size.',
		summary: "decorative Lucide icon (no text, not connectable)",
		outlineDescription: "Line-art pictogram, centred in a square box",
		// An icon is placed at its default size and resized afterwards; drag-drawing a
		// box only to have the icon centre itself in the smaller side reads as a bug.
		supportsBounds: false,
		validateExtra: validateIconName,
	});

/**
 * Headless `CanvasDocPlugin` for the icon shape: the doc-layer view of `lucideIconPlugin`,
 * teaching `createCanvasParser` the type without loading any React / presentation code.
 */
export const lucideIconDocPlugin: CanvasDocPlugin = {
	id: "lucide-icon",
	objects: { lucideIcon: lucideIconDocDefinition },
};
