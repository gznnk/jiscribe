import type { CanvasPlugin } from "@jiscribe/canvas";

import {
	cardDefinition,
	crossDefinition,
	dbDefinition,
	delayDefinition,
	diamondDefinition,
	displayDefinition,
	documentDefinition,
	extractDefinition,
	hexagonDefinition,
	loopLimitDefinition,
	manualInputDefinition,
	multiDocumentDefinition,
	offPageConnectorDefinition,
	parallelogramDefinition,
	stadiumDefinition,
	storedDataDefinition,
	subroutineDefinition,
	trapezoidDefinition,
} from "./definitions";

/**
 * `CanvasPlugin` declaration for the flowchart shapes
 * (packages/canvas/docs/12-plugin-architecture.md). Hosts wire this
 * into `<Canvas initialConfig>` via `plugins`; `objects` also feeds
 * `createCanvasParser` since each definition extends `ObjectDocDefinition`. The
 * headless (Node-side) parse entry is `flowchartDocPlugin` in `./doc`.
 */
export const flowchartPlugin: CanvasPlugin = {
	id: "flowchart-shapes",
	objects: {
		card: cardDefinition,
		cross: crossDefinition,
		db: dbDefinition,
		delay: delayDefinition,
		diamond: diamondDefinition,
		display: displayDefinition,
		document: documentDefinition,
		extract: extractDefinition,
		hexagon: hexagonDefinition,
		loopLimit: loopLimitDefinition,
		manualInput: manualInputDefinition,
		multiDocument: multiDocumentDefinition,
		offPageConnector: offPageConnectorDefinition,
		parallelogram: parallelogramDefinition,
		stadium: stadiumDefinition,
		storedData: storedDataDefinition,
		subroutine: subroutineDefinition,
		trapezoid: trapezoidDefinition,
	},
};
