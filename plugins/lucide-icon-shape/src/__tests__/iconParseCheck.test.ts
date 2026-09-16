import { createParseCheckSuite } from "@jiscribe/canvas-sdk/testing";

import { lucideIconDocPlugin } from "../doc";

// Parse through a plugin-aware parser so this package's shape is known to
// parse-time structure/semantic validation (it no longer lives in the core
// built-in definitions). The headless `lucideIconDocPlugin` carries no React deps.
//
// One connector ends on the icon: the core semantic pass reads `connectable` off
// the plugin's features, so an endpoint naming the icon has to survive it.
createParseCheckSuite({
	name: "icon shape",
	plugin: lucideIconDocPlugin,
	sampleDoc: {
		version: 1,
		root: [
			{
				id: "lock-1",
				type: "lucideIcon",
				x: 0,
				y: 0,
				width: 64,
				height: 64,
				icon: "lock",
			},
			{
				id: "task-1",
				type: "rect",
				x: 100,
				y: 0,
				width: 140,
				height: 80,
				text: "Order service",
			},
			{
				id: "task-2",
				type: "rect",
				x: 300,
				y: 0,
				width: 140,
				height: 80,
				text: "Payment service",
			},
			{
				id: "c-1",
				type: "connector",
				source: { owner: { id: "task-1" }, anchor: { kind: "center" } },
				target: { owner: { id: "task-2" }, anchor: { kind: "center" } },
				points: [],
			},
			{
				id: "c-2",
				type: "connector",
				source: { owner: { id: "lock-1" }, anchor: { kind: "center" } },
				target: {
					owner: { id: "task-1" },
					anchor: { kind: "connectPoint", id: "leftCenter" },
				},
				points: [],
			},
		],
	},
	accepts: [
		{
			name: "accepts an omitted icon, falling back to the default",
			doc: {
				version: 1,
				root: [
					{ id: "i-1", type: "lucideIcon", x: 0, y: 0, width: 64, height: 64 },
				],
			},
		},
		{
			name: "accepts a superseded name and another spelling of one",
			doc: {
				version: 1,
				root: [
					{
						id: "i-1",
						type: "lucideIcon",
						x: 0,
						y: 0,
						width: 64,
						height: 64,
						icon: "user-circle",
					},
					{
						id: "i-2",
						type: "lucideIcon",
						x: 80,
						y: 0,
						width: 64,
						height: 64,
						icon: "fileText",
					},
				],
			},
		},
	],
	rejects: [
		{
			name: "rejects a name no icon answers to",
			doc: {
				version: 1,
				root: [
					{
						id: "i-1",
						type: "lucideIcon",
						x: 0,
						y: 0,
						width: 64,
						height: 64,
						icon: "definitely-not-an-icon",
					},
				],
			},
			diagnosticPaths: ["root[0].icon"],
		},
		{
			name: "rejects a non-string name",
			doc: {
				version: 1,
				root: [
					{
						id: "i-1",
						type: "lucideIcon",
						x: 0,
						y: 0,
						width: 64,
						height: 64,
						icon: 42,
					},
				],
			},
			diagnosticPaths: ["root[0].icon"],
		},
	],
});
