// Headless (UI-independent) entry point. It mirrors the canvas package's own ./doc: an
// entry point for consumers that want to take part in parse-time validation without going
// through definition.ts (which pulls in React components) — the MCP server, the Node-side
// diagnostics of the VSCode extension, and the like. It imports only ./schema/** and
// @jiscribe/doc / @jiscribe/canvas-sdk/doc, and never pulls in
// presentation / state / stencil.
import { createFrameObjectDoc } from "@jiscribe/canvas-sdk/doc";
import type { CanvasDocPlugin, ObjectDocDefinition } from "@jiscribe/doc";

import { COMMON_ICON_GROUPS } from "./schema/icon/commonIconNames";
import type { IconDoc } from "./schema/IconDoc";
import { ICON_DOC_DEFAULTS, IconFeatures } from "./schema/IconDoc";
import { validateIconName } from "./schema/validateIconName";

export const lucideIconDocDefinition: ObjectDocDefinition =
	createFrameObjectDoc({
		features: IconFeatures,
		defaults: ICON_DOC_DEFAULTS,
		extraKeys: ["icon"] satisfies readonly (keyof IconDoc)[],
		description:
			'A named pictogram from the bundled Lucide icon set, drawn as line art. It holds no text of its own, so a label goes in a neighbouring shape (a rect, a container header, a sticky) or use a labelled pictogram such as "server", "package" or "db" instead. A connector endpoint may name it; the endpoint meets its box, not the drawn silhouette. The drawing is scaled uniformly to the smaller side of the box and centred, so keep the box square (the 64x64 default) unless margin is wanted. `stroke` is the icon\'s own color and `strokeWidth` its line weight, both honoured at any size.',
		summary: "Lucide icon (line-art pictogram, no text of its own)",
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

/**
 * The icons the generated JSON schema names as a starting point. Re-exported from the
 * headless entry because the docs generator reads it and must not pull in any React.
 */
export { COMMON_ICON_GROUPS };
