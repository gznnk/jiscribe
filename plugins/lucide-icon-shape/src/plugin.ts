import type { CanvasPlugin } from "@jiscribe/canvas";

import { lucideIconDefinition } from "./definition";

/**
 * `CanvasPlugin` declaration for the icon shape
 * (packages/canvas/docs/12-plugin-architecture.md). Hosts wire this into
 * `<Canvas initialConfig>` via `plugins`; `objects` also feeds `createCanvasParser`
 * since the definition extends `ObjectDocDefinition`. The headless (Node-side) parse
 * entry is `lucideIconDocPlugin` in `./doc`.
 */
export const lucideIconPlugin: CanvasPlugin = {
	id: "lucide-icon",
	objects: { lucideIcon: lucideIconDefinition },
};
