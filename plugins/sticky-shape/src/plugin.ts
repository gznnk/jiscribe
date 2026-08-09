import type { CanvasPlugin } from "@jiscribe/canvas";

import { stickyDefinition } from "./definition";

/**
 * `CanvasPlugin` declaration for the sticky shape
 * (packages/canvas/docs/12-plugin-architecture.md). Hosts wire this
 * into `<Canvas initialConfig>` via `plugins`; `objects` also feeds
 * `createCanvasParser` since the definition extends `ObjectDocDefinition`. The
 * headless (Node-side) parse entry is `stickyDocPlugin` in `./doc`.
 */
export const stickyPlugin: CanvasPlugin = {
	id: "sticky-shape",
	objects: { sticky: stickyDefinition },
};
