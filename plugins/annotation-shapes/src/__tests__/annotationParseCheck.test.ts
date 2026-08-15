import { createParseCheckSuite } from "@jiscribe/canvas-sdk/testing";

import { annotationDocPlugin } from "../doc";

// Parse through a plugin-aware parser so this package's shapes are known to
// parse-time structure/semantic validation (they do not live in the core
// built-in definitions). The headless `annotationDocPlugin` carries no React deps.
createParseCheckSuite({
	name: "annotation shapes",
	plugin: annotationDocPlugin,
	sampleDoc: {
		version: 1,
		root: [
			{
				id: "brace-1",
				type: "brace",
				x: 0,
				y: 0,
				width: 24,
				height: 160,
				direction: "left",
				tipPosition: 0.5,
				text: "doc layer",
			},
			{
				id: "bracket-1",
				type: "bracket",
				x: 0,
				y: 200,
				width: 24,
				height: 160,
				direction: "left",
				text: "state layer",
			},
			{
				id: "bracket-with-stem-1",
				type: "bracketWithStem",
				x: 0,
				y: 400,
				width: 24,
				height: 160,
				direction: "left",
				tipPosition: 0.25,
				text: "presentation layer",
			},
			{
				id: "callout-1",
				type: "callout",
				x: 260,
				y: 160,
				width: 160,
				height: 110,
				tail: { side: "bottom", position: 0.2 },
				text: "pointed at by the tail",
			},
			{
				id: "note-1",
				type: "note",
				x: 260,
				y: 0,
				width: 180,
				height: 110,
				text: "parsing drops it silently",
			},
			{
				id: "task-1",
				type: "rect",
				x: 60,
				y: 0,
				width: 140,
				height: 80,
				text: "Parser",
			},
			{
				id: "c-1",
				type: "connector",
				source: { owner: { id: "brace-1" }, anchor: { kind: "center" } },
				target: { owner: { id: "task-1" }, anchor: { kind: "center" } },
				points: [],
			},
		],
	},
});
