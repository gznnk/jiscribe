import type { CanvasPlugin } from "@jiscribe/canvas";

import {
	actorDefinition,
	botDefinition,
	browserWindowDefinition,
	clockDefinition,
	cloudDefinition,
	envelopeDefinition,
	fileDefinition,
	folderDefinition,
	gearDefinition,
	laptopDefinition,
	lightningDefinition,
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
 * (packages/canvas/docs/12-plugin-architecture.md). Hosts wire this
 * into `<Canvas initialConfig>` via `plugins`; `objects` also feeds
 * `createCanvasParser` since the definition extends `ObjectDocDefinition`. The
 * headless (Node-side) parse entry is `generalDocPlugin` in `./doc`.
 */
export const generalPlugin: CanvasPlugin = {
	id: "general-shapes",
	objects: {
		actor: actorDefinition,
		bot: botDefinition,
		browserWindow: browserWindowDefinition,
		clock: clockDefinition,
		cloud: cloudDefinition,
		envelope: envelopeDefinition,
		file: fileDefinition,
		folder: folderDefinition,
		gear: gearDefinition,
		laptop: laptopDefinition,
		lightning: lightningDefinition,
		lock: lockDefinition,
		package: packageDefinition,
		queue: queueDefinition,
		server: serverDefinition,
		shield: shieldDefinition,
		smartphone: smartphoneDefinition,
		terminalWindow: terminalWindowDefinition,
	},
};
