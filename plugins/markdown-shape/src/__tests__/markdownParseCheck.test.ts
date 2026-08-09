import { createParseCheckSuite } from "@jiscribe/canvas-sdk/testing";

import { markdownDocPlugin } from "../doc";

// Parse through a plugin-aware parser so this package's shape is known to
// parse-time structure/semantic validation (it does not live in the core
// built-in definitions). The headless `markdownDocPlugin` carries no React deps.
createParseCheckSuite({
	name: "markdown shape",
	plugin: markdownDocPlugin,
	sampleDoc: {
		version: 1,
		root: [
			{
				id: "doc-1",
				type: "markdown",
				x: 0,
				y: 0,
				width: 300,
				height: 200,
				rx: 8,
				text: "# Title\n\nBody with **bold**.",
			},
			{
				id: "task-1",
				type: "rect",
				x: 400,
				y: 0,
				width: 140,
				height: 80,
				text: "Order service",
			},
			{
				id: "c-1",
				type: "connector",
				source: { owner: { id: "doc-1" }, anchor: { kind: "center" } },
				target: { owner: { id: "task-1" }, anchor: { kind: "center" } },
				points: [],
			},
		],
	},
});
