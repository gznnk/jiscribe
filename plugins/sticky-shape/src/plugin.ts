import type { CanvasPlugin } from "@workspace/canvas";

import { stickyDefinition } from "./definition";

/**
 * `CanvasPlugin` declaration for the sticky shape
 * (docs/05_extensibility/plugin-architecture-requirements.md §3). Hosts wire this
 * into `<Canvas initialConfig>` via `plugins`; `objects` also feeds
 * `createCanvasParser` since the definition extends `ObjectDocDefinition`. The
 * headless (Node-side) parse entry is `stickyDocPlugin` in `./doc`.
 */
export const stickyPlugin: CanvasPlugin = {
	id: "sticky-shape",
	objects: { sticky: stickyDefinition },
};
