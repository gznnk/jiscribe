import type { CanvasPlugin } from "@jiscribe/canvas";

import {
	braceDefinition,
	bracketDefinition,
	bracketWithStemDefinition,
	calloutDefinition,
	noteDefinition,
} from "./definitions";

/**
 * `CanvasPlugin` declaration for the annotation shapes
 * (docs/05_extensibility/plugin-architecture-requirements.md §3). Hosts wire this
 * into `<Canvas initialConfig>` via `plugins`; `objects` also feeds
 * `createCanvasParser` since the definition extends `ObjectDocDefinition`. The
 * headless (Node-side) parse entry is `annotationDocPlugin` in `./doc`.
 */
export const annotationPlugin: CanvasPlugin = {
	id: "annotation-shapes",
	objects: {
		brace: braceDefinition,
		bracket: bracketDefinition,
		bracketWithStem: bracketWithStemDefinition,
		callout: calloutDefinition,
		note: noteDefinition,
	},
};
