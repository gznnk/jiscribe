import type { CanvasPlugin } from "@workspace/canvas";

import { containerDefinition } from "./definition";
import { containerParserExtension } from "./parser";

/**
 * `CanvasPlugin` declaration for the container shapes
 * (docs/05_extensibility/plugin-architecture-requirements.md §3). Hosts wire this
 * into both `createCanvasParser` and `<Canvas initialConfig>` via a single `plugins` array.
 */
export const containerPlugin: CanvasPlugin = {
	id: "container-shapes",
	objects: { container: containerDefinition },
	parser: [containerParserExtension],
};
