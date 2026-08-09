import { createParseCheckSuite } from "@jiscribe/canvas-sdk/testing";

import { stickyDocPlugin } from "../doc";

// Parse through a plugin-aware parser so this package's shape is known to
// parse-time structure/semantic validation (it no longer lives in the core
// built-in definitions). The headless `stickyDocPlugin` carries no React deps.
createParseCheckSuite({
	name: "sticky shape",
	plugin: stickyDocPlugin,
	sampleDoc: {
		version: 1,
		root: [
			{
				id: "note-1",
				type: "sticky",
				x: 0,
				y: 0,
				width: 200,
				height: 150,
				fill: "#fef9c3",
				text: "外から編集できる",
			},
			{
				id: "task-1",
				type: "rect",
				x: 300,
				y: 0,
				width: 140,
				height: 80,
				text: "Order service",
			},
			{
				id: "c-1",
				type: "connector",
				source: { owner: { id: "note-1" }, anchor: { kind: "center" } },
				target: { owner: { id: "task-1" }, anchor: { kind: "center" } },
				points: [],
			},
		],
	},
});
