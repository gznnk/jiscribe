import type { ParseCheckDoc } from "@workspace/canvas-sdk/testing";
import { createParseCheckSuite } from "@workspace/canvas-sdk/testing";

import { umlDocPlugin } from "../doc";

const makeDoc = (text: unknown): ParseCheckDoc => ({
	version: 1,
	root: [
		{
			id: "r-1",
			type: "record",
			x: 0,
			y: 0,
			width: 180,
			height: 100,
			text,
		},
		{
			id: "r-2",
			type: "record",
			x: 300,
			y: 0,
			width: 180,
			height: 100,
			text: { name: { text: "Order" }, attributes: { text: ["id: string"] } },
		},
		{
			id: "c-1",
			type: "connector",
			source: { owner: { id: "r-1" }, anchor: { kind: "center" } },
			target: { owner: { id: "r-2" }, anchor: { kind: "center" } },
			points: [],
		},
	],
});

// Parse through a plugin-aware parser so the record shape is known to parse-time
// structure/semantic validation. The headless `umlDocPlugin` carries no React deps.
createParseCheckSuite({
	name: "record shape",
	plugin: umlDocPlugin,
	// The keyed text form, which is the only one a record takes.
	sampleDoc: makeDoc({
		name: { text: "User" },
		attributes: { text: ["id: string", "name"] },
		operations: { text: ["save()"] },
	}),
	rejects: [
		{
			name: "diagnoses the single-body form, which a record does not take",
			doc: makeDoc("User"),
			diagnosticPaths: ["root[0].text"],
		},
	],
});
