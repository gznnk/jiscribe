import type { CanvasPlugin } from "@workspace/canvas";

import {
	actorDefinition,
	browserWindowDefinition,
	cloudDefinition,
	envelopeDefinition,
	fileDefinition,
	folderDefinition,
	gearDefinition,
	laptopDefinition,
	lockDefinition,
	packageDefinition,
	queueDefinition,
	serverDefinition,
	shieldDefinition,
	smartphoneDefinition,
	terminalWindowDefinition,
} from "./definition";

/**
 * `CanvasPlugin` declaration for the general shapes
 * (docs/05_extensibility/plugin-architecture-requirements.md §3). Hosts wire this
 * into `<Canvas initialConfig>` via `plugins`; `objects` also feeds
 * `createCanvasParser` since the definition extends `ObjectDocDefinition`. The
 * headless (Node-side) parse entry is `generalDocPlugin` in `./doc`.
 */
export const generalPlugin: CanvasPlugin = {
	id: "general-shapes",
	objects: {
		actor: actorDefinition,
		browserWindow: browserWindowDefinition,
		cloud: cloudDefinition,
		envelope: envelopeDefinition,
		file: fileDefinition,
		folder: folderDefinition,
		gear: gearDefinition,
		laptop: laptopDefinition,
		lock: lockDefinition,
		package: packageDefinition,
		queue: queueDefinition,
		server: serverDefinition,
		shield: shieldDefinition,
		smartphone: smartphoneDefinition,
		terminalWindow: terminalWindowDefinition,
	},
};
