import type { CanvasPlugin } from "@workspace/canvas";

import { actorDefinition } from "./definition";

/**
 * `CanvasPlugin` declaration for the general shapes
 * (docs/05_extensibility/plugin-architecture-requirements.md §3). Hosts wire this
 * into `<Canvas initialConfig>` via `plugins`; `objects` also feeds
 * `createCanvasParser` since the definition extends `ObjectDocDefinition`. The
 * headless (Node-side) parse entry is `generalDocPlugin` in `./doc`.
 */
export const generalPlugin: CanvasPlugin = {
	id: "general-shapes",
	objects: { actor: actorDefinition },
};
