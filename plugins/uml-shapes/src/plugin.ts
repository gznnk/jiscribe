import type { CanvasPlugin } from "@workspace/canvas";

import { recordDefinition } from "./definition";

/**
 * `CanvasPlugin` declaration for the UML shapes
 * (docs/05_extensibility/plugin-architecture-requirements.md §3). Hosts wire this
 * into `<Canvas initialConfig>` via `plugins`; `objects` also feeds
 * `createCanvasParser` since the definition extends `ObjectDocDefinition`. The
 * headless (Node-side) parse entry is `umlDocPlugin` in `./doc`.
 */
export const umlPlugin: CanvasPlugin = {
	id: "uml-shapes",
	objects: { record: recordDefinition },
};
