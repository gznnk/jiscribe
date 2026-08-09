import type { CanvasPlugin } from "@jiscribe/canvas";

import { markdownDefinition } from "./definition";

/**
 * `CanvasPlugin` declaration for the markdown shape
 * (packages/canvas/docs/12-plugin-architecture.md). Hosts wire this
 * into `<Canvas initialConfig>` via `plugins`; `objects` also feeds
 * `createCanvasParser` since the definition extends `ObjectDocDefinition`. The
 * headless (Node-side) parse entry is `markdownDocPlugin` in `./doc`.
 *
 * The host is responsible for loading `katex/dist/katex.min.css` — math is
 * rendered into the shape's HTML by KaTeX, which ships its styles separately.
 */
export const markdownPlugin: CanvasPlugin = {
	id: "markdown-shape",
	objects: { markdown: markdownDefinition },
};
