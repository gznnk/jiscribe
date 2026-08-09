import type { ParseCheckDoc } from "@jiscribe/canvas-sdk/testing";
import { createParseCheckSuite } from "@jiscribe/canvas-sdk/testing";

import { flowchartDocPlugin } from "../doc";

/** The two marker shapes, whose text is drawn as a label below the box. */
const markerDoc = (extra: Record<string, unknown>): ParseCheckDoc => ({
	version: 1,
	root: [
		{ id: "x-1", type: "cross", x: 0, y: 0, width: 100, height: 100, ...extra },
		{
			id: "e-1",
			type: "extract",
			x: 200,
			y: 0,
			width: 120,
			height: 100,
			...extra,
		},
	],
});

// Parse through a plugin-aware parser so the flowchart shapes are known to
// parse-time structure/semantic validation (they no longer live in the core
// built-in definitions). The headless `flowchartDocPlugin` carries no React deps.
createParseCheckSuite({
	name: "new flowchart shapes (multiDocument / storedData / loopLimit)",
	plugin: flowchartDocPlugin,
	sampleDoc: {
		version: 1,
		root: [
			{
				id: "md-1",
				type: "multiDocument",
				x: 0,
				y: 0,
				width: 140,
				height: 100,
				text: "reports",
			},
			{
				id: "sd-1",
				type: "storedData",
				x: 200,
				y: 0,
				width: 140,
				height: 80,
				text: "cache",
			},
			{
				id: "ll-1",
				type: "loopLimit",
				x: 400,
				y: 0,
				width: 140,
				height: 80,
				text: "for each",
			},
			{
				id: "ll-2",
				type: "loopLimit",
				x: 400,
				y: 200,
				width: 140,
				height: 80,
				text: "end loop",
				flipY: true,
			},
			{
				id: "c-1",
				type: "connector",
				source: { owner: { id: "md-1" }, anchor: { kind: "center" } },
				target: { owner: { id: "sd-1" }, anchor: { kind: "center" } },
				points: [],
			},
			{
				id: "c-2",
				type: "connector",
				source: { owner: { id: "sd-1" }, anchor: { kind: "center" } },
				target: { owner: { id: "ll-1" }, anchor: { kind: "center" } },
				points: [],
			},
		],
	},
	accepts: [
		{
			name: "accepts a label and its typography on the marker shapes (cross / extract), like any other box shape",
			doc: markerDoc({ text: "join", fontSize: 12, textAlign: "center" }),
		},
		{
			name: "still parses the marker shapes with no text at all, staying bare markers",
			doc: markerDoc({}),
		},
	],
});
