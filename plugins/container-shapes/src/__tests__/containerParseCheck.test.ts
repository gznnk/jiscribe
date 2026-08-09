import type { ParseCheckDoc } from "@jiscribe/canvas-sdk/testing";
import { createParseCheckSuite } from "@jiscribe/canvas-sdk/testing";

import { containerDocPlugin } from "../doc";

const makeDoc = (headerFields: Record<string, unknown>): ParseCheckDoc => ({
	version: 1,
	root: [
		{
			id: "module-1",
			type: "container",
			x: 0,
			y: 0,
			width: 240,
			height: 160,
			fill: "transparent",
			stroke: "auto",
			text: "Auth module",
			...headerFields,
		},
		{
			id: "task-1",
			type: "rect",
			x: 20,
			y: 60,
			width: 140,
			height: 80,
			text: "Order service",
		},
		{
			id: "c-1",
			type: "connector",
			source: { owner: { id: "module-1" }, anchor: { kind: "center" } },
			target: { owner: { id: "task-1" }, anchor: { kind: "center" } },
			points: [],
		},
	],
});

// Parse through a plugin-aware parser so this package's shape is known to
// parse-time structure/semantic validation (it does not live in the core
// built-in definitions). The headless `containerDocPlugin` carries no React deps.
createParseCheckSuite({
	name: "container shape",
	plugin: containerDocPlugin,
	sampleDoc: makeDoc({ headerFill: "#3b82f6", headerHeight: 32 }),
	accepts: [
		{
			name: "parses with both header fields omitted (they are optional)",
			doc: makeDoc({}),
		},
	],
	rejects: [
		{
			// The container-specific validator runs at parse time, not only in unit tests.
			name: "diagnoses a header height below the allowed minimum",
			doc: makeDoc({ headerHeight: 0 }),
			diagnosticPaths: ["root[0].headerHeight"],
		},
		{
			name: "diagnoses an unsafe headerFill value",
			doc: makeDoc({ headerFill: "url(evil)" }),
			diagnosticPaths: ["root[0].headerFill"],
		},
	],
});
