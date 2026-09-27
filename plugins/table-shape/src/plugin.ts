import type { CanvasPlugin } from "@jiscribe/canvas";

import { tableDefinition } from "./definition";

/**
 * `CanvasPlugin` declaration for the table shape
 * (packages/canvas/docs/12-plugin-architecture.md). Hosts wire this into
 * `<Canvas initialConfig>` via `plugins`; `objects` also feeds
 * `createCanvasParser` since the definition extends `ObjectDocDefinition`. The
 * headless (Node-side) parse entry is `tableDocPlugin` in `./doc`.
 */
export const tablePlugin: CanvasPlugin = {
	id: "table-shape",
	objects: { table: tableDefinition },
};
