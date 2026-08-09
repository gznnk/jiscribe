import type { CanvasPlugin } from "@jiscribe/canvas";

import { containerDefinition } from "./definition";

/**
 * `CanvasPlugin` declaration for the container shapes
 * (packages/canvas/docs/12-plugin-architecture.md). Hosts wire this
 * into `<Canvas initialConfig>` via `plugins`; `objects` also feeds
 * `createCanvasParser` since the definition extends `ObjectDocDefinition`. The
 * headless (Node-side) parse entry is `containerDocPlugin` in `./doc`.
 */
export const containerPlugin: CanvasPlugin = {
	id: "container-shapes",
	objects: { container: containerDefinition },
};
