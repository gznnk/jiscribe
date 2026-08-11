import type { CanvasPlugin } from "@jiscribe/canvas";

import {
	recordDefinition,
	umlComponentDefinition,
	umlPackageDefinition,
} from "./definition";

/**
 * `CanvasPlugin` declaration for the UML shapes
 * (packages/canvas/docs/12-plugin-architecture.md). Hosts wire this
 * into `<Canvas initialConfig>` via `plugins`; `objects` also feeds
 * `createCanvasParser` since the definition extends `ObjectDocDefinition`. The
 * headless (Node-side) parse entry is `umlDocPlugin` in `./doc`.
 */
export const umlPlugin: CanvasPlugin = {
	id: "uml-shapes",
	objects: {
		record: recordDefinition,
		umlPackage: umlPackageDefinition,
		umlComponent: umlComponentDefinition,
	},
};
