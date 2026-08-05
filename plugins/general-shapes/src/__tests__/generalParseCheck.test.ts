import { createParseCheckSuite } from "@workspace/canvas-sdk/testing";

import { generalDocPlugin } from "../doc";

// Parse through a plugin-aware parser so this package's shapes are known to
// parse-time structure/semantic validation (they no longer live in the core
// built-in definitions). The headless `generalDocPlugin` carries no React deps.
createParseCheckSuite({
	name: "general shapes",
	plugin: generalDocPlugin,
	sampleDoc: {
		version: 1,
		root: [
			{
				id: "user-1",
				type: "actor",
				x: 0,
				y: 0,
				width: 80,
				height: 100,
				text: "Customer",
			},
			{
				id: "internet-1",
				type: "cloud",
				x: 0,
				y: 200,
				width: 160,
				height: 100,
				text: "Internet",
			},
			{
				id: "system-1",
				type: "rect",
				x: 240,
				y: 0,
				width: 140,
				height: 80,
				text: "Order service",
			},
			{
				id: "c-1",
				type: "connector",
				source: { owner: { id: "user-1" }, anchor: { kind: "center" } },
				target: { owner: { id: "system-1" }, anchor: { kind: "center" } },
				points: [],
			},
			{
				id: "c-2",
				type: "connector",
				source: { owner: { id: "internet-1" }, anchor: { kind: "center" } },
				target: { owner: { id: "system-1" }, anchor: { kind: "center" } },
				points: [],
			},
		],
	},
	// Every type this package registers, so a new one cannot be added unparsed.
	checkEveryRegisteredType: true,
});
