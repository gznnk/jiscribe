import type { CanvasPlugin } from "@workspace/canvas";

import { containerDefinition } from "./definition";

/**
 * `CanvasPlugin` declaration for the container shapes
 * (docs/05_extensibility/plugin-architecture-requirements.md §3). Hosts wire this
 * into `<Canvas initialConfig>` via `plugins`; `objects` also feeds
 * `createCanvasParser` since the definition extends `ObjectDocDefinition`. The
 * headless (Node-side) parse entry is `containerDocPlugin` in `./doc`.
 */
export const containerPlugin: CanvasPlugin = {
	id: "container-shapes",
	objects: { container: containerDefinition },
};
